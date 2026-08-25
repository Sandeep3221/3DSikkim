import * as THREE from 'three'

/**
 * Master journey definitions: geographic constants for the Kangchenjunga
 * site, timeline segments, scalar animation tracks and the deterministic
 * Earth rotation that keeps the planet surface locked to the camera path
 * throughout the cinematic sequence.
 */

export const EARTH_RADIUS = 100
export const AXIAL_TILT = THREE.MathUtils.degToRad(23.4)
export const UP_Y = new THREE.Vector3(0, 1, 0)

/** Kangchenjunga summit — 27°42'09"N 88°08'51"E */
export const SITE = { lat: 27.7025, lon: 88.1475 } as const

/** Tangent-plane offset of the hero summit inside the main terrain patch (scene units). */
export const HERO_OFFSET = { x: -4.0, y: 2.5 }
/** Exaggerated cinematic relief of the hero peak, in scene units. */
export const HERO_HEIGHT = 1.32

const DEG = Math.PI / 180

/** Lat/lon → unit vector matching the equirectangular UVs of three.js SphereGeometry. */
export function latLonToUnit(lat: number, lon: number, out = new THREE.Vector3()): THREE.Vector3 {
  const phi = (90 - lat) * DEG
  const theta = (lon + 180) * DEG
  return out.set(
    -Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta),
  )
}

/** Surface centre of the main terrain patch, earth-group local frame. */
export const SITE_CENTER = latLonToUnit(SITE.lat, SITE.lon).multiplyScalar(EARTH_RADIUS)
/** Unit radial direction at the site, earth-group local frame. */
export const SITE_RADIAL = latLonToUnit(SITE.lat, SITE.lon)

const EPS = 0.5

export const NORTH_LOCAL = latLonToUnit(SITE.lat + EPS, SITE.lon)
  .sub(latLonToUnit(SITE.lat - EPS, SITE.lon))
  .normalize()
export const EAST_LOCAL = new THREE.Vector3().crossVectors(NORTH_LOCAL, SITE_RADIAL).normalize()

/** Hero summit position in the earth-group local frame. */
export const SUMMIT_LOCAL = SITE_RADIAL.clone()
  .multiplyScalar(EARTH_RADIUS)
  .addScaledVector(EAST_LOCAL, HERO_OFFSET.x)
  .addScaledVector(NORTH_LOCAL, HERO_OFFSET.y)
  .normalize()
  .multiplyScalar(EARTH_RADIUS + HERO_HEIGHT)

export interface PatchBasis {
  center: THREE.Vector3
  east: THREE.Vector3
  north: THREE.Vector3
  up: THREE.Vector3
}

/** Local tangent basis at the journey site — used by every terrain patch. */
export function makeSiteBasis(): PatchBasis {
  return {
    center: SITE_CENTER.clone(),
    east: EAST_LOCAL.clone(),
    north: NORTH_LOCAL.clone(),
    up: SITE_RADIAL.clone(),
  }
}

/* ------------------------------ master timeline ------------------------------ */

export interface JourneySegment {
  id: string
  label: string
  start: number
  end: number
}

export const SEGMENTS: JourneySegment[] = [
  { id: 'space', label: 'ORBIT', start: 0.0, end: 0.15 },
  { id: 'approach', label: 'APPROACH', start: 0.15, end: 0.35 },
  { id: 'himalayas', label: 'THE HIMALAYA', start: 0.35, end: 0.55 },
  { id: 'reveal', label: 'KANCHENJUNGA', start: 0.55, end: 0.7 },
  { id: 'flight', label: 'MOUNTAIN FLIGHT', start: 0.7, end: 0.85 },
  { id: 'arrival', label: 'SIKKIM', start: 0.85, end: 0.92 },
  { id: 'experience', label: 'THE EXPERIENCE', start: 0.92, end: 1.0 },
]

/* ------------------------------------------------------------------ */
/* Destination cinematic dive stages. These are TIME-based, not scroll  */
/* driven — they activate when uiStore.selectedId is set and the        */
/* destination camera route takes over from the scroll-progress camera.  */
/* ------------------------------------------------------------------ */

export interface DiveStage {
  /** Normalized time within the dive (0 → 1). */
  t: number
  /** Camera FOV at this moment. */
  fov: number
  /** Meter altitude above the destination surface. */
  altitudeM: number
  /** Fraction [0,1] of the way from origin to destination. */
  fraction: number
  /** Label shown during this stage. */
  label?: string
}

/**
 * Build the 8-stage cinematic dive curve for a destination.
 * Each stage corresponds to the camera route architecture:
 *   A. TARGET LOCK → B. ORIENTATION → C. REGIONAL APPROACH
 *   → D. DESCENT → E. TERRAIN APPROACH → F. DESTINATION REVEAL
 *   → G. ARRIVAL → H. UI REVEAL
 */
