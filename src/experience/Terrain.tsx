import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { createPatchGeometry, heightAt, PATCH_SIZE } from './terrainField'
import { QUALITY } from '../systems/performance/quality'
import { registerFadeMaterial, unregisterFadeMaterial } from './terrainFade'

/**
 * The main Kangchenjunga patch. Geometry is built once in earth-group local
 * space (vertices already on the globe), so no transform is needed here.
 * Material participates in the journey→map crossfade.
 */
export default function Terrain() {
  const geometry = useMemo(
    () =>
      createPatchGeometry({
        size: PATCH_SIZE,
        segments: QUALITY.terrainSegs,
        heightFn: heightAt,
        palette: 'hero',
      }),
    [],
  )

  const matRef = useRef<THREE.MeshStandardMaterial>(null)

  useEffect(() => {
    const mat = matRef.current
    if (mat) registerFadeMaterial(mat, 'journey')
    return () => {
      if (mat) unregisterFadeMaterial(mat)
    }
  }, [])

  return (
    <mesh geometry={geometry} castShadow={QUALITY.shadows} receiveShadow={QUALITY.shadows}>
      <meshStandardMaterial ref={matRef} vertexColors roughness={0.95} metalness={0} />
    </mesh>
  )
}
