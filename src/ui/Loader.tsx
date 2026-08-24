import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'

/**
 * Loading state — part of the experience, not a spinner. Restrained
 * expedition-log typography with live percentage and site coordinates.
 * Fades out only after assets are ready AND a minimum dwell time, so the
 * opening never flashes.
 */
export default function Loader() {
  const { active, progress, errors } = useProgress()
  const [done, setDone] = useState(false)
  const [gone, setGone] = useState(false)
  const mountedAt = useRef(performance.now())

  useEffect(() => {
    // Complete when loading finishes — or when an asset errors out, so the
    // loader can never stick at a fake 99%.
    if ((!active && progress >= 100) || errors.length > 0) {
      // Enforce a minimum dwell so the opening never flashes.
      const remaining = Math.max(0, 1100 - (performance.now() - mountedAt.current))
      const t = setTimeout(() => setDone(true), remaining)
      return () => clearTimeout(t)
    }
  }, [active, progress, errors])

  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => setGone(true), 900)
    return () => clearTimeout(t)
  }, [done])

  if (gone) return null

  return (
    <div
      aria-hidden={done}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-700 ${
        done ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <p className="kicker mb-6">Loading Experience</p>
      <div className="display text-5xl tabular-nums tracking-[0.08em] md:text-6xl">
        {Math.round(progress)}
      </div>
      <div className="mt-8 h-px w-48 overflow-hidden bg-white/10">
        <div className="h-full bg-bone transition-[width] duration-300" style={{ width: `${progress}%` }} />
      </div>
      <p className="meta mt-4">Initializing Terrain</p>

      <div className="meta absolute bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
        27°42′ N — 88°08′ E
      </div>
    </div>
  )
}
