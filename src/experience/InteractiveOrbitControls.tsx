import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { EARTH_RADIUS } from '../systems/scroll/journey'
import { prefersReducedMotion } from '../systems/performance/motion'

/**
 * OrbitControls that activate only during the interactive Sikkim explorer
 * phase. Constrained so the user cannot fly underground, zoom to infinity,
 * or flip the world upside down. The experience's cinematic camera
 * choreography owns the camera during the journey — this is purely the
 * explorer-phase controller.
 */

const _camPos = new THREE.Vector3()

export default function InteractiveOrbitControls({ enabled }: { enabled: boolean }) {
  const { camera, gl } = useThree()
  const controlsRef = useRef<any>(null)

  useEffect(() => {
    const c = controlsRef.current
    if (!c) return
    c.enabled = enabled
  }, [enabled])

  useFrame(() => {
    if (!enabled || !controlsRef.current) return
    // Don't allow the camera below the earth's surface.
    camera.getWorldPosition(_camPos)
    const dist = _camPos.length()
    if (dist < EARTH_RADIUS + 0.8) {
      _camPos.normalize().multiplyScalar(EARTH_RADIUS + 0.8)
      camera.position.copy(_camPos)
      controlsRef.current.update()
    }
  })

  if (!enabled) return null
  return (
    <OrbitControls
      ref={controlsRef}
      args={[camera, gl.domElement]}
      enableZoom={true}
      enablePan={true}
      enableRotate={true}
      enableDamping={prefersReducedMotion() ? false : true}
      dampingFactor={prefersReducedMotion() ? 0 : 0.05}
      minDistance={EARTH_RADIUS + 0.9}
      maxDistance={EARTH_RADIUS + 14}
      minPolarAngle={Math.PI / 2.4}
      maxPolarAngle={Math.PI / 2.05}
      maxAzimuthAngle={Math.PI / 3}
      minAzimuthAngle={-Math.PI / 3}
    />
  )
}