export function buildDiveStages(altitudeM: number, originAltM: number): DiveStage[] {
  // Early stages hold the true origin altitude so the dive begins from
  // exactly where the explorer camera is — no jolt.
  return [
    // A. TARGET LOCK — lock onto the destination
    { t: 0.0, fov: 46, altitudeM: originAltM, fraction: 0.0 },
    // B. ORIENTATION — orient the camera toward the destination
    { t: 0.08, fov: 44, altitudeM: originAltM, fraction: 0.05 },
    // C. REGIONAL APPROACH — begin closing distance regionally
    { t: 0.18, fov: 42, altitudeM: lerpAlt(originAltM, altitudeM * 3.2, 0.35), fraction: 0.18 },
    // D. DESCENT — descend through the terrain
    { t: 0.32, fov: 40, altitudeM: lerpAlt(originAltM, altitudeM * 2.4, 0.7), fraction: 0.42 },
    // E. TERRAIN APPROACH — get close to the terrain
    { t: 0.48, fov: 38, altitudeM: altitudeM * 1.9, fraction: 0.68 },
    // F. DESTINATION REVEAL — reveal the destination
    {
      t: 0.68,
      fov: 36,
      altitudeM: altitudeM * 1.6,
      fraction: 0.9,
      label: 'DESTINATION REVEAL',
    },
    // G. ARRIVAL — settle into the final viewpoint
    {
      t: 0.85,
      fov: 40,
      altitudeM: altitudeM,
      fraction: 1.0,
      label: 'ARRIVAL',
    },
    // H. UI REVEAL — reveal destination information
    {
      t: 1.0,
      fov: 40,
      altitudeM: altitudeM,
      fraction: 1.0,
      label: 'UI REVEAL',
    },
  ]
}

function lerpAlt(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)

/** Hermite smoothstep on 0→1. */
export const smooth = (x: number): number => {
  const t = clamp01(x)
  return t * t * (3 - 2 * t)
}

/** Smoothstep between a→b evaluated at x. */
export const smoothRange = (x: number, a: number, b: number): number => smooth((x - a) / (b - a))

export function segmentAt(p: number): { index: number; segment: JourneySegment } {
  const prog = clamp01(p)
  for (let i = 0; i < SEGMENTS.length; i++) {
    const s = SEGMENTS[i]
    if (prog < s.end || i === SEGMENTS.length - 1) return { index: i, segment: s }
  }
  return { index: SEGMENTS.length - 1, segment: SEGMENTS[SEGMENTS.length - 1] }
}

/**
 * Multi-stop scalar animation track with smoothstep easing between stops.
 * The single declarative primitive used to key fog, light, opacity, etc.
 * against the master progress.
 */
export function track(p: number, stops: ReadonlyArray<readonly [number, number]>): number {
  if (p <= stops[0][0]) return stops[0][1]
  for (let i = 1; i < stops.length; i++) {
    if (p <= stops[i][0]) {
      const [t0, v0] = stops[i - 1]
      const [t1, v1] = stops[i]
      return v0 + (v1 - v0) * smoothRange(p, t0, t1)
    }
  }
  return stops[stops.length - 1][1]
}

/* ------------------------ deterministic planet rotation ---------------------- */

const TILT_QUAT = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, AXIAL_TILT))
/** Axial tilt quaternion applied to the whole earth group (world frame). */
export const EARTH_TILT_QUAT = TILT_QUAT.clone()

// Solve the yaw that brings the summit under its arrival direction exactly as
// the camera completes the approach, then let the planet drift slowly during
// the space phases. Deterministic ⇒ terrain, clouds and camera always agree.
const ARRIVAL_DIR = new THREE.Vector3(0.05, 0.38, 0.92).normalize()
const arrivalLocal = ARRIVAL_DIR.clone().applyQuaternion(TILT_QUAT.clone().invert())
const PHI_SITE = Math.atan2(SITE_RADIAL.x, SITE_RADIAL.z)
const PHI_ARRIVAL = Math.atan2(arrivalLocal.x, arrivalLocal.z)
const YAW_END = PHI_ARRIVAL - PHI_SITE
const DRIFT = 0.55 // radians of slow natural spin across the approach

export function earthYaw(progress: number): number {
  return YAW_END - DRIFT * (1 - smoothRange(progress, 0, 0.52))
}

const _yawQ = new THREE.Quaternion()

export function earthQuaternion(progress: number, out = new THREE.Quaternion()): THREE.Quaternion {
  return out.setFromAxisAngle(UP_Y, earthYaw(progress)).premultiply(TILT_QUAT)
}

/** Transform a point from earth-group local space to world space. */
export function earthLocalToWorld(progress: number, v: THREE.Vector3): THREE.Vector3 {
  return v.applyQuaternion(earthQuaternion(progress, _yawQ))
}

const _invQ = new THREE.Quaternion()

/** Transform a point from world space to earth-group local space. */
export function worldToEarthLocal(progress: number, v: THREE.Vector3): THREE.Vector3 {
  earthQuaternion(progress, _yawQ)
  return v.applyQuaternion(_invQ.copy(_yawQ).invert())
}


/* -------------------------------- anchor frame ------------------------------- */

export interface AnchorFrame {
  /** Hero summit world position. */
  summit: THREE.Vector3
  /** Surface normal (up) at the site. */
  up: THREE.Vector3
  east: THREE.Vector3
  north: THREE.Vector3
  /** Radial direction at the patch centre (no hero offset). */
  radial: THREE.Vector3
}

export function makeAnchor(): AnchorFrame {
  return {
    summit: new THREE.Vector3(),
    up: new THREE.Vector3(),
    east: new THREE.Vector3(),
    north: new THREE.Vector3(),
    radial: new THREE.Vector3(),
  }
}

const _aq = new THREE.Quaternion()

export function computeAnchor(progress: number, out: AnchorFrame): AnchorFrame {
  earthQuaternion(progress, _aq)
  out.summit.copy(SUMMIT_LOCAL).applyQuaternion(_aq)
  out.up.copy(SUMMIT_LOCAL).normalize().applyQuaternion(_aq)
  out.radial.copy(SITE_RADIAL).applyQuaternion(_aq)
  out.east.copy(EAST_LOCAL).applyQuaternion(_aq)
  out.north.copy(NORTH_LOCAL).applyQuaternion(_aq)
  return out
}
