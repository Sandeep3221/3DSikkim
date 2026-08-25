import * as THREE from 'three'
import { EARTH_RADIUS, latLonToUnit, earthQuaternion } from '../systems/scroll/journey'
import { getElevationMAtLatLon } from './terrainData'

/**
 * Geographic core for the real Sikkim world.
 *
 * This is the single reusable coordinate system. Everything that needs to
 * know where a place sits in 3D — terrain meshes, destination markers,
 * camera routes, collisions — maps latitude/longitude + real elevation
 * through this module. Elevation is read from the Copernicus DEM store.
 *
 * Frames:
 *  - "earth-local": coordinates in the rotating Earth group's frame
 *  - "world": coordinates after Earth rotation (camera space)
 */

/** Natural bounding box around the state (matches the DEM pipeline). */
export const SIKKIM_BOUNDS = { west: 88.0, south: 27.0, east: 89.0, north: 28.5 }

/** Scene units per metre of real elevation (sphere radius 100 ≈ 6371 km). */
export const METERS_PER_UNIT = 63710
export const UNITS_PER_M = 1 / METERS_PER_UNIT

export const MAP_SITE = { lat: 27.75, lon: 88.5 } as const

const radial = latLonToUnit(MAP_SITE.lat, MAP_SITE.lon)
const center = radial.clone().multiplyScalar(EARTH_RADIUS)
const north = latLonToUnit(SIKKIM_BOUNDS.north, SIKKIM_BOUNDS.west)
  .sub(latLonToUnit(SIKKIM_BOUNDS.south, SIKKIM_BOUNDS.west))
  .normalize()
const east = new THREE.Vector3().crossVectors(north, radial).normalize()

/** Local tangent basis at the region centroid (earth-group frame). */
export const GEO_BASIS = { center, east, north, up: radial.clone() }

const _q = new THREE.Quaternion()
const _u = new THREE.Vector3()

/** Earth-local world position for a lat/lon at a given elevation (metres). */
export function latLonToWorldEarthLocal(
  lat: number,
  lon: number,
  elevM: number,
  out = new THREE.Vector3(),
): THREE.Vector3 {
  latLonToUnit(lat, lon, out).multiplyScalar(EARTH_RADIUS + elevM * UNITS_PER_M)
  return out
}

/** Earth-local surface point at real elevation + optional offset (metres). */
export function surfacePointEarthLocal(
  lat: number,
  lon: number,
  offsetM = 0,
  out = new THREE.Vector3(),
): THREE.Vector3 {
  return latLonToWorldEarthLocal(lat, lon, getElevationMAtLatLon(lat, lon) + offsetM, out)
}

/** World-space surface point (earth rotation applied). */
export function surfacePointWorld(
  progress: number,
  lat: number,
  lon: number,
  offsetM = 0,
  out = new THREE.Vector3(),
): THREE.Vector3 {
  earthQuaternion(progress, _q)
  return surfacePointEarthLocal(lat, lon, offsetM, out).applyQuaternion(_q)
}

/** Orientation that lays a marker flat on the local surface (+Z = up). */
export function surfaceFlatQuaternion(lat: number, lon: number, out = new THREE.Quaternion()): THREE.Quaternion {
  latLonToUnit(lat, lon, _u)
  return out.setFromUnitVectors(new THREE.Vector3(0, 0, 1), _u)
}

/** World position of the region centroid at a given height above datum. */
export function stateCenterWorld(progress: number, heightOffsetM = 0, out = new THREE.Vector3()): THREE.Vector3 {
  earthQuaternion(progress, _q)
  const elev = getElevationMAtLatLon(MAP_SITE.lat, MAP_SITE.lon)
  return latLonToWorldEarthLocal(MAP_SITE.lat, MAP_SITE.lon, elev + heightOffsetM, out).applyQuaternion(_q)
}

/** World position of Gangtok at its real elevation (used by the arrival path). */
export function gangtokWorldPoint(progress: number, out = new THREE.Vector3()): THREE.Vector3 {
  earthQuaternion(progress, _q)
  return surfacePointEarthLocal(27.3325, 88.6146, 30, out).applyQuaternion(_q)
}

/**
 * World-space focus pose hovering over a destination at its real elevation.
 * Used by the destination cinematic dive (Mode 3) and explorer.
 *
 * hoverM is metres ABOVE TERRAIN. The hover base uses the higher of the
 * destination's and the viewpoint's real DEM elevations, so the camera can
 * never end up below the surrounding relief.
 */
