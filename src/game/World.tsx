import { Instance, Instances } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { CuboidCollider, RigidBody, BallCollider } from '@react-three/rapier'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { BLOCKS, RAMPS, RINGS, ROAD_LENGTH, ROAD_START, ROAD_WIDTH } from './course'
import { createRoadTexture, DASH_PERIOD } from './roadTexture'
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

const RAMP_WIDTH = 10

// A wedge that rises from the ground at the near end to `height` at the far end.
// It sits exactly on the ground, so nothing hides below the ground plane.
function Ramp({ z, height, length }: { z: number; height: number; length: number }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape([
      new THREE.Vector2(-length / 2, 0),
      new THREE.Vector2(length / 2, 0),
      new THREE.Vector2(length / 2, height),
    ])
    const geo = new THREE.ExtrudeGeometry(shape, { depth: RAMP_WIDTH, bevelEnabled: false })
    geo.translate(0, 0, -RAMP_WIDTH / 2)
    geo.rotateY(-Math.PI / 2) // shape x -> world z
    return geo
  }, [height, length])
  return (
    <RigidBody type="fixed" position={[0, 0, z]} colliders="hull" friction={0}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color="#e0e3e8" roughness={0.9} />
      </mesh>
    </RigidBody>
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

// Flat layers (ground, road, start line) are stacked by draw order, not by tiny height gaps.
// Height gaps z-fight on GPUs with low depth precision, which makes the road blink.
const LAYER = { ground: -2, road: -1, startLine: 0 }

function Road() {
  const maxAnisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy())
  const map = useMemo(() => {
    const tex = createRoadTexture(ROAD_WIDTH, maxAnisotropy)
    tex.repeat.set(1, ROAD_LENGTH / DASH_PERIOD)
    return tex
  }, [maxAnisotropy])
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, ROAD_Z]} renderOrder={LAYER.road} receiveShadow>
        <planeGeometry args={[ROAD_WIDTH, ROAD_LENGTH]} />
        <meshStandardMaterial map={map} roughness={0.85} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 3]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={LAYER.startLine}>
        <planeGeometry args={[ROAD_WIDTH, 0.8]} />
        <meshStandardMaterial color="#cfcfcf" depthWrite={false} />
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={LAYER.ground} receiveShadow>
        <planeGeometry args={[12000, 12000]} />
        <meshStandardMaterial color="#b49a6c" roughness={1} depthWrite={false} />
      </mesh>
      <Road />

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
