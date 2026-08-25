import { useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useUiState } from '../systems/ui/uiStore'
import { DESTINATIONS } from '../data/destinations'
import { smoothRange } from '../systems/scroll/journey'
import { scrollState } from '../systems/scroll/scrollState'

/**
 * Destination arrival atmosphere.
 *
 * TIGHTENS FOG as the camera settles at a destination, creating enclosure
 * and masking LOD transitions. This component intentionally does NOT mount
 * its own terrain geometry: all terrain LOD (including per-destination
 * detail patches) is owned exclusively by SikkimTerrain.tsx. A previous
 * version mounted a second high-detail patch here, which produced two
 * coplanar surfaces (z-fighting) and a visibly misplaced rectangular slab
 * due to a world/earth-local frame mismatch. Do not reintroduce duplicate
 * terrain geometry here.
 *
 * INTEGRATION POINT (future phase): handcrafted arrival assets (hero
 * composition props, settlement suggestion geometry) should mount inside
 * this component, georeferenced via sikkimWorld.surfacePointEarthLocal.
 */

const BASE_FOG_DENSITY = 0.0065
const ARRIVAL_FOG_DENSITY = 0.014

let fogRef: THREE.FogExp2 | null = null

export default function DestinationEnvironment() {
  const { scene } = useThree()
  const ui = useUiState()

  // Claim the scene fog once so we can restore the baseline on unmount.
  useEffect(() => {
    const f = scene.fog
    if (f && 'density' in f) fogRef = f as THREE.FogExp2
    return () => {
      if (fogRef) fogRef.density = BASE_FOG_DENSITY
      fogRef = null
    }
  }, [scene])

  const dest = ui.selectedId ? DESTINATIONS.find((d) => d.id === ui.selectedId) : null

  useFrame(() => {
    if (!fogRef) return
    const p = scrollState.progress
    if (!ui.selectedId || !ui.arrived) {
      // Explorer overview baseline (matches Lighting's late-journey track).
      fogRef.density += (0.0075 - fogRef.density) * 0.05
      return
    }
    // Arrived: enclose the viewpoint. Blend in over the settle window.
    const settle = smoothRange(p, 0.92, 1.0)
    const target = BASE_FOG_DENSITY + (ARRIVAL_FOG_DENSITY - BASE_FOG_DENSITY) * settle
    fogRef.density += (target - fogRef.density) * 0.04
  })

  void dest // destination-specific atmosphere tuning arrives with handcrafted assets
  return null
}
