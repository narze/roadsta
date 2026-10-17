import { KeyboardControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { keyMap } from './game/controls'
import { Hud } from './game/Hud'
import { Scene } from './game/Scene'

export default function App() {
  return (
    <KeyboardControls map={keyMap}>
      <Canvas shadows="percentage" camera={{ fov: 60, near: 0.1, far: 2000, position: [0, 3, -8] }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
      <Hud />
    </KeyboardControls>
  )
}
