import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { DESTINATIONS } from '../data/destinations'
import { scrollState } from '../systems/scroll/scrollState'
import { QUALITY } from '../systems/performance/quality'
import {
  SIKKIM_BOUNDS,
  createTerrainPatchGeometry,
  destinationPatchBounds,
  surfacePointWorld,
} from './sikkimWorld'
import { useTerrainReady } from './useTerrain'
import { registerFadeMaterial, unregisterFadeMaterial } from './terrainFade'

/**
 * The real Sikkim geographic terrain (Copernicus DEM), rendered with
 * distance-based Level of Detail:
 *
 *  LOD0  — one low-detail mesh over the whole state (always present).
 *  LOD2  — a high-detail patch around each destination, shown only when the
 *          camera is close to that place, so approaching somewhere reveals
 *          real high-resolution relief.
 *
 * The whole surface conforms to the globe and crossfades in where the
 * cinematic journey ends.
 */

const LOD0_SEGS: Record<string, number> = { high: 120, medium: 96, low: 80 }
const PATCH_SEGS: Record<string, number> = { high: 170, medium: 140, low: 110 }
const PATCH_SHOW_DIST = 2.6
const PATCH_HALF_DEG = 0.2

export default function SikkimTerrain() {
  const ready = useTerrainReady()
  const camera = useThree((s) => s.camera)

  const lod0Geo = useMemo(
    () => (ready ? createTerrainPatchGeometry(SIKKIM_BOUNDS, LOD0_SEGS[QUALITY.tier]) : null),
    [ready],
  )
  const patchGeos = useMemo(
    () =>
      DESTINATIONS.map((d) =>
        ready
          ? createTerrainPatchGeometry(
              destinationPatchBounds(d.coords.lat, d.coords.lon, PATCH_HALF_DEG),
              PATCH_SEGS[QUALITY.tier],
            )
          : null,
      ),
    [ready],
  )

  const lod0Mat = useRef<THREE.MeshStandardMaterial>(null)
  const patchMats = useRef<Array<THREE.MeshStandardMaterial | null>>([])
  const patchMeshes = useRef<Array<THREE.Mesh | null>>([])
  const destWorld = useMemo(
    () => DESTINATIONS.map(() => new THREE.Vector3()),
    [],
  )

  // Register with the crossfade so the whole world fades in at journey end.
  useEffect(() => {
    const mats = [lod0Mat.current, ...patchMats.current].filter(Boolean) as THREE.MeshStandardMaterial[]
    mats.forEach((m) => registerFadeMaterial(m, 'map'))
    return () => {
      mats.forEach((m) => unregisterFadeMaterial(m))
    }
  }, [ready])

  // Distance-based LOD: show a destination's detail patch when close.
  useFrame(() => {
    const p = scrollState.progress
    patchMeshes.current.forEach((mesh, i) => {
      if (!mesh) return
      surfacePointWorld(p, DESTINATIONS[i].coords.lat, DESTINATIONS[i].coords.lon, 0, destWorld[i])
      mesh.visible = camera.position.distanceTo(destWorld[i]) < PATCH_SHOW_DIST
    })
  })

  return (
    <group visible={ready}>
      {lod0Geo ? (
        <mesh geometry={lod0Geo} key="lod0" renderOrder={0}>
          <meshStandardMaterial ref={lod0Mat} vertexColors transparent opacity={0} roughness={0.96} metalness={0} />
        </mesh>
      ) : null}
      {patchGeos.map((geo, i) =>
        geo ? (
          <mesh
            key={`patch-${i}`}
            geometry={geo}
            ref={(el) => {
              patchMeshes.current[i] = el
            }}
            renderOrder={1}
          >
            <meshStandardMaterial
              ref={(m) => {
                patchMats.current[i] = m
              }}
              vertexColors
              transparent
              opacity={0}
              roughness={0.95}
              metalness={0}
            />
          </mesh>
        ) : null,
      )}
    </group>
  )
}
