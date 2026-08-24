import { useTexture } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { EARTH_RADIUS } from '../systems/scroll/journey'
import { QUALITY } from '../systems/performance/quality'

/**
 * Photographic Earth — NASA Blue Marble imagery with topology bump and an
 * ocean specular mask, lit by the journey's single directional sun.
 *
 * ASSET INTERFACE: swap the URLs below for higher-resolution textures
 * (e.g. 8K Blue Marble Next Generation) without touching any other code.
 */
const DAY_URL = '/assets/textures/earth/day.jpg'
const BUMP_URL = '/assets/textures/earth/bump.png'
const WATER_URL = '/assets/textures/earth/water.png'

export default function Earth() {
  const [day, bump, water] = useTexture([DAY_URL, BUMP_URL, WATER_URL])

  useMemo(() => {
    day.colorSpace = THREE.SRGBColorSpace
    day.anisotropy = Math.min(8, QUALITY.tier === 'high' ? 8 : 4)
    bump.anisotropy = 2
    water.anisotropy = 2
  }, [day, bump, water])

  return (
    <mesh>
      <sphereGeometry args={[EARTH_RADIUS, QUALITY.sphereSegs, QUALITY.sphereSegs / 2]} />
      <meshStandardMaterial
        map={day}
        bumpMap={bump}
        bumpScale={0.6}
        metalnessMap={water}
        metalness={0.35}
        roughness={0.68}
      />
    </mesh>
  )
}
