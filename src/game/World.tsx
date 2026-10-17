import { Instance, Instances } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody, BallCollider } from '@react-three/rapier'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { RING_COUNT, useGame } from './store'

const ROAD_WIDTH = 24
const ROAD_LENGTH = 900
const ROAD_Z = ROAD_LENGTH / 2 - 40

// Ring centers. Some need a hop, one needs a hop plus hover.
const RINGS: [number, number, number][] = [
  [0, 1.6, 80],
  [-6, 1.6, 150],
  [0, 3.8, 230], // over the wall
  [0, 6.5, 330], // off the ramp
  [0, 4.5, 455], // over the gap between the mesas
  [7, 1.6, 560],
  [-7, 1.6, 620],
  [0, 5, 700], // hop and hover
]
if (RINGS.length !== RING_COUNT) throw new Error('RING_COUNT does not match RINGS')

function Block({ position, size, color = '#c9b79c', rotation }: {
  position: [number, number, number]
  size: [number, number, number]
  color?: string
  rotation?: [number, number, number]
}) {
  return (
    <RigidBody type="fixed" position={position} rotation={rotation} colliders="cuboid" friction={0}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
    </RigidBody>
  )
}

function Ramp({ z, height, length }: { z: number; height: number; length: number }) {
  const angle = Math.atan2(height, length)
  const slope = Math.hypot(height, length)
  return (
    <Block
      position={[0, height / 2 - Math.cos(angle) * 0.5, z]}
      size={[10, 1, slope]}
      rotation={[-angle, 0, 0]}
      color="#e0e3e8"
    />
  )
}

function Ring({ index, position }: { index: number; position: [number, number, number] }) {
  const mesh = useRef<THREE.Mesh>(null)
  const collected = useGame((s) => s.collected[index])
  const collectRing = useGame((s) => s.collectRing)
  useFrame((_, dt) => {
    if (mesh.current) mesh.current.rotation.z += dt * (collected ? 0 : 0.8)
  })
  return (
    <group position={position}>
      <mesh ref={mesh} visible={!collected}>
        <torusGeometry args={[2.4, 0.18, 12, 48]} />
        <meshBasicMaterial color={[0.4, 2.2, 3]} toneMapped={false} />
      </mesh>
      <RigidBody type="fixed" colliders={false}>
        <BallCollider args={[2.4]} sensor onIntersectionEnter={() => collectRing(index)} />
      </RigidBody>
    </group>
  )
}

function Cones() {
  const positions = useMemo(() => {
    const list: [number, number, number][] = []
    for (let z = 20; z < ROAD_LENGTH - 60; z += 25) {
      list.push([ROAD_WIDTH / 2 + 1, 0.4, z], [-ROAD_WIDTH / 2 - 1, 0.4, z])
    }
    return list
  }, [])
  return (
    <>
      {positions.map((p) => (
        <RigidBody key={p.join()} position={p} colliders="hull" mass={2}>
          <mesh castShadow>
            <coneGeometry args={[0.3, 0.8, 12]} />
            <meshStandardMaterial color="#ff6a13" roughness={0.6} />
          </mesh>
        </RigidBody>
      ))}
    </>
  )
}

// Seeded random so the scenery is the same each load.
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function Scrub() {
  const items = useMemo(() => {
    const rand = mulberry32(2026)
    return Array.from({ length: 900 }, () => {
      const side = rand() < 0.5 ? -1 : 1
      const x = side * (ROAD_WIDTH / 2 + 8 + rand() * 400)
      const z = -300 + rand() * 1500
      const s = 0.4 + rand() * 1.6
      return { position: [x, s * 0.3, z] as [number, number, number], scale: s, rot: rand() * Math.PI }
    })
  }, [])
  return (
    <Instances limit={items.length} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#7d8a52" roughness={1} flatShading />
      {items.map((it, i) => (
        <Instance key={i} position={it.position} scale={[it.scale, it.scale * 0.6, it.scale]} rotation={[0, it.rot, 0]} />
      ))}
    </Instances>
  )
}

function RoadMarkings() {
  const dashes = useMemo(() => {
    const list: number[] = []
    for (let z = -30; z < ROAD_LENGTH - 50; z += 12) list.push(z)
    return list
  }, [])
  return (
    <>
      <Instances limit={dashes.length}>
        <planeGeometry args={[0.35, 5]} />
        <meshStandardMaterial color="#f2f2f2" />
        {dashes.map((z) => (
          <Instance key={z} position={[0, 0.012, z]} rotation={[-Math.PI / 2, 0, 0]} />
        ))}
      </Instances>
      {/* Start line */}
      <mesh position={[0, 0.013, 3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROAD_WIDTH, 0.8]} />
        <meshStandardMaterial color="#f2f2f2" />
      </mesh>
    </>
  )
}

export function World() {
  return (
    <>
      {/* Ground */}
      <RigidBody type="fixed" colliders={false} friction={0}>
        <CuboidCollider args={[2000, 1, 2000]} position={[0, -1, 0]} />
      </RigidBody>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4000, 4000]} />
        <meshStandardMaterial color="#b49a6c" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, ROAD_Z]} receiveShadow>
        <planeGeometry args={[ROAD_WIDTH, ROAD_LENGTH]} />
        <meshStandardMaterial color="#2c2f33" roughness={0.85} />
      </mesh>
      <RoadMarkings />

      {/* Wall to hop over */}
      <Block position={[0, 1.1, 230]} size={[ROAD_WIDTH, 2.2, 1.2]} color="#e6e6e6" />
      {/* Launch ramp */}
      <Ramp z={290} height={4} length={22} />
      {/* Two mesas with a gap */}
      <Block position={[0, 1.25, 420]} size={[ROAD_WIDTH, 2.5, 40]} />
      <Block position={[0, 1.25, 490]} size={[ROAD_WIDTH, 2.5, 40]} />
      <Ramp z={393} height={2.5} length={14} />
      {/* Low barriers before the last ring */}
      <Block position={[-6, 0.6, 670]} size={[10, 1.2, 1]} color="#d33" />
      <Block position={[6, 0.6, 670]} size={[10, 1.2, 1]} color="#d33" />

      {RINGS.map((p, i) => (
        <Ring key={i} index={i} position={p} />
      ))}
      <Cones />
      <Scrub />
    </>
  )
}
