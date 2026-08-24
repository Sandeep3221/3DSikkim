import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import World from './World'
import { QUALITY } from '../systems/performance/quality'

/**
 * Canvas host with adaptive DPR. The PerformanceMonitor steps quality down
 * once if sustained load is detected; nothing else re-renders per frame.
 */
export default function Experience() {
  const [dpr, setDpr] = useState(QUALITY.dpr)

  return (
    <Canvas
      dpr={dpr}
      shadows={QUALITY.shadows}
      gl={{
        antialias: QUALITY.antialias,
        powerPreference: 'high-performance',
        alpha: false,
      }}
      camera={{ fov: 50, near: 0.1, far: 6000, position: [-16, 26, 470] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.05
      }}
    >
      <PerformanceMonitor onDecline={() => setDpr((d) => Math.max(1, d - 0.35))}>
        <Suspense fallback={null}>
          <World />
        </Suspense>
      </PerformanceMonitor>
    </Canvas>
  )
}
