# 3DSikkim

A cinematic journey from deep space to the mountains of Sikkim, built with
real geographic data.

SPACE -> EARTH -> HIMALAYAS -> SIKKIM -> INTERACTIVE EXPLORER
-> DESTINATION DIVE -> DESTINATION EXPERIENCE

## Stack
- Vite 7 / React 19 / TypeScript (strict)
- three.js + @react-three/fiber + @react-three/drei
- GSAP + Lenis + Tailwind CSS v4
- Copernicus DEM GLO-30 for real elevation data

## Terrain Pipeline

Real elevation from Copernicus DEM GLO-30 (CC BY 4.0):

    npm run build:terrain

Downloads 1-degree GeoTIFF COGs covering the Sikkim bounding box,
merges them into a normalized height field, and writes:

- public/assets/terrain/sikkim.dem.bin (Uint16LE, metres)
- public/assets/terrain/sikkim.dem.json (bounds, min/max, attribution)

Tiles are cached in ./terrain-cache/ (gitignored).

## Commands

    npm install
    npm run dev          # local dev server
    npm run build        # production build
    npm run preview      # serve dist/
    npm run build:terrain # regenerate DEM assets

## Architecture

### Cinematic journey (scroll-driven)

The master timeline in systems/scroll/journey.ts defines seven segments:
SPACE, APPROACH, HIMALAYAS, KANCHENJUNGA REVEAL, MOUNTAIN FLIGHT,
SIKKIM ARRIVAL, and THE EXPERIENCE. Every system reads the same
normalized progress value.

### Interactive explorer

When progress reaches the interactive-experience segment, OrbitControls
activate. The user can orbit, zoom and pan around real DEM terrain.

### Destination dive

Selecting a destination triggers a time-based cinematic camera route
(DestinationCameraRoute.tsx) through eight stages:
TARGET LOCK, ORIENTATION, REGIONAL APPROACH, DESCENT, TERRAIN APPROACH,
DESTINATION REVEAL, ARRIVAL, UI REVEAL.

After arrival, destination information appears as an editorial layer.
The user can return to the Sikkim overview or select another destination.

### Key files

- src/experience/sikkimWorld.ts — coordinate system + terrain mesh builder
- src/experience/terrainData.ts — DEM store with synchronous elevation access
- src/experience/SikkimTerrain.tsx — LOD terrain renderer
- src/experience/DestinationCameraRoute.tsx — cinematic dive engine
- src/experience/DestinationEnvironment.tsx — arrival environment patches
- src/experience/MapMarkers.tsx — geographically attached destination markers
- src/data/destinations.ts — structured destination configuration
- src/systems/ui/uiStore.ts — shared UI state (mapActive, selectedId, diving)

## Data sources

See documentation/DATA_SOURCES.md for full attribution.