export function destinationFocusPose(
  progress: number,
  lat: number,
  lon: number,
  hoverM: number,
  outPosition: THREE.Vector3,
  outTarget: THREE.Vector3,
): void {
  earthQuaternion(progress, _q)
  const elevDest = getElevationMAtLatLon(lat, lon)
  // Vantage sits south-west of the target; use the higher of the two real
  // elevations as the base so the camera stays above intervening ridges.
  const vLat = lat - 0.05
  const vLon = lon - 0.04
  const elevView = getElevationMAtLatLon(vLat, vLon)
  const base = Math.max(elevDest, elevView)

  latLonToWorldEarthLocal(lat, lon, elevDest + 30, outTarget).applyQuaternion(_q)
  outPosition
    .copy(latLonToWorldEarthLocal(vLat, vLon, base + hoverM, _u))
    .applyQuaternion(_q)
}

/* ------------------------------------------------------------------ colors */

/** Hypsometric tint by absolute elevation (metres) — a Sikkim surface palette. */
function terrainColor(elev: number, col = new THREE.Color()): THREE.Color {
  if (elev < 1900) return col.set('#4d6b43') // subtropical valleys
  if (elev < 2800) return col.set('#576c46') // temperate forest
  if (elev < 3800) return col.set('#6b6a52') // upper forest / scrub
  if (elev < 5000) return col.set('#7a766b') // alpine rock
  if (elev < 6500) return col.set('#8f8f8a') // high rock / ice beginnings
  return col.set('#eef2f4') // permanent snow
}

/**
 * Build a real-DEM terrain patch over a bounding box as a sphere-conforming
 * grid (earth-group local frame). Vertex colours come from absolute elevation
 * (hypsometric) + slope shading; edges blend toward the fog tone so the
 * geographic boundary fades rather than ending in a hard seam.
 */
export function createTerrainPatchGeometry(
  bounds: { west: number; south: number; east: number; north: number },
  segments: number,
): THREE.BufferGeometry {
  const { west, south, east, north } = bounds
  const count = (segments + 1) * (segments + 1)
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)

  const dir = new THREE.Vector3()
  const col = new THREE.Color()
  const fog = new THREE.Color('#8fa9c4').convertSRGBToLinear()
  const RADIUS = EARTH_RADIUS

  let ptr = 0
  for (let iy = 0; iy <= segments; iy++) {
    const lat = north - (iy / segments) * (north - south)
    for (let ix = 0; ix <= segments; ix++) {
      const lon = west + (ix / segments) * (east - west)
      const elev = getElevationMAtLatLon(lat, lon)
      dir.copy(latLonToUnit(lat, lon)).multiplyScalar(RADIUS + elev * UNITS_PER_M)
      positions[ptr] = dir.x
      positions[ptr + 1] = dir.y
      positions[ptr + 2] = dir.z

      // Slope shading via finite-difference gradient in scene units.
      const de = 1 / segments
      const deLat = (north - south) * de
      const deLon = (east - west) * de
      const ep = getElevationMAtLatLon(lat, lon + deLon)
      const np = getElevationMAtLatLon(Math.min(north, lat + deLat), lon)
      const mPerLon = 111320 * Math.cos((lat * Math.PI) / 180) * deLon
      const mPerLat = 110540 * deLat
      const gx = ((ep - elev) * UNITS_PER_M) / (mPerLon * UNITS_PER_M)
      const gv = ((np - elev) * UNITS_PER_M) / (mPerLat * UNITS_PER_M)
      const slope = Math.min(1.4, Math.hypot(gx, gv))
      const shade = 0.72 + 0.28 * Math.exp(-slope * 0.6)

      terrainColor(elev, col).convertSRGBToLinear().multiplyScalar(shade)

      // Soft geographic boundary → fog.
      const edgeX = Math.min(ix, segments - ix) / (segments / 2)
      const edgeY = Math.min(iy, segments - iy) / (segments / 2)
      const edgeFactor = Math.min(1, Math.min(edgeX, edgeY) / 0.22)
      col.lerp(fog, 1 - edgeFactor)

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

/** A destination detail patch — a sub-box around a geographic point. */
export function destinationPatchBounds(lat: number, lon: number, halfDeg = 0.2): {
  west: number
  south: number
  east: number
  north: number
} {
  return { west: lon - halfDeg, south: lat - halfDeg, east: lon + halfDeg, north: lat + halfDeg }
}

