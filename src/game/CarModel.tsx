import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'

// Live thruster levels (0-1), written by the car physics every frame.
export type ThrusterFx = { hover: number; boost: number }

type P = [number, number] // side profile point: [z (forward), y (up)]

const BOTTOM = -0.27
const WHEEL_R = 0.36
const WHEEL_Y = -0.09
const ARCH_R = 0.42
const FRONT_AXLE = 1.42
const REAR_AXLE = -1.38
const TRACK = 0.84 // wheel center distance from the middle

// Low center tub: long falling hood that ends in a sharp wedge nose.
const TUB_TOP: P[] = [
  [-2.3, -0.12], [-2.33, 0.24], [-2.1, 0.36], [-1.4, 0.4], [0.6, 0.37], [1.5, 0.24], [2.25, 0.0], [2.38, -0.1],
]
// Side shells: fender line rises over each wheel, higher than the hood.
const SHELL_TOP: P[] = [
  [-2.3, -0.12], [-2.33, 0.24], [-2.1, 0.38], [-1.38, 0.44], [-0.6, 0.41], [0.6, 0.38], [1.42, 0.4], [2.0, 0.2], [2.38, -0.1],
]
const NOSE_BOTTOM: P[] = [[2.25, -0.22], [1.95, BOTTOM]]
const TAIL_BOTTOM: P[] = [[-1.95, BOTTOM], [-2.25, -0.24]]
const CANOPY: P[] = [[-1.7, 0.38], [-1.0, 0.66], [-0.35, 0.8], [0.15, 0.79], [0.55, 0.6], [0.85, 0.36]]

// Points over a wheel arch, front to rear, where the arch meets the bottom line.
function arch(zc: number): P[] {
  const start = Math.atan2(BOTTOM - WHEEL_Y, Math.sqrt(ARCH_R ** 2 - (BOTTOM - WHEEL_Y) ** 2))
  const pts: P[] = []
  for (let i = 0; i <= 16; i++) {
    const a = start + (i / 16) * (Math.PI - 2 * start)
    pts.push([zc + ARCH_R * Math.cos(a), WHEEL_Y + ARCH_R * Math.sin(a)])
  }
  return pts
}

// Narrow the top of a shape, so the canopy reads as a rounded glass bubble.
function taper(geo: THREE.BufferGeometry, fromY: number, toY: number, topScale: number) {
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.clamp((pos.getY(i) - fromY) / (toY - fromY), 0, 1)
    pos.setX(i, pos.getX(i) * THREE.MathUtils.lerp(1, topScale, t))
  }
  geo.computeVertexNormals()
  return geo
}

function profileGeometry(points: P[], width: number, bevel: number) {
  const shape = new THREE.Shape(points.map(([z, y]) => new THREE.Vector2(z, y)))
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 3,
    curveSegments: 4,
  })
  geo.translate(0, 0, -width / 2)
  geo.rotateY(-Math.PI / 2) // shape x -> world z
  geo.computeVertexNormals()
  return geo
}

const WHEELS: [number, number, number][] = [
  [TRACK, WHEEL_Y, FRONT_AXLE], [-TRACK, WHEEL_Y, FRONT_AXLE], [TRACK, WHEEL_Y, REAR_AXLE], [-TRACK, WHEEL_Y, REAR_AXLE],
]
const HOVER_NOZZLES: [number, number, number][] = [
  [0.45, -0.3, 1.75], [-0.45, -0.3, 1.75], [0.45, -0.3, -1.8], [-0.45, -0.3, -1.8],
]
const BOOST_NOZZLES: [number, number, number][] = [[0.32, -0.13, -2.43], [-0.32, -0.13, -2.43]]

function Flame({ position, dir, fx, kind }: {
  position: [number, number, number]
  dir: 'down' | 'back'
  fx: RefObject<ThrusterFx>
  kind: keyof ThrusterFx
}) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const m = ref.current
    if (!m) return
    const level = fx.current[kind]
    const flicker = 0.85 + Math.sin(clock.elapsedTime * 60 + position[0] * 9) * 0.15
    m.visible = level > 0.02
    m.scale.set(level, level * flicker, level)
  })
  // Base sits on the nozzle, tip points along -y. Rotate -y to -z for rear flames.
  const geometry = useMemo(() => new THREE.ConeGeometry(0.16, 1.4, 12, 1, true).rotateX(Math.PI).translate(0, -0.7, 0), [])
  const rotation: [number, number, number] = dir === 'down' ? [0, 0, 0] : [Math.PI / 2, 0, 0]
  return (
    <group position={position} rotation={rotation}>
      <mesh ref={ref} geometry={geometry} visible={false}>
        <meshBasicMaterial color={[0.5, 1.3, 4]} transparent opacity={0.75} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

// Large dark wheel with a six-spoke turbine rim.
function Wheel({ position }: { position: [number, number, number] }) {
  const side = Math.sign(position[0])
  return (
    <group position={position}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[WHEEL_R, WHEEL_R, 0.3, 32]} />
        <meshStandardMaterial color="#111214" roughness={0.85} />
      </mesh>
      <group position={[side * 0.152, 0, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.27, 0.27, 0.01, 32]} />
          <meshStandardMaterial color="#8e949c" metalness={0.9} roughness={0.3} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[(i * Math.PI) / 3, 0, 0]} position={[side * 0.008, 0, 0]}>
            <boxGeometry args={[0.012, 0.52, 0.06]} />
            <meshStandardMaterial color="#16181b" metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
        <mesh rotation={[0, Math.PI / 2, 0]} position={[side * 0.006, 0, 0]}>
          <torusGeometry args={[0.27, 0.014, 8, 32]} />
          <meshStandardMaterial color="#c9ced4" metalness={1} roughness={0.2} />
        </mesh>
      </group>
    </group>
  )
}

