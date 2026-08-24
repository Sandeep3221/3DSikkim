import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
import { EARTH_RADIUS, SUMMIT_LOCAL, EAST_LOCAL, NORTH_LOCAL, track } from '../systems/scroll/journey'
import { scrollState } from '../systems/scroll/scrollState'
import { QUALITY } from '../systems/performance/quality'

/**
 * Two cloud systems:
 *  1. CloudLayer — the planet-scale shell (photographic cloud map), faded
 *     out as the camera descends through it into the mountains.
 *  2. PeakClouds — soft billboard banks drifting across Kangchenjunga that
 *     part in staggered waves during the reveal segment.
 */

const CLOUDS_URL = '/assets/textures/earth/clouds.png'
const CLOUD_SHELL_RADIUS = EARTH_RADIUS * 1.006

/** Soft volumetric-looking blob texture, generated once on a canvas. */
let peakCloudTexture: THREE.CanvasTexture | null = null

function getPeakCloudTexture(): THREE.CanvasTexture {
  if (peakCloudTexture) return peakCloudTexture
  const s = 256
  const canvas = document.createElement('canvas')
  canvas.width = s
  canvas.height = s
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, s, s)
  // Clustered radial gradients → amorphous cloud mass.
  const blobs = 14
  for (let i = 0; i < blobs; i++) {
    const cx = s / 2 + (Math.random() - 0.5) * s * 0.55
    const cy = s / 2 + (Math.random() - 0.5) * s * 0.4
    const r = s * (0.12 + Math.random() * 0.22)
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    const alpha = 0.16 + Math.random() * 0.22
    grad.addColorStop(0, `rgba(255,255,255,${alpha})`)
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, s, s)
  }
  peakCloudTexture = new THREE.CanvasTexture(canvas)
  peakCloudTexture.colorSpace = THREE.SRGBColorSpace
  return peakCloudTexture
}

export function CloudLayer() {
  const tex = useTexture(CLOUDS_URL)
  const mesh = useRef<THREE.Mesh>(null)

  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
  }, [tex])

  useFrame((_state, delta) => {
    const p = scrollState.progress
    const material = mesh.current?.material as THREE.MeshStandardMaterial | undefined
    if (!material || !mesh.current) return
    mesh.current.rotation.y += delta * 0.004
    material.opacity = track(p, [
      [0.05, 0],
      [0.16, 0.85],
      [0.44, 0.9],
      [0.56, 0.15],
      [0.64, 0],
      [1.0, 0],
    ])
    material.visible = material.opacity > 0.01
  })

  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[CLOUD_SHELL_RADIUS, QUALITY.sphereSegs / 2, QUALITY.sphereSegs / 4]} />
      <meshStandardMaterial
        map={tex}
        transparent
        opacity={0}
        depthWrite={false}
        roughness={1}
      />
    </mesh>
  )
}

interface Bank {
  offset: THREE.Vector3
  scale: number
  phase: number
  driftSpeed: number
  revealStart: number
  minOpacity: number
}

export function PeakClouds() {
  const spriteRefs = useRef<Array<THREE.Sprite | null>>([])

  const banks = useMemo<Bank[]>(() => {
    const up = SUMMIT_LOCAL.clone().normalize()
    const n = QUALITY.peakClouds
    // Deterministic pseudo-random placement (stable across sessions).
    let seed = 42
    const rand = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    return Array.from({ length: n }, (_, i) => ({
      offset: up
        .clone()
        .multiplyScalar(EARTH_RADIUS * 0.002 + rand() * 0.9)
        .addScaledVector(EAST_LOCAL, (rand() - 0.5) * 7)
        .addScaledVector(NORTH_LOCAL, (rand() - 0.5) * 6),
      scale: 2.6 + rand() * 3.8,
      phase: rand() * Math.PI * 2,
      driftSpeed: 0.02 + rand() * 0.04,
      // Staggered reveal windows across the KANCHENJUNGA segment (0.55–0.70).
      revealStart: 0.55 + (i / n) * 0.12,
      minOpacity: 0.1 + rand() * 0.18,
    }))
  }, [])

  useFrame(({ clock }) => {
    const p = scrollState.progress
    const t = clock.elapsedTime
    banks.forEach((bank, i) => {
      const sprite = spriteRefs.current[i]
      if (!sprite) return
      // Gentle lateral drift within the local tangent frame.
      sprite.position.x = bank.offset.x + Math.sin(t * bank.driftSpeed + bank.phase) * 0.5
      sprite.position.z = bank.offset.z + Math.cos(t * bank.driftSpeed * 0.8 + bank.phase) * 0.4

      const reveal = 1 - track(p, [
        [bank.revealStart - 0.06, 0],
        [bank.revealStart + 0.1, 1],
      ])
      const mat = sprite.material as THREE.SpriteMaterial
      mat.opacity = bank.minOpacity + (1 - bank.minOpacity) * reveal
      mat.visible = p > 0.35 && p < 0.82 && mat.opacity > 0.01
    })
  })

  return (
    <group>
      {banks.map((bank, i) => (
        <sprite
          key={i}
          ref={(el) => {
            spriteRefs.current[i] = el
          }}
          position={bank.offset}
          scale={[bank.scale, bank.scale * 0.62, 1]}
          renderOrder={10}
        >
          <spriteMaterial
            map={getPeakCloudTexture()}
            transparent
            depthWrite={false}
            opacity={0.9}
          />
        </sprite>
      ))}
    </group>
  )
}

/**
 * FLIGHT — a loose corridor of cloud banks along the mountain-flight path
 * east of Kangchenjunga. Gives the camera something to skim past between
 * the reveal and the Sikkim arrival; dissolves as the map phase begins.
 */
export function FlightClouds() {
  const spriteRefs = useRef<Array<THREE.Sprite | null>>([])

  const clouds = useMemo(() => {
    const up = SUMMIT_LOCAL.clone().normalize()
    let seed = 7
    const rand = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    return Array.from({ length: QUALITY.tier === 'low' ? 4 : 6 }, (_, i) => ({
      position: up
        .clone()
        .multiplyScalar(EARTH_RADIUS * 0.004 + rand() * 2.2)
        .addScaledVector(EAST_LOCAL, 8 + i * 3.4 + rand() * 2.5)
        .addScaledVector(NORTH_LOCAL, (rand() - 0.5) * 9),
      scale: 3 + rand() * 5,
      phase: rand() * Math.PI * 2,
    }))
  }, [])

  useFrame(() => {
    const p = scrollState.progress
    const gate = track(p, [
      [0.66, 0],
      [0.72, 0.55],
      [0.84, 0.45],
      [0.9, 0],
      [1.0, 0],
    ])
    clouds.forEach((cloud, i) => {
      const sprite = spriteRefs.current[i]
      if (!sprite) return
      const mat = sprite.material as THREE.SpriteMaterial
      mat.opacity = gate * (0.55 + 0.35 * Math.sin(cloud.phase))
      mat.visible = mat.opacity > 0.01
    })
  })

  return (
    <group>
      {clouds.map((cloud, i) => (
        <sprite
          key={i}
          ref={(el) => {
            spriteRefs.current[i] = el
          }}
          position={cloud.position}
          scale={[cloud.scale, cloud.scale * 0.62, 1]}
          renderOrder={10}
        >
          <spriteMaterial map={getPeakCloudTexture()} transparent depthWrite={false} opacity={0} />
        </sprite>
      ))}
    </group>
  )
}