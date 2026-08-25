import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { EARTH_RADIUS } from '../systems/scroll/journey'
import { prefersReducedMotion } from '../systems/performance/motion'
import { useUiState } from '../systems/ui/uiStore'

/**
 * OrbitControls for the interactive Sikkim explorer phase.
 *
 * Subscribes to the uiStore ITSELF (never via stale parent props) so the
 * controls reliably disable during cinematic dives — an earlier version
 * relied on a parent that rarely re-rendered, leaving OrbitControls active
 * during dives where they fought the camera route every frame.
 *
 * Constraints: no flying below terrain, no zooming to infinity, no flipping
 * the world upside down.
 */

const _camPos = new THREE.Vector3()

export default function InteractiveOrbitControls() {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const ui = useUiState()
  const controlsRef = useRef<any>(null)

  // Free exploration only: not during the journey, not during a dive, and
  // not while parked at an arrival viewpoint (the editorial panel drives
  // navigation there; orbit-at-arrival is a later refinement).
  const enabled = ui.mapActive && !ui.diving && !ui.selectedId

  useEffect(() => {
    if (controlsRef.current) controlsRef.current.enabled = enabled
  }, [enabled])

  useFrame(() => {
    if (!enabled || !controlsRef.current) return
    // Never allow the camera below the terrain datum.
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
      camera={camera}
      domElement={gl.domElement}
      enabled={enabled}
      enableZoom={true}
      enablePan={false}
      enableRotate={true}
      enableDamping={!prefersReducedMotion()}
      dampingFactor={prefersReducedMotion() ? 1 : 0.06}
      minDistance={EARTH_RADIUS + 0.9}
      maxDistance={EARTH_RADIUS + 14}
      minPolarAngle={Math.PI / 2.4}
      maxPolarAngle={Math.PI / 2.05}
    />
  )
}
