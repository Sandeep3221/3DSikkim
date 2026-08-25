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
import SikkimTerrain from './SikkimTerrain'
import MapMarkers from './MapMarkers'
import Stars from './Stars'
import Atmosphere from './Atmosphere'
import Lighting from './Lighting'
import CameraController from './CameraController'
import DestinationCameraRoute from './DestinationCameraRoute'
import InteractiveOrbitControls from './InteractiveOrbitControls'
import DestinationEnvironment from './DestinationEnvironment'

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
        <Suspense fallback={null}>
          <group ref={spin}>
            <Terrain />
            <Mountains />
            <SikkimTerrain />
            <MapMarkers />
            <PeakClouds />
            <FlightClouds />
            <Earth />
            <CloudLayer />
            <DestinationEnvironment />
          </group>
        </Suspense>
      </group>

      <Stars />
      <Atmosphere />
      <Lighting />
      <CameraController />
      <DestinationCameraRoute />
      <InteractiveOrbitControls />
    </>
  )
}
