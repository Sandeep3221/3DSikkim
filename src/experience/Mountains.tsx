import { useEffect, useMemo } from 'react'
import { useRef } from 'react'
import * as THREE from 'three'
import {
  createPatchGeometry,
  makeRangeHeight,
} from './terrainField'
import { QUALITY } from '../systems/performance/quality'
import { registerFadeMaterial, unregisterFadeMaterial } from './terrainFade'

/**
 * Flanking Himalayan ranges — lower, softer patches beyond the hero patch
 * that fill the horizon behind and beside Kangchenjunga. They share the same
 * sphere-conforming geometry so the range reads as one continuous world.
 * Distant ranges read through atmospheric perspective rather than detail.
 */

interface RangeConfig {
  offsetX: number
  offsetY: number
  size: number
  amp: number
  seed: number
}

const RANGES: RangeConfig[] = [
  { offsetX: 30, offsetY: -20, size: 46, amp: 0.62, seed: 7.3 },
  { offsetX: -27, offsetY: -26, size: 44, amp: 0.6, seed: 3.1 },
  { offsetX: 6, offsetY: 32, size: 50, amp: 0.72, seed: 11.7 },
]

export default function Mountains() {
  const geometries = useMemo(
    () =>
      RANGES.map((range) =>
        createPatchGeometry({
          offsetX: range.offsetX,
          offsetY: range.offsetY,
          size: range.size,
          segments: QUALITY.mountainSegs,
          heightFn: makeRangeHeight(range.seed),
          ampScale: range.amp,
          palette: 'distant',
        }),
      ),
    [],
  )

  const matRefs = useRef<Array<THREE.MeshStandardMaterial | null>>([])

  useEffect(() => {
    matRefs.current.forEach((mat) => {
      if (mat) registerFadeMaterial(mat, 'journey')
    })
    return () => {
      matRefs.current.forEach((mat) => {
        if (mat) unregisterFadeMaterial(mat)
      })
    }
  }, [])

  return (
    <>
      {geometries.map((geometry, i) => (
        <mesh key={i} geometry={geometry}>
          <meshStandardMaterial
            ref={(self) => {
              matRefs.current[i] = self
            }}
            vertexColors
            roughness={0.96}
            metalness={0}
          />
        </mesh>
      ))}
    </>
  )
}

