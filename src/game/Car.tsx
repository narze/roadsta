import { useKeyboardControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { RigidBody, RoundCuboidCollider, useBeforePhysicsStep, useRapier, type RapierRigidBody } from '@react-three/rapier'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { sound } from '../audio/sound'
import { CarModel, type ThrusterFx } from './CarModel'
import { CAR_WIDTH } from './course'
import { Control } from './controls'
import { initialLaunchTimer, updateLaunchTimer } from './launchTimer'
import { useGame } from './store'
import { GRAVITY } from './physics'
import { airTurnDelta, inputAngle } from './airTurn'
import { boostAcceleration, initialThrusters, rewardTrick, THRUSTER, tryAirTurn, tryHop, updateThrusters } from './thrusters'
import { useTouchInput } from './touchInput'
import { initialTricks, land, startTrick, TRICK_NAMES, trickRotation, updateTricks, type TrickKind } from './tricks'

const START: [number, number, number] = [0, 0.5, 0]
const HALF_HEIGHT = 0.45 // collider half height + rounding
const MPS_TO_MPH = 2.23694
const HOP_GRACE = 0.15 // seconds

const DRIVE = {
  accel: 16, // m/s^2 at rest, about 0-60 mph in 1.9 s
  topSpeed: 110, // m/s, about 250 mph
  brake: 30,
  reverseAccel: 8,
  reverseMax: 12,
  rollDrag: 0.35,
  grip: 9,
  steer: 2.3,
  airSteer: 0.9,
  hoverLift: 0.6, // target vertical speed while hovering
}

const UP = new THREE.Vector3(0, 1, 0)
const cameraDir = new THREE.Vector3()
const forward = new THREE.Vector3()
const right = new THREE.Vector3()
const quat = new THREE.Quaternion()
const euler = new THREE.Euler()

// Yaw in radians from a rotation quaternion (the body only rotates around Y).
const headingQuat = new THREE.Quaternion()
const headingEuler = new THREE.Euler()
function headingOf(r: { x: number; y: number; z: number; w: number }) {
  return headingEuler.setFromQuaternion(headingQuat.set(r.x, r.y, r.z, r.w), 'YXZ').y
}

export function Car({ target }: { target: React.RefObject<THREE.Object3D | null> }) {
  const body = useRef<RapierRigidBody>(null)
  const visual = useRef<THREE.Group>(null)
  const trickGroup = useRef<THREE.Group>(null)
  const tricks = useRef(initialTricks())
  const trickQueued = useRef<TrickKind | null>(null)
  const wasAirborne = useRef(false)
  const hopGrace = useRef(0)
  const fx = useRef<ThrusterFx>({ hover: 0, boost: 0 })
  const thrusters = useRef(initialThrusters())
  const jumpQueued = useRef(false)
  const boostQueued = useRef(false)
  // Direction saved from an arrow pressed while Shift is held, so a quick tap still turns.
  const turnRequest = useRef<{ throttle: number; steer: number } | null>(null)
  const resetHeld = useRef(false)
  const hudTimer = useRef(0)
  const launch = useRef(initialLaunchTimer())
  const sim = useRef({ fwd: 0, vy: 0, turn: 0, mph: 0, airborne: false, hovering: false, boosting: false, hopBurst: false, turnBurst: false })
  const { world, rapier } = useRapier()
  const camera = useThree((s) => s.camera)
  const [subscribeKeys, getKeys] = useKeyboardControls<keyof typeof Control>()

  useEffect(() => useGame.getState().setReady(), [])

  // Queue hops from key events, so a quick tap between two frames is not lost.
  useEffect(() => {
    const queue = (pressed: boolean) => { if (pressed) jumpQueued.current = true }
    const offKeys = subscribeKeys((s) => s.jump, queue)
    const offTouch = useTouchInput.subscribe((s, prev) => { if (s.jump !== prev.jump) queue(s.jump) })
    // Boost presses are queued too: in the air, a press can trigger the air turn.
    const queueBoost = (pressed: boolean) => { if (pressed) boostQueued.current = true }
    const offBoostKeys = subscribeKeys((s) => s.boost, queueBoost)
    const offBoostTouch = useTouchInput.subscribe((s, prev) => { if (s.boost !== prev.boost) queueBoost(s.boost) })
    return () => { offKeys(); offTouch(); offBoostKeys(); offBoostTouch() }
  }, [subscribeKeys])

  // Tricks: hold Space in the air and tap an arrow, or flick on the Hop button.
  useEffect(() => {
    // Boost has priority: an arrow pressed while Shift is held asks for an air turn, not a trick.
    type Arrow = 'left' | 'right' | 'forward' | 'back'
    const onArrow = (kind: TrickKind, arrow: Arrow) => (pressed: boolean) => {
      if (!pressed) return
      const keys = { ...getKeys(), [arrow]: true }
      if (keys.boost) {
        turnRequest.current = {
          throttle: (keys.forward ? 1 : 0) - (keys.back ? 1 : 0),
          steer: (keys.left ? 1 : 0) - (keys.right ? 1 : 0),
        }
      } else if (keys.jump) trickQueued.current = kind
    }
    const offs = [
      subscribeKeys((s) => s.left, onArrow('kickflipLeft', 'left')),
      subscribeKeys((s) => s.right, onArrow('kickflipRight', 'right')),
      subscribeKeys((s) => s.forward, onArrow('frontFlip', 'forward')),
      subscribeKeys((s) => s.back, onArrow('backFlip', 'back')),
      useTouchInput.subscribe((s, prev) => { if (s.trick && s.trick !== prev.trick) trickQueued.current = s.trick.kind }),
    ]
    return () => offs.forEach((off) => off())
  }, [subscribeKeys, getKeys])
  const resetId = useGame((s) => s.resetId)

  useEffect(() => {
    const b = body.current
    if (!b || resetId === 0) return
    b.setTranslation({ x: START[0], y: START[1], z: START[2] }, true)
    b.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
    b.setLinvel({ x: 0, y: 0, z: 0 }, true)
    b.setAngvel({ x: 0, y: 0, z: 0 }, true)
    thrusters.current = initialThrusters()
    tricks.current = initialTricks()
  }, [resetId])

  // Driving runs once per physics step, so it behaves the same at any frame rate.
  useBeforePhysicsStep(() => {
    const b = body.current
    if (!b) return
    const dt = world.timestep
    const keys = getKeys()
    const touch = useTouchInput.getState()
    const game = useGame.getState()
    const active = game.started

    const pos = b.translation()
    // Ground check: short ray down from the body center.
    const ray = new rapier.Ray(pos, { x: 0, y: -1, z: 0 })
    const hit = world.castRay(ray, HALF_HEIGHT + 0.2, true, rapier.QueryFilterFlags.EXCLUDE_SENSORS, undefined, undefined, b)
    // Just after a hop the ray still reaches the ground. Ignore it briefly,
    // so the car does not count as landed while it lifts off.
    hopGrace.current = Math.max(0, hopGrace.current - dt)
    const onGround = hit !== null && hopGrace.current === 0

    const r = b.rotation()
    quat.set(r.x, r.y, r.z, r.w)
    euler.setFromQuaternion(quat, 'YXZ')
    forward.set(Math.sin(euler.y), 0, Math.cos(euler.y))
    right.set(-forward.z, 0, forward.x)

    const v = b.linvel()
    let fwd = v.x * forward.x + v.z * forward.z
    let lat = v.x * right.x + v.z * right.z
    let vy = v.y

    // Keyboard is digital; the touch joystick is analog. Use whichever is active.
    const keyThrottle = (keys.forward ? 1 : 0) - (keys.back ? 1 : 0)
    const keySteer = (keys.left ? 1 : 0) - (keys.right ? 1 : 0)
    const throttle = active ? keyThrottle || touch.throttle : 0
    const steer = active ? keySteer || touch.steer : 0
    const jumpHeld = keys.jump || touch.jump

    // Hop on the press edge; hover while Space stays held after the hop peaks.
    const jumpPressed = active && jumpQueued.current
    jumpQueued.current = false
    let airborne = !onGround
    let hopped = false
    if (jumpPressed) {
      const hop = tryHop(thrusters.current, onGround)
      thrusters.current = hop.state
      if (hop.hopped) {
        sound.play(hop.kind === 'air' ? 'doubleJump' : 'hop')
        // A ground hop adds to any upward speed (ramps); a double jump sets it, so it also stops a fall.
        vy = hop.kind === 'air' ? THRUSTER.hopVelocity : Math.max(vy, 0) + THRUSTER.hopVelocity
        airborne = hopped = true
        hopGrace.current = HOP_GRACE
      }
    }

    // Air turn: Boost pressed in the air with a direction held snaps the car to face that direction
    // as seen from the camera, at the exact pushed angle. Speed carries along the new heading.
    const boostPressed = active && boostQueued.current
    const request = active ? turnRequest.current : null
    boostQueued.current = false
    turnRequest.current = null
    let turned = false
    const keysHeld = keyThrottle !== 0 || keySteer !== 0
    const angle = !airborne ? null
      : request ? inputAngle(request.throttle, request.steer)
      : !boostPressed ? null
      : keysHeld ? inputAngle(keyThrottle, keySteer)
      : inputAngle(touch.stick.y, -touch.stick.x) // raw stick: exact angle, no per-axis dead zone
    camera.getWorldDirection(cameraDir)
    const delta = angle === null ? null : airTurnDelta(euler.y, Math.atan2(cameraDir.x, cameraDir.z), angle)
    if (delta !== null) {
      const airTurn = tryAirTurn(thrusters.current, airborne)
      thrusters.current = airTurn.state
      if (airTurn.turned) {
        const yaw = euler.y + delta
        forward.set(Math.sin(yaw), 0, Math.cos(yaw))
        right.set(-forward.z, 0, forward.x)
        b.setRotation(quat.setFromAxisAngle(UP, yaw), true)
        turned = true
        useGame.setState({ lastAirTurn: delta })
        sound.play('airTurn')
      }
    }

    const t = updateThrusters(
      thrusters.current,
      { hover: active && jumpHeld && airborne && vy < 1, boost: active && (keys.boost || touch.boost), onGround: !airborne },
      dt,
    )
    thrusters.current = t.state

    if (onGround) {
      if (throttle > 0) fwd += throttle * DRIVE.accel * Math.max(0, 1 - fwd / DRIVE.topSpeed) * dt
      else if (throttle < 0) fwd = fwd > 0 ? Math.max(0, fwd + throttle * DRIVE.brake * dt) : Math.max(-DRIVE.reverseMax, fwd + throttle * DRIVE.reverseAccel * dt)
      else fwd *= 1 - DRIVE.rollDrag * dt
      lat *= Math.exp(-DRIVE.grip * dt)
    }
    if (t.boosting) fwd += boostAcceleration(fwd) * dt
    // Hover cancels the gravity of this step, then eases toward a slow climb.
    if (t.hovering) vy = THREE.MathUtils.damp(vy, DRIVE.hoverLift, 5, dt) + GRAVITY * dt

    // Tricks spin the model only. Landing mid-spin is a crash and kills most of the speed.
    if (trickQueued.current) {
      const wasSpinning = tricks.current.active
      tricks.current = startTrick(tricks.current, trickQueued.current, airborne)
      if (!wasSpinning && tricks.current.active) sound.play('spin')
      trickQueued.current = null
    }
    // Each finished spin gives thruster gas back, so tricks can pay for more hover.
    const doneBefore = tricks.current.combo.length
    tricks.current = updateTricks(tricks.current, dt)
    if (tricks.current.combo.length > doneBefore) thrusters.current = rewardTrick(thrusters.current)
    if (wasAirborne.current && !airborne) {
      const almostDone = tricks.current.active !== null
      const landed = land(tricks.current)
      tricks.current = landed.state
      sound.play(landed.result?.kind === 'crash' ? 'crash' : 'land')
      if (landed.result?.kind === 'crash') {
        fwd *= 0.2
        lat *= 0.2
        game.showToast('Bad landing!', 'bad')
      } else if (landed.result) {
        // A spin that was nearly done on landing counts as finished, so it earns gas too.
        if (almostDone) thrusters.current = rewardTrick(thrusters.current)
        const { tricks: done, points } = landed.result
        const combo = done.length > 1 ? ` x${done.length} combo` : ''
        game.addScore(points)
        sound.play('trick')
        game.showToast(`${done.map((t) => TRICK_NAMES[t]).join(' + ')}${combo}  +${points}`, 'good')
      }
    }
    wasAirborne.current = airborne

    const turn = onGround
      ? steer * DRIVE.steer * THREE.MathUtils.clamp(fwd / 6, -1, 1) / (1 + Math.abs(fwd) / 45)
      : steer * DRIVE.airSteer

    b.setLinvel({ x: forward.x * fwd + right.x * lat, y: vy, z: forward.z * fwd + right.z * lat }, true)
    b.setAngvel({ x: 0, y: turn, z: 0 }, true)

    const mph = Math.abs(fwd) * MPS_TO_MPH
    launch.current = updateLaunchTimer(launch.current, mph, dt)
    Object.assign(sim.current, {
      fwd, vy, turn, mph, airborne,
      hovering: t.hovering,
      boosting: t.boosting,
      hopBurst: sim.current.hopBurst || hopped,
      turnBurst: sim.current.turnBurst || turned,
    })
  })

  // Visuals, camera target, and HUD follow the render frame.
  useFrame((_, delta) => {
    const b = body.current
    if (!b) return
    const dt = Math.min(delta, 0.1)
    const keys = getKeys()
    const game = useGame.getState()
    const s = sim.current

    if (keys.reset && !resetHeld.current) game.reset()
    resetHeld.current = keys.reset
    const pos = b.translation()
    if (pos.y < -30) game.reset()

    // Visual tilt: pitch with vertical speed in the air, roll into turns.
    const g = visual.current
    if (g) {
      const pitch = s.airborne ? THREE.MathUtils.clamp(-s.vy * 0.03, -0.25, 0.25) : 0
      g.rotation.x = THREE.MathUtils.damp(g.rotation.x, pitch, 6, dt)
      g.rotation.z = THREE.MathUtils.damp(g.rotation.z, -s.turn * Math.min(Math.abs(s.fwd) / 60, 1) * 0.06, 6, dt)
    }
    const spin = trickRotation(tricks.current)
    trickGroup.current?.rotation.set(spin.pitch, 0, spin.roll)

    // A hop fires a short burst; hover and boost hold a steady flame.
    fx.current.hover = s.hopBurst ? 1.6 : THREE.MathUtils.damp(fx.current.hover, s.hovering ? 1 : 0, 12, dt)
    fx.current.boost = s.turnBurst ? 1.6 : THREE.MathUtils.damp(fx.current.boost, s.boosting ? 1 : 0, 12, dt)
    s.hopBurst = false
    s.turnBurst = false

    // Throttle HUD updates to about 20 Hz.
    hudTimer.current += dt
    if (hudTimer.current > 0.05 || launch.current.phase !== game.launch.phase) {
      hudTimer.current = 0
      sound.update(s)
      useGame.setState({
        mph: s.mph,
        gas: thrusters.current.gas,
        airborne: s.airborne,
        hovering: s.hovering,
        boosting: s.boosting,
        altitude: Math.max(0, pos.y - HALF_HEIGHT),
        launch: launch.current,
        heading: headingOf(b.rotation()),
        trick: tricks.current.active,
      })
    }

    const r = b.rotation()
    target.current?.position.set(pos.x, pos.y, pos.z)
    target.current?.quaternion.set(r.x, r.y, r.z, r.w)
  })

  return (
    <RigidBody
      ref={body}
      position={START}
      colliders={false}
      enabledRotations={[false, true, false]}
      linearDamping={0}
      angularDamping={0}
      canSleep={false}
      ccd
    >
      <RoundCuboidCollider args={[CAR_WIDTH / 2 - 0.2, 0.25, 2.15, 0.2]} friction={0} restitution={0} density={300} />
      <group ref={visual}>
        <group ref={trickGroup}>
          <CarModel fx={fx} />
        </group>
      </group>
    </RigidBody>
  )
}
