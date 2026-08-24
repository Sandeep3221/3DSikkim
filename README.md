# 3DSikkim — Phase 1: Cinematic 3D World Foundation

A continuous scroll-driven cinematic journey: **SPACE → EARTH → INDIA → HIMALAYAS → KANCHENJUNGA → MOUNTAIN ENVIRONMENT**.

## Stack

- Vite 7 · React 19 · TypeScript (strict)
- three.js + @react-three/fiber + @react-three/drei
- GSAP (UI transitions) · Lenis (smooth scroll) · Tailwind CSS v4

## Architecture

```
src/
├── experience/            # 3D world
│   ├── Experience.tsx     # Canvas host, adaptive DPR, tone mapping
│   ├── World.tsx          # Scene assembly — terrain is a CHILD of the planet
│   ├── Earth.tsx          # Photographic globe (NASA Blue Marble)
│   ├── Atmosphere.tsx     # Fresnel halo + limb haze shaders
│   ├── Stars.tsx          # Restrained layered star field w/ galactic band
│   ├── Clouds.tsx         # Planet cloud shell + peak cloud banks (reveal)
│   ├── Terrain.tsx        # Hero Kangchenjunga patch component
│   ├── Mountains.tsx      # Flanking range patches
│   ├── CameraController.tsx # Damped choreography + terrain collision clamp
│   ├── Lighting.tsx       # Sun travel, fog, space→sky background blend
│   ├── lightingState.ts   # Shared sun direction for shaders
│   ├── terrainField.ts    # Heightfield + sphere-conforming patch builder ★
│   └── noise.ts           # Deterministic value-noise / ridged multifractal
├── systems/
│   ├── scroll/
│   │   ├── ScrollProvider.tsx  # Lenis loop → master progress (0→1)
│   │   ├── scrollState.ts      # Render-free shared progress state
│   │   └── journey.ts      # Segments, tracks, geo anchors, Earth rotation solve
│   ├── camera/cameraPath.ts    # Keyframe choreography (absolute + anchored)
│   └── performance/
│       ├── quality.ts      # Device tiers (DPR, shadows, geometry, particles)
│       └── motion.ts       # prefers-reduced-motion
└── ui/
    ├── Loader.tsx          # "LOADING EXPERIENCE" state (drei useProgress)
    ├── Overlay.tsx         # Editorial captions, coordinates, progress rail
    └── Fallback.tsx        # WebGL-unavailable page
```

**Why the transition has no cuts:** every terrain vertex is re-projected onto
the globe itself (`terrainField.createPatchGeometry`), and the patches live
inside the rotating Earth group. The camera dives along the site normal from
orbit into the mountains on one continuous surface.

## Asset interface

- **Earth textures**: `public/assets/textures/earth/{day.jpg,bump.png,water.png,clouds.png}`.
  URLs are constants at the top of `Earth.tsx` / `Clouds.tsx` — swap in 8K
  Blue Marble imagery without touching scene code.
- **Terrain DEM**: currently procedural (`heightAt` in `terrainField.ts`).
  Drop `public/assets/terrain/heightmap.png` and replace `heightAt` with an
  image sampler; camera collision, colours and geometry all read that single
  function.

## Phase 2 — journey completion + travel experience

The master timeline now runs **SPACE → EARTH APPROACH → HIMALAYAS → KANCHENJUNGA
REVEAL → MOUNTAIN FLIGHT → SIKKIM ARRIVAL → INTERACTIVE EXPERIENCE** over one
continuous progress value (see `SEGMENTS` in `systems/scroll/journey.ts`).

At p ≈ 0.85–0.90 the journey-scale terrain crossfades into an interactive
**relief map of Sikkim** (`experience/sikkimRelief.ts`, `SikkimMap.tsx`,
`MapMarkers.tsx`) sitting exactly where the flight ended. Destination markers
and the HTML list in the overlay share one store (`systems/ui/uiStore.ts`);
selecting a destination eases the camera into a low hover above its marker.

Website routes (React Router):

```
/                        cinematic journey + interactive map
/destinations            editorial index
/destinations/:slug      premium destination page (invalid slugs → 404)
/experiences             aggregated experiences
/about · /contact        editorial pages
*                        NotFound
```

Destination content is structured data (`src/data/destinations.ts`); imagery is
local (`public/assets/images/destinations/*-1280.jpg`, Wikimedia Commons,
CC-sourced) with graceful fallback panels when an asset fails.

## Commands

```bash
npm install
npm run dev      # local dev
npm run build    # tsc -b && vite build
npm run preview  # serve dist/
```

## Phase 3 candidates

- Replace the stylised Sikkim relief heightfield with a real DEM via the
  documented `terrainField.ts` asset interface, and wire it into
  `sikkimRelief.ts` the same way.
