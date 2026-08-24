import * as THREE from 'three'
import {
  EARTH_RADIUS,
  computeAnchor,
  makeAnchor,
  smooth,
  clamp01,
  earthQuaternion,
  type AnchorFrame,
} from '../scroll/journey'
import { GANGTOK_POINT, MAP_BASIS, mapCenterPoint } from '../../experience/sikkimRelief'

/**
 * World-space mirror of the map-frame constants. The earth group carries a
 * fixed yaw past p≈0.52 plus the axial tilt; these vectors apply that
 * rotation so the late keyframes (flight → arrival → map) are expressed in
 * true world coordinates. Refreshed on every evalCameraPose call.
 */
const G_WORLD = new THREE.Vector3()
const C_WORLD = new THREE.Vector3()
const MU_WORLD = new THREE.Vector3()
const ME_WORLD = new THREE.Vector3()
const MN_WORLD = new THREE.Vector3()
const _mq = new THREE.Quaternion()

function updateMapWorldPoints(progress: number): void {
  earthQuaternion(progress, _mq)
  G_WORLD.copy(GANGTOK_POINT).applyQuaternion(_mq)
  C_WORLD.copy(mapCenterPoint(0)).applyQuaternion(_mq)
  MU_WORLD.copy(MAP_BASIS.up).applyQuaternion(_mq)
  ME_WORLD.copy(MAP_BASIS.east).applyQuaternion(_mq)
  MN_WORLD.copy(MAP_BASIS.north).applyQuaternion(_mq)
}

/**
 * Camera choreography. A small ordered list of keyframes expressed either in
 * absolute world coordinates (space phases) or relative to the moving
 * Kangchenjunga anchor frame (surface phases). Interpolation is smoothstep
 * per key pair; the controller adds exponential damping on top so the motion
 * feels cinematic rather than mechanically attached to scroll.
 */

export interface CameraPose {
  position: THREE.Vector3
  target: THREE.Vector3
  fov: number
}

type Eval = (a: AnchorFrame, out: THREE.Vector3) => THREE.Vector3

interface Key {
  t: number
  fov: number
  position: Eval
  target: Eval
}

