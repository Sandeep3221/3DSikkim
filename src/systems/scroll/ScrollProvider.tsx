import { useEffect, type ReactNode } from 'react'
import Lenis from 'lenis'
import { scrollState } from './scrollState'
import { segmentAt } from './journey'
import { prefersReducedMotion } from '../performance/motion'

/** Fired on window whenever the active journey segment changes. */
export const SEGMENT_EVENT = 'journey:segment'

/**
 * Owns the smooth-scroll loop and derives the single master progress value
 * (0 → 1) that drives every system in the experience. No other scroll
 * source exists — nothing fights over it.
 */
export function ScrollProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const reduced = prefersReducedMotion()
    const lenis = new Lenis(
      reduced ? { smoothWheel: false } : { duration: 1.2, smoothWheel: true },
    )

    let raf = 0
    let lastIndex = segmentAt(0).index

    const loop = (time: number) => {
      lenis.raf(time)

      const doc = document.documentElement
      const limit = doc.scrollHeight - window.innerHeight
      const raw = limit > 0 ? (lenis.scroll ?? 0) / limit : 0
      scrollState.progress = raw < 0 ? 0 : raw > 1 ? 1 : raw

      const seg = segmentAt(scrollState.progress)
      if (seg.index !== lastIndex) {
        lastIndex = seg.index
        window.dispatchEvent(new CustomEvent(SEGMENT_EVENT, { detail: seg.segment }))
      }

      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}
