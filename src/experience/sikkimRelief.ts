import * as THREE from 'three'
import { valueNoise, ridged } from './noise'
import { EARTH_RADIUS, latLonToUnit, earthQuaternion } from '../systems/scroll/journey'
import { QUALITY } from '../systems/performance/quality'

/**
 * Interactive relief map of Sikkim — the world-as-UI surface the journey
 * resolves into. A detailed, cartographically-styled terrain patch centred on
 * Sikkim (27.60° N, 88.45° E), sitting exactly where the cinematic journey
 * took place, so the transition stays geographic rather than becoming a
 * separate "map scene".
 */

/** Sikkim centroid used as the map basis origin. */
export const MAP_SITE = { lat: 27.6, lon: 88.45 } as const

/** Map patch half-extents in tangent-plane units (covers the whole state). */
export const MAP_HALF = { u: 0.95, v: 1.05 }

/** Relief amplitude of the stylised map (exaggerated for legibility). */
export const MAP_RELIEF = 0.16

const EPS = 0.05

const radial = latLonToUnit(MAP_SITE.lat, MAP_SITE.lon)
const center = radial.clone().multiplyScalar(EARTH_RADIUS)
const north = latLonToUnit(MAP_SITE.lat + EPS, MAP_SITE.lon)
  .sub(latLonToUnit(MAP_SITE.lat - EPS, MAP_SITE.lon))
  .normalize()
const east = new THREE.Vector3().crossVectors(north, radial).normalize()

/** Local tangent basis at the map centre (earth-group frame). */
export const MAP_BASIS = { center, east, north, up: radial.clone() }

/** Tangent-plane coordinates (u east, v north) for a lat/lon on the map. */
function latLonToUV(lat: number, lon: number): { u: number; v: number } {
  const p = latLonToUnit(lat, lon).multiplyScalar(EARTH_RADIUS)
  const rel = p.clone().sub(center)
  return { u: rel.dot(east), v: rel.dot(north) }
}

/**
 * Stylised Sikkim heightfield (scene units above the globe).
 * High glaciated crest across the north (the great Himalayan watershed,
 * including Kangchenjunga in the west), deep valleys mid-state, gentler
 * hills toward the southern lowlands.
 */
function heightAtMap(u: number, v: number): number {
  // North–south elevation gradient: crest near v≈+0.75, lowlands v<−0.5.
  const band = Math.exp(-Math.pow((v - 0.72) / 0.42, 2))
  const mid = Math.exp(-Math.pow((v + 0.15) / 0.35, 2)) * 0.32

  // Western massif bias (Kangchenjunga sits in the northwest corner).
  const westBias = Math.exp(-Math.pow((u + 0.55) / 0.55, 2)) * 0.28 * band

  const ridgeA = ridged(u * 2.4 + 3.7, v * 2.4 + 9.2, 4)
  const ridgeB = ridged(u * 5.1 + 17.3, v * 5.1 + 4.8, 3)
  const detail = valueNoise(u * 9.0 + 31.0, v * 9.0 + 7.7)

  const h =
    MAP_RELIEF *
    (band * (0.62 * ridgeA + 0.22 * ridgeB) + mid * (0.4 * ridgeB + 0.12 * detail) + westBias + 0.06 * detail * band)

  return Math.max(0.004, h)
}

/** Surface height at geographic coordinates (for marker placement). */
export function mapHeightAtLatLon(lat: number, lon: number): number {
  const { u, v } = latLonToUV(lat, lon)
  return heightAtMap(u, v)
}

/** Earth-local position of a point on the map surface (+ optional offset). */
export function mapPoint(
  lat: number,
  lon: number,
  heightOffset = 0,
  out = new THREE.Vector3(),
): THREE.Vector3 {
  const { u, v } = latLonToUV(lat, lon)
  return out
    .copy(center)
    .addScaledVector(east, u)
    .addScaledVector(north, v)
    .normalize()
    .multiplyScalar(EARTH_RADIUS + heightAtMap(u, v) + heightOffset)
}

/** Earth-local position of the map centre at a given altitude above ground. */
export function mapCenterPoint(heightOffset = 0, out = new THREE.Vector3()): THREE.Vector3 {
  return out.copy(center).normalize().multiplyScalar(EARTH_RADIUS + MAP_RELIEF * 0.4 + heightOffset)
}

/** Gangtok anchor — the arrival city the camera glides toward at journey end. */
export const GANGTOK_POINT = mapPoint(27.3325, 88.6146, 0.05)

/**
 * Focus pose for an interactively selected destination: a low oblique hover
 * above its marker. Returned in WORLD space (earth rotation applied).
 * Consumed by CameraController when uiStore.selectedId is set.
 */
export function destinationFocusPose(
  progress: number,
  lat: number,
  lon: number,
  outPosition: THREE.Vector3,
  outTarget: THREE.Vector3,
): void {
  const q = earthQuaternion(progress, _fq)
  const m = mapPoint(lat, lon, 0.02).applyQuaternion(q)
  const up = _fu.copy(m).normalize()
  outTarget.copy(m).addScaledVector(up, 0.02)
  outPosition
    .copy(m)
    .addScaledVector(up, 1.35)
    .addScaledVector(_fn.copy(north).applyQuaternion(q), -1.0)
    .addScaledVector(_fe.copy(east).applyQuaternion(q), 0.45)
}

const _fq = new THREE.Quaternion()
const _fu = new THREE.Vector3()
const _fn = new THREE.Vector3()
const _fe = new THREE.Vector3()


/**
 * Build the Sikkim map geometry in earth-group local space.
 * Cartographic palette: deep green valleys → rock → snow crest.
 */
export function createSikkimMapGeometry(): THREE.BufferGeometry {
  const segments = QUALITY.tier === 'high' ? 220 : QUALITY.tier === 'medium' ? 170 : 120
  const count = (segments + 1) * (segments + 1)
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)

  const dir = new THREE.Vector3()
  const col = new THREE.Color()
  const valleyC = new THREE.Color('#4d5f49').convertSRGBToLinear()
  const forestC = new THREE.Color('#5c6e54').convertSRGBToLinear()
  const rockC = new THREE.Color('#77726a').convertSRGBToLinear()
  const snowC = new THREE.Color('#edf1f4').convertSRGBToLinear()
  const flatC = new THREE.Color('#66705f').convertSRGBToLinear()

  let ptr = 0
  for (let iy = 0; iy <= segments; iy++) {
    for (let ix = 0; ix <= segments; ix++) {
      const u = -MAP_HALF.u + (ix / segments) * MAP_HALF.u * 2
      const v = -MAP_HALF.v + (iy / segments) * MAP_HALF.v * 2
      const h = heightAtMap(u, v)

      dir
        .copy(center)
        .addScaledVector(east, u)
        .addScaledVector(north, v)
        .normalize()
        .multiplyScalar(EARTH_RADIUS + h)

      positions[ptr] = dir.x
      positions[ptr + 1] = dir.y
      positions[ptr + 2] = dir.z

      const t = h / MAP_RELIEF
      col.copy(valleyC).lerp(forestC, valueNoise(u * 6 + 11, v * 6 + 5))
      col.lerp(rockC, Math.max(0, t - 0.35) * 1.8)
      col.lerp(snowC, Math.max(0, t - 0.72) * 3.2)
      col.lerp(flatC, 0.18 * (1 - Math.min(1, t * 2)))

      colors[ptr] = col.r
      colors[ptr + 1] = col.g
      colors[ptr + 2] = col.b
      ptr += 3
    }
  }

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
