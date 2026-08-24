import { useFrame } from '@react-three/fiber'
import { Suspense, useRef } from 'react'
import * as THREE from 'three'
import { scrollState } from '../systems/scroll/scrollState'
import { EARTH_TILT_QUAT, earthYaw } from '../systems/scroll/journey'
import { setMapActive } from '../systems/ui/uiStore'
import { applyTerrainCrossfade } from './terrainFade'
import Earth from './Earth'
import { CloudLayer, FlightClouds, PeakClouds } from './Clouds'
import Terrain from './Terrain'
import Mountains from './Mountains'
import SikkimMap from './SikkimMap'
import MapMarkers from './MapMarkers'
import Stars from './Stars'
import Atmosphere from './Atmosphere'
import Lighting from './Lighting'
import CameraController from './CameraController'

/**
 * Scene assembly. The spinning group carries Earth, its cloud shell, the
 * Himalayan terrain patches AND the interactive Sikkim relief map — the
 * mountains are children of the planet, so the camera dive from orbit ends
 * on the same continuous surface, and the journey resolves onto a live map
 * of exactly the place it flew through. No cuts anywhere.
 */
export default function World() {
  const spin = useRef<THREE.Group>(null)

  useFrame(() => {
    const p = scrollState.progress
    if (spin.current) spin.current.rotation.y = earthYaw(p)
    applyTerrainCrossfade(p)
    setMapActive(p > 0.92)
  })

  return (
    <>
      <group quaternion={EARTH_TILT_QUAT}>
        {/* Textures load asynchronously; keep the scene alive while they stream in. */}
        <Suspense fallback={null}>
          <group ref={spin}>
            <Terrain />
            <Mountains />
            <SikkimMap />
            <MapMarkers />
            <PeakClouds />
            <FlightClouds />
            <Earth />
            <CloudLayer />
          </group>
        </Suspense>
      </group>

      <Stars />
      <Atmosphere />
      <Lighting />
      <CameraController />
    </>
  )
}


