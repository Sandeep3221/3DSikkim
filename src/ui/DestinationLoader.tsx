import { useEffect, useRef, useState } from 'react'

/**
 * Cinematic loading overlay that appears while high-resolution terrain or
 * destination assets are still streaming in. It sits over the 3D canvas
 * as part of the experience — restrained expedition-log typography,
 * never a generic spinner.
 *
 * Shows once per destination selection; dismissed when ready === true.
 */

interface Props {
  /** Destination name to display during loading. */
  destinationName: string
  /** True when all required assets are loaded. */
  ready: boolean
}

export default function DestinationLoader({ destinationName, ready }: Props) {
  const [gone, setGone] = useState(false)
  const mountedAt = useRef(performance.now())

  useEffect(() => {
    if (ready) {
      const remaining = Math.max(0, 700 - (performance.now() - mountedAt.current))
      const t = setTimeout(() => setGone(true), remaining)
      return () => clearTimeout(t)
    }
  }, [ready])

  if (gone) return null

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-700"
      aria-hidden={!ready}
    >
      <p className="kicker mb-4">APPROACHING</p>
      <p className="display text-3xl uppercase tracking-[0.1em] md:text-4xl">
        {destinationName}
      </p>
      <div className="mt-8 h-px w-32 overflow-hidden bg-white/10">
        <div className="h-full w-1/2 animate-pulse bg-bone transition-[width] duration-500" />
      </div>
      <p className="meta mt-6">Preparing the landscape...</p>
    </div>
  )
}
