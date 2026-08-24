import * as THREE from 'three'
import { smoothRange } from '../systems/scroll/journey'

/**
 * Terrain crossfade registry. Journey-scale patches (hero + flanking ranges)
 * fade out while the Sikkim relief map fades in during the arrival segment —
 * masked by dense haze and cloud, so the handover never reads as a cut.
 *
 * Materials register themselves via ref callbacks; one call per frame from
 * World drives every registered material.
 */

type FadeGroup = 'journey' | 'map'

const journeyMats = new Set<THREE.MeshStandardMaterial>()
const mapMats = new Set<THREE.MeshStandardMaterial>()

export function registerFadeMaterial(mat: THREE.MeshStandardMaterial, group: FadeGroup): void {
  mat.transparent = true
  ;(group === 'journey' ? journeyMats : mapMats).add(mat)
}

export function unregisterFadeMaterial(mat: THREE.MeshStandardMaterial): void {
  journeyMats.delete(mat)
  mapMats.delete(mat)
}

/** Drive the crossfade. Call once per frame. */
export function applyTerrainCrossfade(p: number): void {
  const journeyOp = p < 0.84 ? 1 : 1 - smoothRange(p, 0.84, 0.895)
  const mapOp = smoothRange(p, 0.85, 0.9)

  journeyMats.forEach((m) => {
    m.opacity = journeyOp
    m.visible = journeyOp > 0.01
  })
    mapMats.forEach((m) => {
      m.opacity = mapOp
      m.visible = mapOp > 0.01
    })
}
