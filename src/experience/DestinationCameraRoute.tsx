import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { getUiState, setArrived, setDiveProgress, endDive } from '../systems/ui/uiStore'
import { DESTINATIONS } from '../data/destinations'
import { buildDiveStages, type DiveStage } from '../systems/scroll/journey'
import {
  surfacePointWorld,
  earthQuaternion,
  UNITS_PER_M,
  EARTH_RADIUS,
} from './sikkimWorld'
import { scrollState } from '../systems/scroll/scrollState'

/**
 * Cinematic destination camera route (Mode 3).
 *
 * When uiStore.selectedId is set AND the journey has resolved into the
 * interactive-experience phase (scroll progress >= 0.92), this component
 * takes over the camera and performs the 8-stage dive:
 *   TARGET LOCK → ORIENTATION → REGIONAL APPROACH → DESCENT
 *   → TERRAIN APPROACH → DESTINATION REVEAL → ARRIVAL → UI REVEAL
 *
 * Time-based (dt), not scroll-driven, so it does NOT fight the master
 * scroll progress. OrbitControls are disabled while diving and re-enabled
 * on arrival / return.
 */

const DIVE_TOTAL = 4.6 // seconds for a full dive
const _origin = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _invQ = new THREE.Quaternion()
const _pos = new THREE.Vector3()
const _tgt = new THREE.Vector3()
const _upW = new THREE.Vector3()

function smoothStep(t: number): number {
  const c = Math.max(0, Math.min(1, t))
  return c * c * (3 - 2 * c)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Build the 8-stage cinematic dive curve from current pose to destination. */
function buildRoute(
  progress: number,
  camera: THREE.Camera,
  dest: { lat: number; lon: number; elevationM: number },
  originSurfOut: THREE.Vector3,
  destSurfOut: THREE.Vector3,
): DiveStage[] {
  camera.getWorldPosition(_origin)
  earthQuaternion(progress, _q)
  _invQ.copy(_q).invert()
  _origin.applyQuaternion(_invQ)

  const camDist = _origin.length()
  originSurfOut.copy(_origin).normalize().multiplyScalar(EARTH_RADIUS).applyQuaternion(_q)
  const originAltM = Math.max((camDist - EARTH_RADIUS) / UNITS_PER_M, dest.elevationM + 100)
  surfacePointWorld(progress, dest.lat, dest.lon, dest.elevationM + 30, destSurfOut)
  return buildDiveStages(dest.elevationM, originAltM)
}

export default function DestinationCameraRoute() {
  const { camera, clock } = useThree()
  const stagesRef = useRef<DiveStage[] | null>(null)
  const originSurfRef = useRef(new THREE.Vector3())
  const destSurfRef = useRef(new THREE.Vector3())
  const startTimeRef = useRef(0)

  // Build the route once when a dive begins.
  useEffect(() => {
    const { selectedId, diving, mapActive } = getUiState()
    if (!diving || !selectedId || !mapActive) {
      stagesRef.current = null
      return
    }

    const dest = DESTINATIONS.find((d) => d.id === selectedId)
    if (!dest) {
      endDive()
      setArrived(false)
      return
    }

    const p = scrollState.progress
    stagesRef.current = buildRoute(
      p,
      camera,
      { lat: dest.coords.lat, lon: dest.coords.lon, elevationM: dest.elevationM },
      originSurfRef.current,
      destSurfRef.current,
    )
    startTimeRef.current = clock.elapsedTime
  }, [camera, clock])

  useFrame(() => {
    const ui = getUiState()
    if (!ui.diving || !ui.selectedId || !stagesRef.current) return

    const stages = stagesRef.current
    const dest = DESTINATIONS.find((d) => d.id === ui.selectedId)
    if (!dest) {
      endDive()
      return
    }

    const elapsed = clock.elapsedTime - startTimeRef.current
    const t = Math.min(1, elapsed / DIVE_TOTAL)
    setDiveProgress(t)

    if (t >= 1) {
      setArrived(true)
      endDive()
      // Snap to the arrival viewpoint.
      const p = scrollState.progress
      earthQuaternion(p, _q)
      surfacePointWorld(p, dest.coords.lat, dest.coords.lon, dest.elevationM + 30, _pos)
      const upW = _pos.clone().normalize().applyQuaternion(_q)
      _pos.addScaledVector(upW, 0.02)

      camera.position.copy(_pos)
      _tgt.copy(_pos).addScaledVector(upW, 0.01)
      camera.lookAt(_tgt)
      const pc = camera as THREE.PerspectiveCamera
      pc.fov = 40
      pc.updateProjectionMatrix()
      return
    }

    // Find surrounding stages and interpolate.
    const segIdx = Math.floor(t * (stages.length - 1))
    const segA = stages[segIdx]
    const segB = stages[Math.min(segIdx + 1, stages.length - 1)]
    const segT = (t - segA.t) / (segB.t - segA.t + 1e-9)
    const s = smoothStep(Math.max(0, Math.min(1, segT)))

    const alt = lerp(segA.altitudeM, segB.altitudeM, s)
    const frac = lerp(segA.fraction, segB.fraction, s)
    const fov = lerp(segA.fov, segB.fov, s)

    // Position along origin→destination path at the current altitude.
    const p = scrollState.progress
    earthQuaternion(p, _q)
    const upW = originSurfRef.current.clone().lerp(destSurfRef.current, frac).normalize().applyQuaternion(_q)
    const altScene = Math.min(alt, 2.0) * UNITS_PER_M
    _pos
      .copy(originSurfRef.current)
      .lerp(destSurfRef.current, frac)
      .addScaledVector(upW, altScene)

    // Target: converge on the destination surface.
    _tgt
      .copy(destSurfRef.current)
      .addScaledVector(upW, Math.max(0.2, altScene * 0.05))

    camera.position.lerp(_pos, 0.15)
    camera.lookAt(_tgt)
    const pc = camera as THREE.PerspectiveCamera
    pc.fov = lerp(pc.fov, fov, 0.1)
    pc.updateProjectionMatrix()
  })

  return null
}
