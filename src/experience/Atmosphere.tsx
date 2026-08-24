import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { EARTH_RADIUS, smoothRange, track } from '../systems/scroll/journey'
import { scrollState } from '../systems/scroll/scrollState'
import { lightingState } from './lightingState'

/**
 * Atmospheric shell around Earth: an additive back-side fresnel halo plus a
 * subtle front-side limb haze. Photographic rather than neon — intensity is
 * keyed to the master progress so the atmosphere swells during approach and
 * dissolves as the camera enters it.
 */

const OUTER_RADIUS = EARTH_RADIUS * 1.045
const HAZE_RADIUS = EARTH_RADIUS * 1.012

const VERT = /* glsl */ `
  varying vec3 vNormalV;
  varying vec3 vViewDir;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormalV = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const HALO_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uSunDirView;
  uniform float uStrength;
  varying vec3 vNormalV;
  varying vec3 vViewDir;
  void main() {
    float rim = pow(clamp(0.62 - dot(vNormalV, vViewDir), 0.0, 1.2), 4.2);
    // Sun-side weighting keeps the glow photographic.
    float sun = clamp(dot(vNormalV, uSunDirView) * 0.6 + 0.55, 0.15, 1.0);
    gl_FragColor = vec4(uColor, 1.0) * rim * uStrength * sun;
  }
`

const HAZE_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uStrength;
  varying vec3 vNormalV;
  varying vec3 vViewDir;
  void main() {
    float fresnel = pow(1.0 - clamp(dot(vNormalV, vViewDir), 0.0, 1.0), 3.4);
    gl_FragColor = vec4(uColor, 1.0) * fresnel * uStrength;
  }
`

export default function Atmosphere() {
  const camera = useThree((s) => s.camera)
  const haloMat = useRef<THREE.ShaderMaterial>(null)
  const hazeMat = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      halo: {
        uColor: { value: new THREE.Color('#5a9fe0') },
        uSunDirView: { value: new THREE.Vector3(0, 0, 1) },
        uStrength: { value: 0.9 },
      },
      haze: {
        uColor: { value: new THREE.Color('#bcd8ff') },
        uStrength: { value: 0.35 },
      },
    }),
    [],
  )

  useFrame(() => {
    const p = scrollState.progress

    if (haloMat.current) {
      // Strong during the deep-space/approach phases; dissolves close-in.
      haloMat.current.uniforms.uStrength.value =
        track(p, [
          [0.0, 0.85],
          [0.32, 1.15],
          [0.52, 0.45],
          [0.72, 0.12],
          [1.0, 0.08],
        ]) * (1 - 0.55 * smoothRange(p, 0.75, 1))
    }
    if (hazeMat.current) {
      hazeMat.current.uniforms.uStrength.value = track(p, [
        [0.0, 0.28],
        [0.35, 0.5],
        [0.6, 0.22],
        [1.0, 0.14],
      ])
    }
    uniforms.halo.uSunDirView.value.copy(lightingState.sunDirWorld).transformDirection(camera.matrixWorldInverse)
  })

  return (
    <group>
      {/* Outer halo — back-side additive fresnel */}
      <mesh>
        <sphereGeometry args={[OUTER_RADIUS, 96, 48]} />
        <shaderMaterial
          ref={haloMat}
          vertexShader={VERT}
          fragmentShader={HALO_FRAG}
          uniforms={uniforms.halo}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </mesh>
      {/* Inner limb haze */}
      <mesh renderOrder={2}>
        <sphereGeometry args={[HAZE_RADIUS, 96, 48]} />
        <shaderMaterial
          ref={hazeMat}
          vertexShader={VERT}
          fragmentShader={HAZE_FRAG}
          uniforms={uniforms.haze}
          side={THREE.FrontSide}
          blending={THREE.AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
