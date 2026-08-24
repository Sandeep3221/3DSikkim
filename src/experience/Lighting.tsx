import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { computeAnchor, makeAnchor, smoothRange, track } from '../systems/scroll/journey'
import { scrollState } from '../systems/scroll/scrollState'
import { lightingState } from './lightingState'
import { QUALITY } from '../systems/performance/quality'

/**
 * Coherent lighting system. One directional sun travels with the journey —
 * hard raking light in deep space, warm morning light over the mountains —
 * supported by ambient + hemisphere fill that rises as the atmosphere
 * thickens. Owns scene fog and background so space-to-sky blending stays in
 * one place and can never disagree with itself.
 */

const SPACE_SUN = new THREE.Vector3(-700, 180, 260)
const MOUNTAIN_SUN = new THREE.Vector3()
const ZERO = new THREE.Vector3()

const SUN_SPACE_COLOR = new THREE.Color('#f4f7ff')
const SUN_WARM_COLOR = new THREE.Color('#ffd9ae')
const FOG_NEAR_COLOR = new THREE.Color('#9db8d2')
const FOG_LATE_COLOR = new THREE.Color('#c9d2d6')
const BG_BLACK = new THREE.Color('#000000')

export default function Lighting() {
  const scene = useThree((s) => s.scene)
  const sunRef = useRef<THREE.DirectionalLight>(null)
  const ambientRef = useRef<THREE.AmbientLight>(null)
  const hemiRef = useRef<THREE.HemisphereLight>(null)

  const anchor = useMemo(makeAnchor, [])
  const sunTarget = useMemo(() => new THREE.Object3D(), [])
  const fog = useMemo(() => {
    const f = new THREE.FogExp2('#0a0e14', 0)
    scene.fog = f
    return f
  }, [scene])
  const background = useMemo(() => {
    const bg = new THREE.Color('#000000')
    scene.background = bg
    return bg
  }, [scene])

  useFrame((_state, delta) => {
    const dt = Math.min(delta, 0.1)
    const p = scrollState.progress
    computeAnchor(p, anchor)

    // Sun travel: deep-space position → low morning light anchored to the site.
    const blend = smoothRange(p, 0.35, 0.62)
    MOUNTAIN_SUN.copy(anchor.summit).addScaledVector(anchor.east, 260).addScaledVector(anchor.up, 130)
    const sun = sunRef.current
    if (sun) {
      sun.position.lerpVectors(SPACE_SUN, MOUNTAIN_SUN, blend)
      sunTarget.position.lerpVectors(ZERO, anchor.summit, blend)
      sunTarget.updateMatrixWorld()
      sun.intensity = track(p, [
        [0.0, 2.4],
        [0.32, 2.7],
        [0.62, 2.2],
        [1.0, 1.9],
      ])
      sun.color.lerpColors(SUN_SPACE_COLOR, SUN_WARM_COLOR, smoothRange(p, 0.5, 0.75))
    }

    if (ambientRef.current) {
      ambientRef.current.intensity = track(p, [
        [0.0, 0.06],
        [0.45, 0.09],
        [0.72, 0.3],
        [1.0, 0.42],
      ])
    }
    if (hemiRef.current) {
      hemiRef.current.intensity = track(p, [
        [0.45, 0.0],
        [0.75, 0.55],
        [1.0, 0.7],
      ])
    }

    // Atmosphere thickens into mountain haze; sky replaces space. During the
    // interactive-map phase the haze lifts again so the whole state reads.
    fog.density += (track(p, [
      [0.4, 0.00001],
      [0.56, 0.0045],
      [0.72, 0.0105],
      [0.86, 0.016],
      [0.95, 0.0075],
      [1.0, 0.0065],
    ]) - fog.density) * Math.min(1, dt * 8)
    fog.color.lerpColors(FOG_NEAR_COLOR, FOG_LATE_COLOR, smoothRange(p, 0.5, 0.9))
    background.lerpColors(BG_BLACK, FOG_LATE_COLOR, smoothRange(p, 0.46, 0.66))

    lightingState.sunDirWorld.copy(sun ? sun.position : SPACE_SUN).normalize()
  })

  return (
    <>
      <directionalLight
        ref={sunRef}
        target={sunTarget}
        castShadow={QUALITY.shadows}
        shadow-mapSize-width={QUALITY.shadowSize}
        shadow-mapSize-height={QUALITY.shadowSize}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={50}
        shadow-camera-far={700}
        shadow-bias={-0.0004}
        shadow-normalBias={0.6}
      />
      <ambientLight ref={ambientRef} color="#cfe0f5" />
      <hemisphereLight ref={hemiRef} color="#bcd6ee" groundColor="#5b5148" />
      <primitive object={sunTarget} />
    </>
  )
}
