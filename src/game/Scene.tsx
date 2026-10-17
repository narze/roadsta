import { Environment, Lightformer } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Car } from './Car'
import { GRAVITY } from './physics'
import { World } from './World'

const SUN = new THREE.Vector3(-60, 80, -40)
const camOffset = new THREE.Vector3()
const lookAt = new THREE.Vector3()
const smoothLook = new THREE.Vector3(0, 1, 10)

// Simple gradient sky dome. Colors stay below 1, so bloom ignores it.
function SkyDome() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          top: { value: new THREE.Color('#3f7fc4') },
          horizon: { value: new THREE.Color('#cfe0ec') },
        },
        vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform vec3 top; uniform vec3 horizon; varying vec3 vDir;
          void main() { float h = clamp(vDir.y, 0.0, 1.0); gl_FragColor = vec4(mix(horizon, top, pow(h, 0.6)), 1.0); }`,
      }),
    [],
  )
  return (
    <mesh material={material} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[1500, 32, 16]} />
    </mesh>
  )
}

// Chase camera and a sun light that follows the car, so shadows stay sharp.
function Follow({ target }: { target: React.RefObject<THREE.Object3D | null> }) {
  const light = useRef<THREE.DirectionalLight>(null)
  useFrame(({ camera }, delta) => {
    const t = target.current
    if (!t) return
    const dt = Math.min(delta, 0.1)
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
      intensity={2.2}
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
      <color attach="background" args={['#cfe0ec']} />
      <fog attach="fog" args={['#cfe0ec', 150, 900]} />
      <SkyDome />
      <hemisphereLight args={['#dfefff', '#a08660', 0.5]} />
      {/* Local studio light for car paint reflections - no network fetch. */}
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={1.2} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[20, 6, 1]} />
        <Lightformer form="rect" intensity={0.6} position={[-8, 2, 0]} rotation-y={Math.PI / 2} scale={[20, 2, 1]} />
        <Lightformer form="rect" intensity={0.6} position={[8, 2, 0]} rotation-y={-Math.PI / 2} scale={[20, 2, 1]} />
        <Lightformer form="ring" color="#ffd7a0" intensity={2} position={[-6, 6, -6]} scale={3} />
      </Environment>
      <Follow target={target} />
      <Physics gravity={[0, -GRAVITY, 0]} interpolate>
        <World />
        <Car target={target} />
      </Physics>
      <EffectComposer multisampling={4}>
        <Bloom luminanceThreshold={1.2} mipmapBlur intensity={0.9} />
        <Vignette offset={0.25} darkness={0.55} />
      </EffectComposer>
    </>
  )
}
