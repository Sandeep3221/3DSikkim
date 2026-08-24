import { useEffect, useState } from 'react'
import { ensureTerrainLoaded, terrainReady } from './terrainData'

/**
 * Triggers the one-time DEM load and returns whether real elevation data is
 * now available (used to gate geometry building in terrain components).
 */
export function useTerrainReady(): boolean {
  const [ready, setReady] = useState(terrainReady())

  useEffect(() => {
    let alive = true
    ensureTerrainLoaded().then(() => {
      if (alive) setReady(terrainReady())
    })
    return () => {
      alive = false
    }
  }, [])

  return ready
}
