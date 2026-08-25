import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { DESTINATIONS } from '../data/destinations'
import { scrollState } from '../systems/scroll/scrollState'
import { QUALITY } from '../systems/performance/quality'
import { smoothRange } from '../systems/scroll/journey'
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
 *  LOD2  — a high-detail patch around each destination. Opacity fades in
 *          smoothly as the camera approaches, so detail emerges from the
 *          haze rather than popping in as a rectangular tile.
 *
 * The whole surface conforms to the globe and crossfades in where the
 * cinematic journey ends.
 */

const LOD0_SEGS: Record<string, number> = { high: 120, medium: 96, low: 80 }
const PATCH_SEGS: Record<string, number> = { high: 170, medium: 140, low: 110 }
/** Camera distance range over which a detail patch fades in/out. */
const PATCH_FAR = 3.4
const PATCH_NEAR = 1.9
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
  const destWorld = useMemo(() => DESTINATIONS.map(() => new THREE.Vector3()), [])

  // LOD0 joins the journey→map crossfade. Detail patches manage their own
  // opacity locally (journey fade × proximity) so they can fade smoothly
  // with camera distance instead of popping in.
  useEffect(() => {
    const mat = lod0Mat.current
    if (mat) registerFadeMaterial(mat, 'map')
    return () => {
      if (mat) unregisterFadeMaterial(mat)
    }
  }, [ready])

  useEffect(
    () => () => {
      lod0Geo?.dispose()
      patchGeos.forEach((g) => g?.dispose())
      patchMats.current.forEach((m) => m?.dispose())
    },
    [lod0Geo, patchGeos],
  )

  // Distance-based LOD with continuous fade — never a hard pop-in.
  useFrame(() => {
    const p = scrollState.progress
    const mapOp = smoothRange(p, 0.85, 0.9)

    for (let i = 0; i < DESTINATIONS.length; i++) {
      const mesh = patchMeshes.current[i]
      const mat = patchMats.current[i]
      if (!mesh || !mat) continue

      surfacePointWorld(p, DESTINATIONS[i].coords.lat, DESTINATIONS[i].coords.lon, 0, destWorld[i])
      const dist = camera.position.distanceTo(destWorld[i])
      // 0 when far, 1 when near — smoothstep between the two distances.
      const prox = 1 - smoothRange(dist, PATCH_NEAR, PATCH_FAR)
      const op = mapOp * prox

      mat.opacity = op
      mesh.visible = op > 0.01
    }
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
              depthWrite={false}
            />
          </mesh>
        ) : null,
      )}
    </group>
  )
}