const KEYS: Key[] = [
  // SPACE — quiet, distant, Earth off-centre right.
  {
    t: 0.0,
    fov: 44,
    position: (_a, o) => o.set(-16, 26, 470),
    target: (_a, o) => o.set(-18, 4, 0),
  },
  // End of space — gentle drift inward.
  {
    t: 0.15,
    fov: 47,
    position: (_a, o) => o.set(-10, 14, 318),
    target: (_a, o) => o.set(-12, 2, 0),
  },
  // EARTH APPROACH — commit toward the subcontinent, still globe-scale.
  {
    t: 0.33,
    fov: 50,
    position: (a, o) =>
      o
        .copy(a.radial)
        .multiplyScalar(EARTH_RADIUS + 114)
        .addScaledVector(a.east, 24)
        .addScaledVector(a.north, 12),
    target: (a, o) => o.copy(a.radial).multiplyScalar(EARTH_RADIUS - 4),
  },
  // HIMALAYAN APPROACH — through the atmosphere, horizon curving away.
  {
    t: 0.5,
    fov: 48,
    position: (a, o) =>
      o
        .copy(a.radial)
        .multiplyScalar(EARTH_RADIUS + 27)
        .addScaledVector(a.east, 9)
        .addScaledVector(a.north, 5),
    target: (a, o) => o.copy(a.summit).addScaledVector(a.up, 0.2),
  },
  // HIMALAYAS / reveal begins — hover above the range.
  {
    t: 0.58,
    fov: 40,
    position: (a, o) =>
      o
        .copy(a.summit)
        .addScaledVector(a.up, 8.5)
        .addScaledVector(a.east, 7)
        .addScaledVector(a.north, -5),
    target: (a, o) => o.copy(a.summit).addScaledVector(a.up, 0.35),
  },
  // REVEAL climax — telephoto compression, swung to the west shoulder.
  {
    t: 0.7,
    fov: 36,
    position: (a, o) =>
      o
        .copy(a.summit)
        .addScaledVector(a.up, 4.6)
        .addScaledVector(a.east, -7.5)
        .addScaledVector(a.north, -6),
    target: (a, o) => o.copy(a.summit).addScaledVector(a.up, 0.45),
  },
  // MOUNTAIN FLIGHT — swing east over the ridge, gaining a little altitude.
  {
    t: 0.755,
    fov: 42,
    position: (a, o) =>
      o
        .copy(a.summit)
        .addScaledVector(a.up, 5.2)
        .addScaledVector(a.east, 11)
        .addScaledVector(a.north, -1),
    target: (a, o) => o.copy(a.summit).addScaledVector(a.east, 7).addScaledVector(a.up, 0.8),
  },
  // Flight — descend toward the valley floor, looking deeper into the range.
  {
    t: 0.81,
    fov: 44,
    position: (a, o) =>
      o
        .copy(a.summit)
        .addScaledVector(a.up, 3.4)
        .addScaledVector(a.east, 19)
        .addScaledVector(a.north, -5),
    target: (a, o) =>
      o.copy(a.summit).addScaledVector(a.east, 13).addScaledVector(a.north, -2).addScaledVector(a.up, 0.4),
  },
  // SIKKIM ARRIVAL — pull up and east, the state opening below.
  {
    t: 0.87,
    fov: 47,
    position: (_a, o) =>
      o
        .copy(G_WORLD)
        .addScaledVector(MU_WORLD, 4.6)
        .addScaledVector(ME_WORLD, 6)
        .addScaledVector(MN_WORLD, -7),
    target: (_a, o) => o.copy(G_WORLD).addScaledVector(MU_WORLD, 0.1),
  },
  // INTERACTIVE EXPERIENCE — full oblique over the relief map of Sikkim.
  {
    t: 0.93,
    fov: 46,
    position: (_a, o) =>
      o
        .copy(C_WORLD)
        .addScaledVector(MU_WORLD, 4.4)
        .addScaledVector(MN_WORLD, -2.4)
        .addScaledVector(ME_WORLD, 0.6),
    target: (_a, o) => o.copy(C_WORLD),
  },
  // Settle — calm, slightly closer; the map is now live and interactive.
  {
    t: 1.0,
    fov: 45,
    position: (_a, o) =>
      o
        .copy(C_WORLD)
        .addScaledVector(MU_WORLD, 3.4)
        .addScaledVector(MN_WORLD, -2.0)
        .addScaledVector(ME_WORLD, 0.4),
    target: (_a, o) => o.copy(C_WORLD).addScaledVector(MN_WORLD, 0.3),
  },
]

const ANCHOR = makeAnchor()
const _pa = new THREE.Vector3()
const _pb = new THREE.Vector3()
const _ta = new THREE.Vector3()
const _tb = new THREE.Vector3()

/** Evaluate the choreographed pose at master progress p. */
export function evalCameraPose(progress: number, out: CameraPose): CameraPose {
  const p = clamp01(progress)
  computeAnchor(p, ANCHOR)
  updateMapWorldPoints(p)

  let lo = KEYS[0]
  let hi = KEYS[KEYS.length - 1]
  for (let k = 0; k < KEYS.length - 1; k++) {
    if (p >= KEYS[k].t && p <= KEYS[k + 1].t) {
      lo = KEYS[k]
      hi = KEYS[k + 1]
      break
    }
  }

  const lt = smooth((p - lo.t) / Math.max(1e-5, hi.t - lo.t))

  lo.position(ANCHOR, _pa)
  hi.position(ANCHOR, _pb)
  out.position.lerpVectors(_pa, _pb, lt)

  lo.target(ANCHOR, _ta)
  hi.target(ANCHOR, _tb)
  out.target.lerpVectors(_ta, _tb, lt)

  out.fov = lo.fov + (hi.fov - lo.fov) * lt
  return out
}

/** Nearest rest pose — used to dampen travel under reduced-motion preference. */
export function nearestKey(progress: number): Key {
  const p = clamp01(progress)
  let best = KEYS[0]
  for (const k of KEYS) {
    if (Math.abs(k.t - p) < Math.abs(best.t - p)) best = k
  }
  return best
}
