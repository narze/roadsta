import { useKeyboardControls } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { RigidBody, RoundCuboidCollider, useRapier, type RapierRigidBody } from '@react-three/rapier'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { CarModel, type ThrusterFx } from './CarModel'
import { Control } from './controls'
import { initialLaunchTimer, updateLaunchTimer } from './launchTimer'
import { useGame } from './store'
import { initialThrusters, THRUSTER, tryHop, updateThrusters } from './thrusters'

const START: [number, number, number] = [0, 0.5, 0]
const HALF_HEIGHT = 0.45 // collider half height + rounding
const MPS_TO_MPH = 2.23694

const DRIVE = {
  accel: 16, // m/s^2 at rest, about 0-60 mph in 1.9 s
  topSpeed: 110, // m/s, about 250 mph
  boostAccel: 26, // extra m/s^2 from the rear thrusters, 0-60 under 1 s
  brake: 30,
  reverseAccel: 8,
  reverseMax: 12,
  rollDrag: 0.35,
  grip: 9,
  steer: 2.3,
  airSteer: 0.9,
  hoverLift: 0.6, // target vertical speed while hovering
}

const forward = new THREE.Vector3()
const right = new THREE.Vector3()
const quat = new THREE.Quaternion()
const euler = new THREE.Euler()

export function Car({ target }: { target: React.RefObject<THREE.Object3D | null> }) {
  const body = useRef<RapierRigidBody>(null)
  const visual = useRef<THREE.Group>(null)
  const fx = useRef<ThrusterFx>({ hover: 0, boost: 0 })
  const thrusters = useRef(initialThrusters())
  const jumpQueued = useRef(false)
  const resetHeld = useRef(false)
  const hudTimer = useRef(0)
  const launch = useRef(initialLaunchTimer())
  const { world, rapier } = useRapier()
  const [subscribeKeys, getKeys] = useKeyboardControls<keyof typeof Control>()

  useEffect(() => useGame.getState().setReady(), [])

  // Queue hops from key events, so a quick tap between two frames is not lost.
  useEffect(
    () => subscribeKeys((s) => s.jump, (pressed) => { if (pressed) jumpQueued.current = true }),
    [subscribeKeys],
  )
  const resetId = useGame((s) => s.resetId)

  useEffect(() => {
    const b = body.current
    if (!b || resetId === 0) return
    b.setTranslation({ x: START[0], y: START[1], z: START[2] }, true)
    b.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
    b.setLinvel({ x: 0, y: 0, z: 0 }, true)
    b.setAngvel({ x: 0, y: 0, z: 0 }, true)
    thrusters.current = initialThrusters()
  }, [resetId])

  useFrame((_, delta) => {
    const b = body.current
    if (!b) return
    const dt = Math.min(delta, 1 / 30)
    const keys = getKeys()
    const game = useGame.getState()
    const active = game.started

    if (keys.reset && !resetHeld.current) game.reset()
    resetHeld.current = keys.reset

    const pos = b.translation()
    if (pos.y < -30) game.reset()

    // Ground check: short ray down from the body center.
    const ray = new rapier.Ray(pos, { x: 0, y: -1, z: 0 })
    const hit = world.castRay(ray, HALF_HEIGHT + 0.2, true, rapier.QueryFilterFlags.EXCLUDE_SENSORS, undefined, undefined, b)
    const onGround = hit !== null

    const r = b.rotation()
    quat.set(r.x, r.y, r.z, r.w)
    euler.setFromQuaternion(quat, 'YXZ')
    forward.set(Math.sin(euler.y), 0, Math.cos(euler.y))
    right.set(-forward.z, 0, forward.x)

    const v = b.linvel()
    let fwd = v.x * forward.x + v.z * forward.z
    let lat = v.x * right.x + v.z * right.z
    let vy = v.y

    const throttle = active ? (keys.forward ? 1 : 0) - (keys.back ? 1 : 0) : 0
    const steer = active ? (keys.left ? 1 : 0) - (keys.right ? 1 : 0) : 0

    // Hop on the press edge; hover while Space stays held after the hop peaks.
    const jumpPressed = active && jumpQueued.current
    jumpQueued.current = false
    let airborne = !onGround
    if (jumpPressed) {
      const hop = tryHop(thrusters.current, onGround)
      thrusters.current = hop.state
      if (hop.hopped) {
        vy = Math.max(vy, 0) + THRUSTER.hopVelocity
        airborne = true
      }
    }
    const t = updateThrusters(
      thrusters.current,
      { hover: active && keys.jump && airborne && vy < 1, boost: active && keys.boost, onGround: !airborne },
      dt,
    )
    thrusters.current = t.state

    if (onGround) {
      if (throttle > 0) fwd += DRIVE.accel * Math.max(0, 1 - fwd / DRIVE.topSpeed) * dt
      else if (throttle < 0) fwd = fwd > 0 ? Math.max(0, fwd - DRIVE.brake * dt) : Math.max(-DRIVE.reverseMax, fwd - DRIVE.reverseAccel * dt)
      else fwd *= 1 - DRIVE.rollDrag * dt
      lat *= Math.exp(-DRIVE.grip * dt)
    }
    if (t.boosting) fwd += DRIVE.boostAccel * dt
    if (t.hovering) vy = THREE.MathUtils.damp(vy, DRIVE.hoverLift, 5, dt)

    const turn = onGround
      ? steer * DRIVE.steer * THREE.MathUtils.clamp(fwd / 6, -1, 1) / (1 + Math.abs(fwd) / 45)
      : steer * DRIVE.airSteer

    b.setLinvel({ x: forward.x * fwd + right.x * lat, y: vy, z: forward.z * fwd + right.z * lat }, true)
    b.setAngvel({ x: 0, y: turn, z: 0 }, true)

    // Visual tilt: pitch with vertical speed in the air, roll into turns.
    const g = visual.current
    if (g) {
      const pitch = airborne ? THREE.MathUtils.clamp(-vy * 0.03, -0.25, 0.25) : 0
      g.rotation.x = THREE.MathUtils.damp(g.rotation.x, pitch, 6, dt)
      g.rotation.z = THREE.MathUtils.damp(g.rotation.z, -turn * Math.min(Math.abs(fwd) / 60, 1) * 0.06, 6, dt)
    }
    // A hop fires a short burst; hover and boost hold a steady flame.
    fx.current.hover = jumpPressed && airborne ? 1.6 : THREE.MathUtils.damp(fx.current.hover, t.hovering ? 1 : 0, 12, dt)
    fx.current.boost = THREE.MathUtils.damp(fx.current.boost, t.boosting ? 1 : 0, 12, dt)

    const mph = Math.abs(fwd) * MPS_TO_MPH
    const prevPhase = launch.current.phase
    launch.current = updateLaunchTimer(launch.current, mph, dt)

    // Throttle HUD updates to about 20 Hz.
    hudTimer.current += dt
    if (hudTimer.current > 0.05 || launch.current.phase !== prevPhase) {
      hudTimer.current = 0
      useGame.setState({
        mph,
        gas: t.state.gas,
        airborne,
        hovering: t.hovering,
        boosting: t.boosting,
        altitude: Math.max(0, pos.y - HALF_HEIGHT),
        launch: launch.current,
      })
    }

    target.current?.position.set(pos.x, pos.y, pos.z)
    target.current?.quaternion.copy(quat)
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
      <RoundCuboidCollider args={[0.75, 0.25, 1.95, 0.2]} friction={0} restitution={0} density={300} />
      <group ref={visual}>
        <CarModel fx={fx} />
      </group>
    </RigidBody>
  )
}
