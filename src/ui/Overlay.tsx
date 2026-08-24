import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { SEGMENT_EVENT } from '../systems/scroll/ScrollProvider'
import { scrollState } from '../systems/scroll/scrollState'
import { segmentAt, type JourneySegment } from '../systems/scroll/journey'
import { prefersReducedMotion } from '../systems/performance/motion'
import { useUiState, selectDestination } from '../systems/ui/uiStore'
import { DESTINATIONS } from '../data/destinations'

/**
 * Journey UI: editorial captions keyed to segments (phases 1–6), resolving
 * into the world-as-UI travel interface — a live destination list bound to
 * the 3D relief map — during the interactive-experience phase.
 */

const CAPTIONS: Record<
  string,
  { kicker?: string; title?: string; titleClass?: string; body?: string; meta?: string; center?: boolean }
> = {
  space: {
    kicker: 'A Cinematic Journey',
    title: 'SIKKIM',
    body: 'From deep space to the shoulder of Kangchenjunga.',
  },
  approach: {
    kicker: 'Low Earth Orbit',
    title: 'HOME',
    body: 'Third planet from an ordinary star.',
  },
  himalayas: {
    kicker: 'The Great Range',
    title: 'HIMALAYA',
    body: 'Nine of the ten highest peaks on Earth stand here.',
  },
  reveal: {
    kicker: 'Sacred Summit',
    title: 'KANCHENJUNGA',
    titleClass: 'text-[13vw] leading-none md:text-8xl tracking-[0.06em]',
    meta: '8,586 M — 27°42′ N · 88°08′ E',
    center: true,
  },
  flight: {
    kicker: 'Mountain Flight',
    title: 'INTO SIKKIM',
    body: 'Ridges, valleys and cloud — descending into the eastern Himalaya.',
  },
  arrival: {
    kicker: '27° N · 88° E',
    title: 'SIKKIM',
    meta: 'GANGTOK · PELLING · LACHUNG · YUKSOM · NATHU LA',
  },
}

