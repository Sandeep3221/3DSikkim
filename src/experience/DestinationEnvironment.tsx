import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useUiState } from '../systems/ui/uiStore'
import { DESTINATIONS } from '../data/destinations'
import {
  destinationPatchBounds,
  createTerrainPatchGeometry,
  surfacePointWorld,
} from './sikkimWorld'
import { registerFadeMaterial, unregisterFadeMaterial } from './terrainFade'
import { QUALITY } from '../systems/performance/quality'
import { smoothRange } from '../systems/scroll/journey'
import { scrollState } from '../systems/scroll/scrollState'

/**
 * Destination-specific arrival environments.
 *
 * When the camera has selected a destination (and the journey has resolved
 * into the interactive phase), this mounts a high-detail terrain patch
 * around that location, adjusts local fog density, and provides the final
 * cinematic viewpoint composition.
 *
 * Only the active destination's environment is loaded — the patch geometry
 * is rebuilt when selection changes and disposed on unmount. This
 * component is a child of the spinning Earth group, so arrival
 * environments are geographically continuous with the rest of the world.
 */

const _surfPt = new THREE.Vector3()

export default function DestinationEnvironment() {
  const { scene } = useThree()
  const ui = useUiState()

  if (!ui.selectedId || !ui.mapActive) return null

  const dest = DESTINATIONS.find((d) => d.id === ui.selectedId)
  if (!dest) return null

  return <ArrivalZone dest={dest} scene={scene} arrived={ui.arrived} />
}

function ArrivalZone({
  dest,
  scene,
  arrived,
}: {
  dest: (typeof DESTINATIONS)[number]
  scene: THREE.Scene
  arrived: boolean
}) {
  const bounds = destinationPatchBounds(dest.coords.lat, dest.coords.lon, 0.1)

  const geo = useMemo(() => {
    const segs = QUALITY.tier === 'high' ? 160 : QUALITY.tier === 'medium' ? 130 : 100
    return createTerrainPatchGeometry(bounds, segs)
  }, [bounds, QUALITY.tier])

  const matRef = useRef<THREE.MeshStandardMaterial>(null)

  // Register with the crossfade so the arrival patch fades in with the world.
  useEffect(() => {
    return () => {
      if (matRef.current) unregisterFadeMaterial(matRef.current)
      geo.dispose()
    }
  }, [geo])

  // Compute the patch position once (Earth rotation at interactive phase
  // is effectively fixed at p=0.92, so the surface point is stable).
  const patchPos = useMemo(() => {
    const p = 0.95
    surfacePointWorld(p, dest.coords.lat, dest.coords.lon, 0, _surfPt)
    return _surfPt.clone()
  }, [dest.coords.lat, dest.coords.lon])

  // Tighten fog as the camera settles at the destination — creates enclosure
  // and masks any LOD transition.
  useFrame(() => {
    if (!arrived) return
    const fog = scene.fog
    if (fog && 'density' in fog) {
      const p = scrollState.progress
      const arrival = smoothRange(p, 0.92, 1.0)
      ;(fog as THREE.FogExp2).density = 0.014 * arrival
    }
  })

  return (
    <group>
      <mesh geometry={geo} position={patchPos}>
        <meshStandardMaterial
          ref={matRef}
          vertexColors
          transparent
          opacity={0}
          roughness={0.94}
          metalness={0}
        />
      </mesh>
    </group>
  )
}
