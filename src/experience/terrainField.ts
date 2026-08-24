import * as THREE from 'three'
import { ridged, valueNoise } from './noise'
import { HERO_HEIGHT, EARTH_RADIUS, makeSiteBasis, clamp01 } from '../systems/scroll/journey'

/**
 * Procedural Himalayan terrain. Every patch is a grid mapped onto the sphere
 * itself (vertices are re-projected onto the globe), so the mountains sit
 * perfectly on the Earth the camera arrives from — the geographic transition
 * is geometric, not a cut.
 *
 * ASSET INTERFACE — to replace the procedural heightfield with real data:
 *   1. Export a DEM heightmap as a grayscale image covering the site and add
 *      `public/assets/terrain/heightmap.png`.
 *   2. Swap `heightAt()` below for an image-sampled height lookup (the rest
 *      of the pipeline — geometry, colours, camera collision — reads only
 *      this one function).
 *   3. Optionally provide `public/assets/terrain/satellite.jpg` for albedo.
 */

export const PATCH_SIZE = 36
export const PATCH_HALF = PATCH_SIZE / 2

/**
 * Master heightfield of the hero patch (scene units above the globe).
 * Deterministic and shared with the camera collision clamp.
 */
export function heightAt(u: number, v: number): number {
  const broad = ridged(u * 0.045 + 11.3, v * 0.045 + 5.9, 5)
  const detail = ridged(u * 0.16 + 71.1, v * 0.16 + 29.7, 4)

  // Hero massif centred on the summit offset.
  const dx = u + 4.0
  const dy = v - 2.5
  const d = Math.hypot(dx, dy)
  const massif = Math.exp(-(d * d) / 200)
  const coneT = Math.max(0, 1 - d / 8)
  const cone = coneT * coneT * (0.6 + 0.7 * ridged(dx * 0.55 + 97.2, dy * 0.55 + 41.8, 3))

  // Diagonal valley corridor opening toward the viewer (negative-north side).
  const vl = (v + 0.42 * u + 7.4) / 3.6
  const valley = Math.exp(-vl * vl) * 0.16

  const h =
    0.13 * broad +
    0.055 * detail +
    massif * (0.42 * broad + 0.14 * detail) +
    cone * 0.78 -
    valley

  return HERO_HEIGHT * Math.min(Math.max(h, 0), 1)
}

/** Distant flanking range heightfields (no hero peak, own seeds). */
export function makeRangeHeight(seed: number): (u: number, v: number) => number {
  return (u: number, v: number) => {
    const a = ridged(u * 0.035 + seed, v * 0.035 + seed * 1.7, 5)
    const b = ridged(u * 0.12 + seed * 2.3, v * 0.12 + seed * 3.1, 3)
    return HERO_HEIGHT * Math.min(Math.max(0.02, 0.55 * a + 0.18 * b), 0.85)
  }
}

const smoothRangeLocal = (x: number, a: number, b: number): number => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

export interface PatchOptions {
  /** Tangent-plane centre offset from the journey site (scene units). */
  offsetX?: number
  offsetY?: number
  size: number
  segments: number
  heightFn: (u: number, v: number) => number
  ampScale?: number
  palette?: 'hero' | 'distant'
}

/**
 * Build a terrain patch whose vertices lie exactly on the globe surface at
 * radius EARTH_RADIUS + h. Returns a geometry in earth-group local space —
 * no transform needed on the mesh.
 */
export function createPatchGeometry(opts: PatchOptions): THREE.BufferGeometry {
  const { offsetX = 0, offsetY = 0, size, segments, heightFn, ampScale = 1, palette = 'hero' } = opts
  const basis = makeSiteBasis()
  const half = size / 2

  const centerDir = basis.center
    .clone()
    .addScaledVector(basis.east, offsetX)
    .addScaledVector(basis.north, offsetY)
    .normalize()

  const count = (segments + 1) * (segments + 1)
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)

  const dir = new THREE.Vector3()
  const col = new THREE.Color()
  const rockA = new THREE.Color('#4a443c').convertSRGBToLinear()
  const rockB = new THREE.Color('#837a6d').convertSRGBToLinear()
  const snow = new THREE.Color('#eef2f5').convertSRGBToLinear()
  const scrub = new THREE.Color('#4f5546').convertSRGBToLinear()
  const distantRock = new THREE.Color('#5d6470').convertSRGBToLinear()

  let ptr = 0
  for (let iy = 0; iy <= segments; iy++) {
    for (let ix = 0; ix <= segments; ix++) {
      const u = -half + (ix / segments) * size
      const v = -half + (iy / segments) * size
      const h = heightFn(u, v) * ampScale

      dir
        .copy(centerDir)
        .multiplyScalar(EARTH_RADIUS)
        .addScaledVector(basis.east, u)
        .addScaledVector(basis.north, v)
        .normalize()
        .multiplyScalar(EARTH_RADIUS + h)

      positions[ptr] = dir.x
      positions[ptr + 1] = dir.y
      positions[ptr + 2] = dir.z

      // Colour by altitude + slope (finite-difference gradient).
      const e = size / segments
      const hx = (heightFn(u + e, v) - heightFn(u - e, v)) * ampScale
      const hv = (heightFn(u, v + e) - heightFn(u, v - e)) * ampScale
      const gradMag = Math.hypot(hx, hv) / (2 * e)
      const ny = 1 / Math.sqrt(1 + gradMag * gradMag)

      if (palette === 'hero') {
        const t = h / HERO_HEIGHT
        col.copy(rockA).lerp(rockB, valueNoise(u * 0.31 + 7.7, v * 0.31 + 3.1))
        col.lerp(scrub, smoothRangeLocal(0.24 - t, 0, 0.18))
        const snowFactor = smoothRangeLocal(t, 0.52, 0.72) * smoothRangeLocal(ny, 0.55, 0.78)
        col.lerp(snow, snowFactor)
      } else {
        col.copy(distantRock).lerp(rockA, valueNoise(u * 0.21, v * 0.21))
        const snowFactor =
          smoothRangeLocal(h / HERO_HEIGHT, 0.5, 0.75) * smoothRangeLocal(ny, 0.6, 0.85) * 0.7
        col.lerp(snow, snowFactor)
      }

      colors[ptr] = col.r
      colors[ptr + 1] = col.g
      colors[ptr + 2] = col.b
      ptr += 3
    }
  }


  // Grid indices.
  const quadCount = segments * segments
  const indices = count > 65535 ? new Uint32Array(quadCount * 6) : new Uint16Array(quadCount * 6)
  let ip = 0
  for (let iy = 0; iy < segments; iy++) {
    for (let ix = 0; ix < segments; ix++) {
      const a = iy * (segments + 1) + ix
      const b = a + 1
      const c = a + segments + 1
      const d = c + 1
      indices[ip++] = a
      indices[ip++] = c
      indices[ip++] = b
      indices[ip++] = b
      indices[ip++] = c
      indices[ip++] = d
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.setIndex(new THREE.BufferAttribute(indices, 1))
  geo.computeVertexNormals()
  return geo
}

