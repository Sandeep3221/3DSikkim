import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { smoothRange } from '../systems/scroll/journey'
import { scrollState } from '../systems/scroll/scrollState'
import { QUALITY } from '../systems/performance/quality'
import { prefersReducedMotion } from '../systems/performance/motion'

/**
 * Restrained star field: three depth layers of subtly tinted points with a
 * faint galactic band. Fades out as the camera enters the atmosphere.
 */

interface LayerSpec {
  count: number
  size: number
  opacity: number
  radiusMin: number
  radiusMax: number
  bandWeight: number
}

function buildLayer(spec: LayerSpec): THREE.Points {
  const { count, size, opacity, radiusMin, radiusMax, bandWeight } = spec
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const bandNormal = new THREE.Vector3(0.42, 0.86, -0.28).normalize()
  const v = new THREE.Vector3()

  for (let i = 0; i < count; i++) {
    // Uniform direction…
    v
      .set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)
      .normalize()
    if (v.lengthSq() < 1e-6) v.set(0, 1, 0)
    // …pulled partially toward the galactic band plane.
    if (Math.random() < bandWeight) {
      const d = v.dot(bandNormal)
      v.addScaledVector(bandNormal, -d * (0.75 + Math.random() * 0.2)).normalize()
    }
    const r = radiusMin + Math.random() * (radiusMax - radiusMin)
    positions[i * 3] = v.x * r
    positions[i * 3 + 1] = v.y * r
    positions[i * 3 + 2] = v.z * r

    // Restrained temperature range: whites with hints of blue or warmth.
    const t = Math.random()
    const b = 0.55 + Math.random() * 0.45
    colors[i * 3] = b * (t > 0.8 ? 1 : t < 0.2 ? 0.82 : 0.95)
    colors[i * 3 + 1] = b * 0.93
    colors[i * 3 + 2] = b * (t < 0.35 ? 1 : 0.9)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const mat = new THREE.PointsMaterial({
    size,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity,
    depthWrite: false,
  })

  const points = new THREE.Points(geo, mat)
  points.frustumCulled = false
  return points
}

export default function Stars() {
  const group = useRef<THREE.Group>(null)

  const layers = useMemo(() => {
    const n = QUALITY.starCount
    return [
      buildLayer({ count: Math.floor(n * 0.62), size: 1.1, opacity: 0.5, radiusMin: 1200, radiusMax: 2100, bandWeight: 0.45 }),
      buildLayer({ count: Math.floor(n * 0.3), size: 1.7, opacity: 0.75, radiusMin: 1100, radiusMax: 2000, bandWeight: 0.4 }),
      buildLayer({ count: Math.max(24, Math.floor(n * 0.08)), size: 2.5, opacity: 0.9, radiusMin: 1000, radiusMax: 1900, bandWeight: 0.25 }),
    ]
  }, [])

  // primitive-mounted objects are not auto-disposed by r3f — clean up here.
  useEffect(
    () => () => {
      layers.forEach((layer) => {
        layer.geometry.dispose()
        ;(layer.material as THREE.PointsMaterial).dispose()
      })
    },
    [layers],
  )

  useFrame(({ clock }) => {
    const p = scrollState.progress
    const g = 1 - smoothRange(p, 0.5, 0.66)
    const twinkle = prefersReducedMotion()
      ? 1
      : 0.94 + 0.06 * Math.sin(clock.elapsedTime * 0.7)
    layers.forEach((layer, i) => {
      const mat = layer.material as THREE.PointsMaterial
      mat.opacity = [0.5, 0.75, 0.9][i] * g * twinkle
    })
    if (group.current) group.current.rotation.y = clock.elapsedTime * 0.0015
  })

  return (
    <group ref={group}>
      {layers.map((layer, i) => (
        <primitive key={i} object={layer} />
      ))}
    </group>
  )
}
