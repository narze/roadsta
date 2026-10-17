import { Environment, Lightformer, Sky } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useRef } from 'react'
import * as THREE from 'three'
import { Car } from './Car'
import { World } from './World'

const SUN = new THREE.Vector3(-60, 80, -40)
const camOffset = new THREE.Vector3()
const lookAt = new THREE.Vector3()
const smoothLook = new THREE.Vector3(0, 1, 10)

// Chase camera and a sun light that follows the car, so shadows stay sharp.
function Follow({ target }: { target: React.RefObject<THREE.Object3D | null> }) {
  const light = useRef<THREE.DirectionalLight>(null)
  useFrame(({ camera }, delta) => {
    const t = target.current
    if (!t) return
    const dt = Math.min(delta, 1 / 30)
    camOffset.set(0, 2.6, -8).applyQuaternion(t.quaternion).add(t.position)
    camera.position.x = THREE.MathUtils.damp(camera.position.x, camOffset.x, 6, dt)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, camOffset.z, 6, dt)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, Math.max(camOffset.y, 1), 4, dt)
    lookAt.set(0, 1, 6).applyQuaternion(t.quaternion).add(t.position)
    smoothLook.lerp(lookAt, 1 - Math.exp(-10 * dt))
    camera.lookAt(smoothLook)
    if (light.current) {
      light.current.position.copy(t.position).add(SUN)
      light.current.target.position.copy(t.position)
      light.current.target.updateMatrixWorld()
    }
  })
  return (
    <directionalLight
      ref={light}
      intensity={2.6}
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-40}
      shadow-camera-right={40}
      shadow-camera-top={40}
      shadow-camera-bottom={-40}
      shadow-camera-far={300}
      shadow-bias={-0.0004}
    />
  )
}

export function Scene() {
  const target = useRef<THREE.Object3D>(new THREE.Object3D())
  return (
    <>
      <color attach="background" args={['#cfe3f2']} />
      <fog attach="fog" args={['#d9e4ea', 120, 700]} />
      <Sky sunPosition={SUN.toArray()} turbidity={6} rayleigh={1.2} />
      <hemisphereLight args={['#dfefff', '#a08660', 0.9]} />
      {/* Local studio light for car paint reflections - no network fetch. */}
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={3} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[20, 6, 1]} />
        <Lightformer form="rect" intensity={1.5} position={[-8, 2, 0]} rotation-y={Math.PI / 2} scale={[20, 2, 1]} />
        <Lightformer form="rect" intensity={1.5} position={[8, 2, 0]} rotation-y={-Math.PI / 2} scale={[20, 2, 1]} />
        <Lightformer form="ring" color="#ffd7a0" intensity={4} position={[-6, 6, -6]} scale={3} />
      </Environment>
      <Follow target={target} />
      <Physics gravity={[0, -18, 0]} timeStep="vary">
        <World />
        <Car target={target} />
      </Physics>
      <EffectComposer multisampling={4}>
        <Bloom luminanceThreshold={1} mipmapBlur intensity={0.9} />
        <Vignette offset={0.25} darkness={0.55} />
      </EffectComposer>
    </>
  )
}
