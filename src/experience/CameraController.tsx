import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { evalCameraPose, nearestKey, type CameraPose } from '../systems/camera/cameraPath'
import { scrollState } from '../systems/scroll/scrollState'
import { prefersReducedMotion } from '../systems/performance/motion'
import {
  worldToEarthLocal,
  earthLocalToWorld,
  EAST_LOCAL,
  NORTH_LOCAL,
  SITE_CENTER,
  EARTH_RADIUS,
} from '../systems/scroll/journey'
import { heightAt, PATCH_HALF } from './terrainField'
import { getUiState } from '../systems/ui/uiStore'
import { DESTINATIONS } from '../data/destinations'
import { destinationFocusPose } from './sikkimWorld'

/**
 * Applies the choreographed camera pose with exponential damping so motion
 * feels cinematic rather than mechanically bound to scroll. Also keeps the
 * camera above the terrain surface (shared heightfield), blends toward a
 * selected destination's focus pose in the interactive-map phase, and honours
 * reduced motion by collapsing travel toward rest compositions.
 */

const desired: CameraPose = {
  position: new THREE.Vector3(),
  target: new THREE.Vector3(),
  fov: 50,
}
const rest: CameraPose = {
  position: new THREE.Vector3(),
  target: new THREE.Vector3(),
  fov: 50,
}
const focus: CameraPose = {
  position: new THREE.Vector3(),
  target: new THREE.Vector3(),
  fov: 40,
}
const lookSmoothed = new THREE.Vector3()
const _local = new THREE.Vector3()
const _rel = new THREE.Vector3()

let focusWeight = 0

function clampAboveTerrain(camera: THREE.Camera, p: number): void {
  // Journey-scale procedural clamp only. The real DEM world (map phase) has
  // its own terrain-safe hover altitudes; the procedural heightfield's frame
  // is invalid there, so the clamp must not fight the dive/explorer camera.
  if (p < 0.5 || p > 0.84) return
  worldToEarthLocal(p, _local.copy(camera.position))
  const alt = _local.length()
  const relU = _rel.copy(_local).sub(SITE_CENTER).dot(EAST_LOCAL)
  const relV = _rel.dot(NORTH_LOCAL)
  const d = Math.hypot(relU, relV)
  // Only clamp against the journey-scale patches; the Sikkim relief map is
  // low relief and handled by its own generous hover altitude.
  const minY =
    d < PATCH_HALF + 8 ? EARTH_RADIUS + heightAt(relU, relV) + 0.7 : EARTH_RADIUS + 0.9
  if (alt < minY && focusWeight < 0.9) {
    _local.multiplyScalar(minY / alt)
    earthLocalToWorld(p, _local)
    camera.position.copy(_local)
  }
}

export default function CameraController() {
  const camera = useThree((s) => s.camera)
  // Per-mount state: a fresh journey (route re-entry) must snap to its
  // opening composition instead of inheriting stale module state.
  const initialised = useRef(false)

  useEffect(() => {
    return () => {
      initialised.current = false
      focusWeight = 0
    }
  }, [])

    useFrame((_state, delta) => {
    const dt = Math.min(delta, 0.1)
    const p = scrollState.progress
    const rm = prefersReducedMotion()
    const ui = getUiState()

    // When a cinematic dive is active, the DestinationCameraRoute component
    // owns the camera — the scroll-driven choreography must not fight it.
    if (ui.diving) return

    evalCameraPose(p, desired)

    if (rm) {
      // Collapse most of the travel toward the nearest composed rest pose —
      // the story still advances, but movement stays minimal and gentle.
      const key = nearestKey(p)
      evalCameraPose(key.t, rest)
      desired.position.lerp(rest.position, 0.65)
      desired.target.lerp(rest.target, 0.65)
    }

        // Interactive destination focus (map phase only, not while diving).
    const selected = ui.selectedId
    const targetWeight = p > 0.9 && selected && !ui.diving ? 1 : 0
    focusWeight += (targetWeight - focusWeight) * (1 - Math.exp(-2.6 * dt))
    if (focusWeight > 0.001 && selected) {
      const dest = DESTINATIONS.find((d) => d.id === selected)
      if (dest) {
                destinationFocusPose(p, dest.coords.lat, dest.coords.lon, 600, focus.position, focus.target)
        desired.position.lerp(focus.position, focusWeight)
        desired.target.lerp(focus.target, focusWeight)
        desired.fov += (40 - desired.fov) * focusWeight
      }
    }

    if (!initialised.current) {
      camera.position.copy(desired.position)
      lookSmoothed.copy(desired.target)
      ;(camera as THREE.PerspectiveCamera).fov = desired.fov
      initialised.current = true
    } else {
      const a = 1 - Math.exp(-(rm ? 1.4 : 3.2) * dt)
      camera.position.lerp(desired.position, a)
      lookSmoothed.lerp(desired.target, a)
    }

    clampAboveTerrain(camera, p)
    camera.lookAt(lookSmoothed)

    const pc2 = camera as THREE.PerspectiveCamera
    if (Math.abs(pc2.fov - desired.fov) > 0.01) {
      pc2.fov += (desired.fov - pc2.fov) * (1 - Math.exp(-3.2 * dt))
      pc2.updateProjectionMatrix()
    }
  })

  return null
}
