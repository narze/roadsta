import { Instance, Instances } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody, BallCollider } from '@react-three/rapier'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { BLOCKS, RAMPS, RINGS, ROAD_LENGTH, ROAD_START, ROAD_WIDTH } from './course'
import { useGame } from './store'

const ROAD_Z = ROAD_START + ROAD_LENGTH / 2
const ROAD_END = ROAD_START + ROAD_LENGTH

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
    for (let z = 20; z < ROAD_END - 60; z += 40) {
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
    return Array.from({ length: 3500 }, () => {
      const side = rand() < 0.5 ? -1 : 1
      const x = side * (ROAD_WIDTH / 2 + 8 + rand() * 400)
      const z = ROAD_START - 300 + rand() * (ROAD_LENGTH + 600)
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
    for (let z = ROAD_START + 10; z < ROAD_END - 10; z += 12) list.push(z)
    return list
  }, [])
  return (
    <>
      <Instances limit={dashes.length}>
        <planeGeometry args={[0.35, 5]} />
        <meshStandardMaterial color="#cfcfcf" polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-8} />
        {dashes.map((z) => (
          <Instance key={z} position={[0, 0.012, z]} rotation={[-Math.PI / 2, 0, 0]} />
        ))}
      </Instances>
      {/* Start line */}
      <mesh position={[0, 0.013, 3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROAD_WIDTH, 0.8]} />
        <meshStandardMaterial color="#cfcfcf" polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-8} />
      </mesh>
    </>
  )
}

export function World() {
  return (
    <>
      {/* Ground */}
      <RigidBody type="fixed" colliders={false} friction={0}>
        <CuboidCollider args={[6000, 1, 6000]} position={[0, -1, 0]} />
      </RigidBody>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12000, 12000]} />
        <meshStandardMaterial color="#b49a6c" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, ROAD_Z]} receiveShadow>
        <planeGeometry args={[ROAD_WIDTH, ROAD_LENGTH]} />
        <meshStandardMaterial color="#2c2f33" roughness={0.85} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-4} />
      </mesh>
      <RoadMarkings />

      {BLOCKS.map((b, i) => (
        <Block key={i} position={b.position} size={b.size} color={b.color} />
      ))}
      {RAMPS.map((r, i) => (
        <Ramp key={i} z={r.z} height={r.height} length={r.length} />
      ))}

      {RINGS.map((p, i) => (
        <Ring key={i} index={i} position={p} />
      ))}
      <Cones />
      <Scrub />
    </>
  )
}
