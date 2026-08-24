/**
 * Deterministic hash-based value noise + fbm + ridged multifractal.
 * No dependencies; stable across sessions so terrain, camera collision and
 * colours all agree without shared state.
 */

function hash(ix: number, iy: number): number {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10)

export function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const a = hash(ix, iy)
  const b = hash(ix + 1, iy)
  const c = hash(ix, iy + 1)
  const d = hash(ix + 1, iy + 1)
  const ux = fade(fx)
  const uy = fade(fy)
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
}

export function fbm(x: number, y: number, octaves: number): number {
  let sum = 0
  let amp = 0.5
  let norm = 0
  let fx = x
  let fy = y
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(fx, fy) * amp
    norm += amp
    amp *= 0.5
    fx *= 2
    fy *= 2
  }
  return sum / norm
}

/** Ridged multifractal in ~[0,1] — produces sharp mountain crests. */
export function ridged(x: number, y: number, octaves: number): number {
  let sum = 0
  let amp = 0.55
  let norm = 0
  let fx = x
  let fy = y
  for (let i = 0; i < octaves; i++) {
    const n = valueNoise(fx, fy)
    const r = 1 - Math.abs(2 * n - 1)
    sum += r * r * amp
    norm += amp
    amp *= 0.5
    fx *= 2.1
    fy *= 2.1
  }
  return sum / norm
}
