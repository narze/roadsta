import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, type RefObject } from 'react'
import * as THREE from 'three'

// Live thruster levels (0-1), written by the car physics every frame.
export type ThrusterFx = { hover: number; boost: number }

// Side profile points: [z (forward), y (up)]
const BODY: [number, number][] = [
  [-2.1, -0.25], [-2.15, 0.18], [-1.95, 0.3], [-1.3, 0.34], [0.9, 0.3],
  [1.9, 0.1], [2.15, -0.08], [2.05, -0.25],
]
const CABIN: [number, number][] = [[-1.25, 0.33], [-0.55, 0.7], [0.15, 0.7], [0.95, 0.3]]

function profileGeometry(points: [number, number][], width: number, bevel: number) {
  const shape = new THREE.Shape(points.map(([z, y]) => new THREE.Vector2(z, y)))
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 4,
  })
  geo.translate(0, 0, -width / 2)
  geo.rotateY(-Math.PI / 2) // shape x -> world z
  geo.computeVertexNormals()
  return geo
}

const WHEELS: [number, number, number][] = [
  [0.86, -0.12, 1.35], [-0.86, -0.12, 1.35], [0.86, -0.12, -1.35], [-0.86, -0.12, -1.35],
]
const HOVER_NOZZLES: [number, number, number][] = [
  [0.6, -0.3, 1.5], [-0.6, -0.3, 1.5], [0.6, -0.3, -1.5], [-0.6, -0.3, -1.5],
]
const BOOST_NOZZLES: [number, number, number][] = [[0.35, 0.05, -2.2], [-0.35, 0.05, -2.2]]

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
        <meshBasicMaterial color={[2.2, 2.6, 4]} transparent opacity={0.75} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

export function CarModel({ fx }: { fx: RefObject<ThrusterFx> }) {
  const body = useMemo(() => profileGeometry(BODY, 1.7, 0.12), [])
  const cabin = useMemo(() => profileGeometry(CABIN, 1.3, 0.1), [])

  return (
    <group>
      <mesh geometry={body} castShadow receiveShadow>
        <meshPhysicalMaterial color="#b3111c" metalness={0.6} roughness={0.25} clearcoat={1} clearcoatRoughness={0.1} />
      </mesh>
      <mesh geometry={cabin} castShadow>
        <meshPhysicalMaterial color="#0c0f14" metalness={0.2} roughness={0.05} clearcoat={1} />
      </mesh>
      {/* Tail light bar and headlights */}
      <mesh position={[0, 0.16, -2.25]}>
        <boxGeometry args={[1.6, 0.05, 0.02]} />
        <meshBasicMaterial color={[4, 0.2, 0.2]} toneMapped={false} />
      </mesh>
      {[0.62, -0.62].map((x) => (
        <mesh key={x} position={[x, 0.02, 2.13]} rotation={[0, x > 0 ? 0.35 : -0.35, 0]}>
          <boxGeometry args={[0.38, 0.05, 0.02]} />
          <meshBasicMaterial color={[3, 3, 3]} toneMapped={false} />
        </mesh>
      ))}
      {WHEELS.map((p) => (
        <group key={p.join()} position={p}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.33, 0.33, 0.3, 24]} />
            <meshStandardMaterial color="#111" roughness={0.9} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]} position={[p[0] > 0 ? 0.151 : -0.151, 0, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.01, 24]} />
            <meshStandardMaterial color="#9aa3ad" metalness={0.9} roughness={0.3} />
          </mesh>
        </group>
      ))}
      {/* SpaceX cold-gas thruster nozzles */}
      {[...HOVER_NOZZLES, ...BOOST_NOZZLES].map((p) => (
        <mesh key={p.join()} position={p} rotation={p[2] < -2 ? [Math.PI / 2, 0, 0] : [0, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.13, 0.12, 12]} />
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
