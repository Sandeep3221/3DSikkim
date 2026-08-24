import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { createSikkimMapGeometry } from './sikkimRelief'
import { scrollState } from '../systems/scroll/scrollState'
import { smoothRange } from '../systems/scroll/journey'

/**
 * The interactive relief map of Sikkim. Fades in as the journey resolves
 * (see terrainFade.ts); its material opacity is driven here so ownership
 * stays local to this component.
 */
export default function SikkimMap() {
  const geometry = useMemo(() => createSikkimMapGeometry(), [])
  const matRef = useRef<THREE.MeshStandardMaterial>(null)

  useFrame(() => {
    const p = scrollState.progress
    const op = smoothRange(p, 0.85, 0.9)
    const mat = matRef.current
    if (!mat) return
    mat.opacity = op
    mat.visible = op > 0.01
  })

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        ref={matRef}
        vertexColors
        transparent
        opacity={0}
        roughness={0.94}
        metalness={0}
      />
    </mesh>
  )
}