const NAV_LINKS = [
  { to: '/', label: 'Explore' },
  { to: '/destinations', label: 'Destinations' },
  { to: '/experiences', label: 'Experiences' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

export default function Overlay() {
  const [segment, setSegment] = useState<JourneySegment>(segmentAt(0).segment)
  const captionRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const [showHint, setShowHint] = useState(true)
  const { mapActive, selectedId } = useUiState()
  const selected = DESTINATIONS.find((d) => d.id === selectedId) ?? null

  // Segment swaps drive the caption block (GSAP entrance, instant under reduced motion).
  useEffect(() => {
    const onSegment = (e: Event) => {
      const seg = (e as CustomEvent<JourneySegment>).detail
      setSegment(seg)
      if (captionRef.current && seg.id !== 'experience') {
        gsap.fromTo(
          captionRef.current,
          { autoAlpha: 0, y: 14 },
          {
            autoAlpha: 1,
            y: 0,
            duration: prefersReducedMotion() ? 0 : 0.9,
            ease: 'power2.out',
            delay: prefersReducedMotion() ? 0 : 0.15,
          },
        )
      }
    }
    window.addEventListener(SEGMENT_EVENT, onSegment)
    return () => window.removeEventListener(SEGMENT_EVENT, onSegment)
  }, [])

  // Progress rail + hint dismissal — rAF reads the shared state directly.
  useEffect(() => {
    let raf = 0
    const tick = () => {
      if (railRef.current) {
        railRef.current.style.transform = `scaleY(${scrollState.progress})`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const onScroll = () => setShowHint(window.scrollY < 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  const showExperienceUI = mapActive
  const caption = CAPTIONS[segment.id] ?? {}

  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none">
      {/* Photographic vignette */}
      <div aria-hidden="true" className="vignette absolute inset-0" />

      {/* Top bar — journey kicker resolves into navigation */}
      <header className="absolute inset-x-0 top-0 flex items-start justify-between p-6 md:p-8">
        <Link to="/" className="kicker pointer-events-auto focus-visible:outline-none">
          3DSikkim
        </Link>
        <nav
          aria-label="Primary"
          className={`pointer-events-auto flex flex-wrap items-center justify-end gap-x-4 gap-y-1 transition-opacity duration-1000 md:gap-6 ${
            showExperienceUI ? 'opacity-100' : 'opacity-25 hover:opacity-90'
          }`}
        >
          {NAV_LINKS.slice(1).map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="meta transition-colors hover:text-bone focus-visible:text-bone focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-mist/70"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Segment caption, resolving into the map interface */}
      <main className="absolute inset-0">
        {!showExperienceUI ? (
          <div
            ref={captionRef}
            className={`absolute bottom-24 left-6 max-w-md md:left-12 ${
              caption.center ? 'left-1/2 max-w-none -translate-x-1/2 text-center md:bottom-28' : ''
            }`}
          >
            {caption.kicker ? <p className="kicker mb-3">{caption.kicker}</p> : null}
            {caption.title ? (
              <h1
                className={`display uppercase ${caption.titleClass ?? 'text-4xl leading-tight tracking-[0.14em] md:text-6xl'}`}
              >
                {caption.title}
              </h1>
            ) : null}
            {caption.body ? (
              <p className="mt-4 max-w-xs font-serif text-sm leading-relaxed text-mist md:text-base">
                {caption.body}
              </p>
            ) : null}
            {caption.meta ? <p className="meta mt-4">{caption.meta}</p> : null}
          </div>
        ) : (
          <MapInterface selected={selected} />
        )}
      </main>

      {/* Bottom bar: coordinates · segment label */}
      <footer className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6 md:p-8">
        <p className="meta">27°42′09″ N — 88°08′51″ E · Sikkim, India</p>
        <p className="kicker hidden md:block">{segment.label}</p>
      </footer>

      {/* Progress rail */}
      <div
        aria-hidden="true"
        className={`absolute right-6 top-1/2 hidden h-44 w-px -translate-y-1/2 bg-white/15 transition-opacity duration-700 md:block ${
          showExperienceUI ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div
          ref={railRef}
          className="h-full w-full origin-top bg-bone/80"
          style={{ transform: 'scaleY(0)' }}
        />
      </div>

      {/* Scroll hint */}
      <p
        aria-hidden={!showHint || showExperienceUI}
        className={`kicker absolute bottom-24 right-6 transition-opacity duration-700 md:right-8 ${
          showHint && !showExperienceUI ? 'opacity-100' : 'opacity-0'
        }`}
      >
        Scroll ↓
      </p>
    </div>
  )
}

/* ------------------------- world-as-UI interface ------------------------- */

function MapInterface({ selected }: { selected: (typeof DESTINATIONS)[number] | null }) {
  return (
    <div className="absolute inset-x-0 bottom-16 top-20 flex flex-col justify-end gap-3 px-5 pb-2 md:flex-row md:items-end md:justify-between md:gap-8 md:px-12">
      {/* Selected destination panel — appears over the world it belongs to */}
      <div aria-live="polite" className="pointer-events-auto order-1 w-full max-w-sm self-start md:self-auto">
        {selected ? (
          <div className="max-h-[42vh] overflow-y-auto border border-white/10 bg-black/45 p-4 backdrop-blur-sm md:max-h-none md:p-6">
            <p className="kicker mb-2">{selected.meta.region}</p>
            <h2 className="display text-2xl uppercase tracking-[0.12em]">{selected.name}</h2>
            <p className="meta mt-2">
              {selected.coords.lat.toFixed(2)}° N · {selected.coords.lon.toFixed(2)}° E · ≈
              {selected.elevationM.toLocaleString('en-IN')} m
            </p>
            <p className="mt-3 font-serif text-sm leading-relaxed text-bone/85">
              {selected.tagline}. {selected.description}
            </p>
            <div className="mt-4 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => selectDestination(null)}
                className="meta transition-colors hover:text-bone focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-mist/70"
              >
                Close ×
              </button>
              <Link
                to={`/destinations/${selected.slug}`}
                className="border border-bone/40 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.28em] text-bone transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-mist"
              >
                Open {selected.name} →
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      {/* Destination list — the accessible twin of the 3D markers */}
      <nav
        aria-label="Destinations on the map"
        className="pointer-events-auto order-2 transition-opacity duration-1000"
      >
        <p className="kicker mb-2 hidden md:block">Select a destination</p>
        <ul className="flex flex-wrap gap-2 md:flex-col md:space-y-1.5 md:space-y-reverse md:gap-0">
          {DESTINATIONS.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                aria-pressed={selected?.id === d.id}
                onClick={() => selectDestination(selected?.id === d.id ? null : d.id)}
                className={`border px-3 py-1.5 text-left font-mono text-[11px] uppercase tracking-[0.18em] transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-mist md:w-full md:border-b-0 md:border-l md:py-1 md:pl-3 md:tracking-[0.22em] ${
                  selected?.id === d.id
                    ? 'border-bone bg-black/40 text-bone'
                    : 'border-white/25 bg-black/30 text-faint hover:border-white/60 hover:text-mist'
                }`}
              >
                {d.name}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
