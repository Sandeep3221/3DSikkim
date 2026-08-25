import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getUiState, setArrived, endDive, diveRuntime, useUiState } from '../systems/ui/uiStore'
import { DESTINATIONS } from '../data/destinations'
import { buildDiveStages, smooth as easeSmooth, type DiveStage } from '../systems/scroll/journey'
import { earthQuaternion, EARTH_RADIUS } from '../systems/scroll/journey'
import { surfacePointWorld, UNITS_PER_M } from './sikkimWorld'
import { scrollState } from '../systems/scroll/scrollState'

/**
 * Cinematic destination camera route (Mode 3).
 *
 * When a destination is selected during the interactive-explorer phase,
 * this component owns the camera for a time-based 8-stage dive:
 *   TARGET LOCK -> ORIENTATION -> REGIONAL APPROACH -> DESCENT
 *   -> TERRAIN APPROACH -> DESTINATION REVEAL -> ARRIVAL -> UI REVEAL
 *
 * Contract:
 *  - Time-based, never scroll-driven; never fights the master timeline.
 *  - CameraController yields while ui.diving is true.
 *  - OrbitControls are unmounted while diving.
 *  - Progress is written to imperative diveRuntime (never React state).
 */

const DIVE_TOTAL = 4.6 // seconds
const MAX_ALT_SCENE = 6 // safety clamp on camera altitude in scene units

// Module scratch — no per-frame allocations.
const _origin = new THREE.Vector3()
const _invQ = new THREE.Quaternion()
const _q = new THREE.Quaternion()
const _pos = new THREE.Vector3()
const _tgt = new THREE.Vector3()
const _upW = new THREE.Vector3()
const _path = new THREE.Vector3()

export default function DestinationCameraRoute() {
  const { camera, clock } = useThree()
  const { selectedId, mapActive } = useUiState()

  const stagesRef = useRef<DiveStage[] | null>(null)
  const originSurfRef = useRef(new THREE.Vector3())
  const destSurfRef = useRef(new THREE.Vector3())
  const startTimeRef = useRef(0)
  const activeIdRef = useRef<string | null>(null)
  const loggedRef = useRef(0)

  // Rebuild the route whenever a new dive begins. Keyed on selection so it
  // actually fires (the previous [camera, clock] deps meant it ran once at
  // mount when diving was false, and the route was never built).
  useEffect(() => {
    if (!selectedId || !mapActive) {
      stagesRef.current = null
      activeIdRef.current = null
      return
    }
    if (selectedId === activeIdRef.current && stagesRef.current) return

    const dest = DESTINATIONS.find((d) => d.id === selectedId)
    if (!dest) return

    stagesRef.current = buildRoute(
      scrollState.progress,
      camera,
      { lat: dest.coords.lat, lon: dest.coords.lon, elevationM: dest.elevationM },
      originSurfRef.current,
      destSurfRef.current,
    )
    activeIdRef.current = selectedId
    startTimeRef.current = clock.elapsedTime
    diveRuntime.progress = 0
    loggedRef.current = 0
    if (import.meta.env.DEV) {
      console.info(`[DestinationDive] selected: ${dest.name}`)
    }
  }, [selectedId, mapActive, camera, clock])

  useFrame(() => {
    const ui = getUiState()
    const stages = stagesRef.current
    if (!ui.diving || !ui.selectedId || !stages) return
    const dest = DESTINATIONS.find((d) => d.id === ui.selectedId)
    if (!dest) {
      endDive()
      return
    }

    const elapsed = clock.elapsedTime - startTimeRef.current
    const t = Math.min(1, Math.max(0, elapsed / DIVE_TOTAL))
    diveRuntime.progress = t

    if (import.meta.env.DEV && t >= loggedRef.current + 0.25) {
      loggedRef.current = Math.floor(t / 0.25) * 0.25
      console.info(`[DestinationDive] progress: ${loggedRef.current.toFixed(2)}`)
    }

    if (t >= 1) {
      setArrived(true)
      endDive()
      stagesRef.current = null
      if (import.meta.env.DEV) console.info('[DestinationDive] ARRIVED')
      return
    }

    // Find surrounding stages and interpolate within the segment.
    const segIdx = Math.min(stages.length - 2, Math.floor(t * (stages.length - 1)))
    const segA = stages[segIdx]
    const segB = stages[segIdx + 1]
    const raw = (t - segA.t) / Math.max(1e-6, segB.t - segA.t)
    const s = easeSmooth(raw)

    const altM = segA.altitudeM + (segB.altitudeM - segA.altitudeM) * s
    const frac = segA.fraction + (segB.fraction - segA.fraction) * s
    const fov = segA.fov + (segB.fov - segA.fov) * s

    // Path point between origin surface and destination surface (world space).
    earthQuaternion(scrollState.progress, _q)
    _path.lerpVectors(originSurfRef.current, destSurfRef.current, frac)
    _upW.copy(_path).normalize() // world-space up at this point
    const altScene = Math.min(altM * UNITS_PER_M, MAX_ALT_SCENE)
    _pos.copy(_path).addScaledVector(_upW, altScene)

    // Look target converges onto the destination surface.
    _tgt.copy(destSurfRef.current).addScaledVector(_upW, 0.01)

    camera.position.lerp(_pos, 0.12)
    camera.lookAt(_tgt)
    const pc = camera as THREE.PerspectiveCamera
    pc.fov += (fov - pc.fov) * 0.08
    pc.updateProjectionMatrix()
  })

  return null
}

/** Build the 8-stage dive curve from the current camera pose to the destination. */
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

  // Surface point directly below the camera (earth-local → back to world).
  originSurfOut
    .copy(_origin)
    .normalize()
    .multiplyScalar(EARTH_RADIUS)
    .applyQuaternion(_q)
  const originAltM = Math.max((_origin.length() - EARTH_RADIUS) / UNITS_PER_M, dest.elevationM + 200)

  // Destination surface point at its real elevation (+30 m clearance).
  surfacePointWorld(progress, dest.lat, dest.lon, dest.elevationM + 30, destSurfOut)

  return buildDiveStages(dest.elevationM, originAltM)
}
