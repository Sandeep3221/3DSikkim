#!/usr/bin/env node
/**
 * build-sikkim-dem.mjs
 * ---------------------------------------------------------------------------
 * Reproducible terrain pipeline for real Sikkim elevation data.
 *
 * Source : Copernicus DEM GLO-30 (30 m) — hosted on Registry of Open Data on
 *          AWS (copernicus-dem-30m bucket), ESA/Copernicus programme.
 * License: CC BY 4.0 (attribution required; see documentation/DATA_SOURCES.md).
 *
 * Pipeline:
 *   Elevation tiles (1° GeoTIFF COGs)
 *     → merge into the Sikkim bounding box at a chosen grid resolution
 *     → write public/assets/terrain/sikkim.dem.bin (Uint16, meters) + .json
 *
 * Run:  npm run build:terrain
 *       (tiles are cached in ./terrain-cache and only re-downloaded if absent)
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFile, writeFile } from 'node:fs/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const CACHE = path.join(ROOT, 'terrain-cache')
const OUT_DIR = path.join(ROOT, 'public', 'assets', 'terrain')

/* ------------------------------------------------------------------ source */
const USER_AGENT = '3dsikkim-terrain-pipeline/0.1 (open-data DEM import)'
const TILES = [
  { key: 'N27_E088_DEM', lat0: 27, lon0: 88 },
  { key: 'N28_E088_DEM', lat0: 28, lon0: 88 },
]

const TILE_URL = (key) =>
  `https://copernicus-dem-30m.s3.amazonaws.com/${key}/${key}.tif`

/* ----------------------------------------------------------------- bounds */
/** Natural margin around the state; fully covered by the two tiles. */
const BOUNDS = { west: 88.0, south: 27.0, east: 89.0, north: 28.5 }

/** Output grid size (width in pixels across the longitude span). */
const WIDTH = 1536
const HEIGHT = Math.round((WIDTH * (BOUNDS.north - BOUNDS.south)) / (BOUNDS.east - BOUNDS.west))

await fs.mkdir(CACHE, { recursive: true })
await fs.mkdir(OUT_DIR, { recursive: true })

/* --------------------------------------------------------------- download */
async function ensureTile(tile) {
  const file = path.join(CACHE, `${tile.key}.tif`)
  try {
    await fs.access(file)
    return file
  } catch {
    const res = await fetch(TILE_URL(tile.key), {
      headers: { 'User-Agent': USER_AGENT },
    })
    if (!res.ok) throw new Error(`Download failed (${res.status}) for ${tile.key}`)
    const buf = Buffer.from(await res.arrayBuffer())
    await fs.writeFile(file, buf)
    return file
  }
}

/* -------------------------------------------------------------- geotiff io */
// Lazily import geotiff inside the function to keep module load fast/failure-free.
async function readTile(file, { lat0, lon0 }) {
  const { fromFile } = await import('geotiff')
  const tiff = await fromFile(file)
  const image = await tiff.getImage()
  const rasters = await image.readRasters({ interleave: false })
  const band = rasters[0] // single-band elevation (Float32)
  const w = image.getWidth()
  const h = image.getHeight()
  // Use the authoritative geographic extent (accounts for geotransform).
  const [minX, minY, maxX, maxY] = image.getBoundingBox()
  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1
  const sample = (lat, lon) => {
    const col = Math.round(((lon - minX) / spanX) * (w - 1))
    const row = Math.round(((maxY - lat) / spanY) * (h - 1))
    const c = Math.max(0, Math.min(w - 1, col))
    const r = Math.max(0, Math.min(h - 1, row))
    const v = band[r * w + c]
    return Number.isFinite(v) ? v : 0
  }
  void lat0
  void lon0
  return { sample }
}

/* ---------------------------------------------------------------- merge */
let min = Infinity
let max = -Infinity
const cells = new Uint16Array(WIDTH * HEIGHT)

const loadTile = {}
for (const t of TILES) {
  const file = await ensureTile(t)
  loadTile[t.key] = await readTile(file, t)
}
console.log(`downloaded/read ${TILES.length} source tiles`)

for (let iy = 0; iy < HEIGHT; iy++) {
  const lat = BOUNDS.north - (iy / (HEIGHT - 1)) * (BOUNDS.north - BOUNDS.south)
  const tile = TILES.find((t) => lat >= t.lat0 && lat < t.lat0 + 1) ?? TILES[TILES.length - 1]
  const src = loadTile[tile.key]
  for (let ix = 0; ix < WIDTH; ix++) {
    const lon = BOUNDS.west + (ix / (WIDTH - 1)) * (BOUNDS.east - BOUNDS.west)
    let v = src.sample(lat, lon)
    if (!Number.isFinite(v) || v < 0) v = 0
    if (v > max) max = v
    if (v < min) min = v
    cells[iy * WIDTH + ix] = Math.round(v)
  }
}
if (!Number.isFinite(min)) min = 0

/* ------------------------------------------------------------------ write */
await fs.writeFile(path.join(OUT_DIR, 'sikkim.dem.bin'), Buffer.from(cells.buffer))
const meta = {
  format: 'Uint16LE',
  width: WIDTH,
  height: HEIGHT,
  bounds: BOUNDS,
  minM: Math.round(min),
  maxM: Math.round(max),
  source: 'Copernicus DEM GLO-30 (ESA/Copernicus), AWS Registry of Open Data',
  license: 'CC BY 4.0',
  attribution:
    'Contains modified Copernicus Sentinel-1 data / Copernicus DEM (2022). © European Space Agency — https://doi.org/10.5270/ESA-c5d3d65',
  notes: 'Pipeline: scripts/build-sikkim-dem.mjs. Values are elevation in metres above sea level.',
}
await fs.writeFile(
  path.join(OUT_DIR, 'sikkim.dem.json'),
  JSON.stringify(meta, null, 2),
)

console.log(
  `WROTE sikkim.dem.bin (${WIDTH}x${HEIGHT}, ${min}m..${max}m) + sikkim.dem.json`,
)