export function CarModel({ fx }: { fx: RefObject<ThrusterFx> }) {
  const tub = useMemo(() => profileGeometry([...TUB_TOP, ...NOSE_BOTTOM, ...TAIL_BOTTOM], 1.2, 0.06), [])
  const shell = useMemo(
    () => profileGeometry([...SHELL_TOP, ...NOSE_BOTTOM, ...arch(FRONT_AXLE), ...arch(REAR_AXLE), ...TAIL_BOTTOM], 0.26, 0.04),
    [],
  )
  const canopy = useMemo(() => taper(profileGeometry(CANOPY, 1.3, 0.1), 0.38, 0.85, 0.55), [])

  return (
    <group>
      <mesh geometry={tub} castShadow receiveShadow>
        <meshPhysicalMaterial color="#e4e6ea" metalness={0.55} roughness={0.3} clearcoat={1} clearcoatRoughness={0.1} />
      </mesh>
      {[0.85, -0.85].map((x) => (
        <mesh key={x} geometry={shell} position={[x, 0, 0]} castShadow receiveShadow>
          <meshPhysicalMaterial color="#e4e6ea" metalness={0.55} roughness={0.3} clearcoat={1} clearcoatRoughness={0.1} />
        </mesh>
      ))}
      <mesh geometry={canopy} castShadow>
        <meshPhysicalMaterial color="#14161b" metalness={0.3} roughness={0.05} clearcoat={1} />
      </mesh>
      {/* Dark side sills between the wheels */}
      {[1.03, -1.03].map((x) => (
        <mesh key={x} position={[x, -0.2, 0.02]}>
          <boxGeometry args={[0.03, 0.12, 1.95]} />
          <meshStandardMaterial color="#121316" metalness={0.4} roughness={0.35} />
        </mesh>
      ))}
      {/* One full-width tail panel over the tub and shells, with a dark diffuser below */}
      <mesh position={[0, 0.08, -2.37]} castShadow>
        <boxGeometry args={[2.02, 0.34, 0.06]} />
        <meshPhysicalMaterial color="#e4e6ea" metalness={0.55} roughness={0.3} clearcoat={1} clearcoatRoughness={0.1} />
      </mesh>
      <mesh position={[0, -0.16, -2.36]}>
        <boxGeometry args={[1.94, 0.16, 0.08]} />
        <meshStandardMaterial color="#121316" metalness={0.4} roughness={0.35} />
      </mesh>
      {/* Rear wing on two struts */}
      {[0.55, -0.55].map((x) => (
        <mesh key={x} position={[x, 0.56, -2.0]} rotation={[-0.25, 0, 0]}>
          <boxGeometry args={[0.04, 0.46, 0.18]} />
          <meshStandardMaterial color="#1b1d21" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 0.8, -2.08]} rotation={[0.12, 0, 0]} castShadow>
        <boxGeometry args={[2.0, 0.05, 0.5]} />
        <meshPhysicalMaterial color="#e4e6ea" metalness={0.55} roughness={0.3} clearcoat={1} />
      </mesh>
      {/* Thin front light bar along the nose, full-width tail light bar */}
      <mesh position={[0, -0.075, 2.43]}>
        <boxGeometry args={[1.85, 0.022, 0.02]} />
        <meshBasicMaterial color={[3, 3, 3]} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.19, -2.405]}>
        <boxGeometry args={[1.95, 0.035, 0.02]} />
        <meshBasicMaterial color={[4, 0.2, 0.2]} toneMapped={false} />
      </mesh>
      {WHEELS.map((p) => (
        <Wheel key={p.join()} position={p} />
      ))}
      {/* Cold-gas thruster nozzles */}
      {[...HOVER_NOZZLES, ...BOOST_NOZZLES].map((p) => (
        <mesh key={p.join()} position={p} rotation={p[2] < -2.2 ? [Math.PI / 2, 0, 0] : [0, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.09, 0.1, 12]} />
          <meshStandardMaterial color="#555b63" metalness={1} roughness={0.35} />
        </mesh>
      ))}
      {HOVER_NOZZLES.map((p) => (
        <Flame key={p.join()} position={[p[0], p[1] - 0.06, p[2]]} dir="down" fx={fx} kind="hover" />
      ))}
      {BOOST_NOZZLES.map((p) => (
        <Flame key={p.join()} position={[p[0], p[1], p[2] - 0.06]} dir="back" fx={fx} kind="boost" />
      ))}
    </group>
  )
}
