/**
 * Device quality tiers. Detected once at startup; drives DPR, geometry
 * complexity, shadows, particle counts and cloud density so the visual
 * story stays intact across desktop / laptop / tablet / mobile.
 */

export interface Quality {
  tier: 'high' | 'medium' | 'low'
  dpr: number
  antialias: boolean
  shadows: boolean
  shadowSize: number
  /** SphereGeometry segments for Earth. */
  sphereSegs: number
  /** Grid resolution of the main Himalayan terrain patch. */
  terrainSegs: number
  /** Grid resolution of flanking mountain patches. */
  mountainSegs: number
  starCount: number
  peakClouds: number
}

function detect(): Quality {
  if (typeof window === 'undefined') {
    return {
      tier: 'medium',
      dpr: 1.5,
      antialias: true,
      shadows: false,
      shadowSize: 1024,
      sphereSegs: 96,
      terrainSegs: 176,
      mountainSegs: 72,
      starCount: 1800,
      peakClouds: 6,
    }
  }

  const coarse = window.matchMedia('(pointer: coarse)').matches
  const smallScreen = Math.min(window.screen.width, window.screen.height) < 768
  const mobile = coarse && smallScreen
  const cores = navigator.hardwareConcurrency ?? 4
  const dprCap = window.devicePixelRatio || 1

  if (mobile || cores <= 4) {
    return {
      tier: 'low',
      dpr: Math.min(dprCap, 1.5),
      antialias: true,
      shadows: false,
      shadowSize: 1024,
      sphereSegs: 64,
      terrainSegs: 128,
      mountainSegs: 56,
      starCount: 1100,
      peakClouds: 5,
    }
  }

  if (cores <= 8) {
    return {
      tier: 'medium',
      dpr: Math.min(dprCap, 1.75),
      antialias: true,
      shadows: true,
      shadowSize: 1024,
      sphereSegs: 96,
      terrainSegs: 176,
      mountainSegs: 72,
      starCount: 1800,
      peakClouds: 7,
    }
  }

  return {
    tier: 'high',
    dpr: Math.min(dprCap, 2),
    antialias: true,
    shadows: true,
    shadowSize: 2048,
    sphereSegs: 128,
    terrainSegs: 240,
    mountainSegs: 88,
    starCount: 2600,
    peakClouds: 8,
  }
}

export const QUALITY: Quality = detect()
