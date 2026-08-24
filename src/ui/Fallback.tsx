import { Link } from 'react-router-dom'
import { DESTINATIONS } from '../data/destinations'
import { useDocumentMeta } from '../hooks/useDocumentMeta'

/**
 * Graceful degradation: shown only when WebGL is unavailable or fails.
 * Preserves full navigation and the destination catalogue so the site stays
 * a usable travel resource. Never crashes; never blank.
 */
export default function Fallback() {
  useDocumentMeta({
    title: '3DSikkim — Space to Kanchenjunga',
    description:
      'A cinematic journey from deep space to Kanchenjunga, resolving into a geographic guide to Sikkim: Gangtok, Pelling, Lachung, Yuksom and Nathu La.',
  })

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 py-16 text-center">
      <p className="kicker mb-6">3DSikkim</p>
      <h1 className="display text-4xl leading-tight tracking-[0.12em] md:text-5xl">
        THE MOUNTAIN AWAITS
      </h1>
      <p className="mt-6 max-w-md font-serif text-base leading-relaxed text-mist">
        This journey is rendered in real time and needs a browser with WebGL
        enabled. Your current browser or device cannot display it — please try
        a recent version of Chrome, Firefox, Edge or Safari with hardware
        acceleration turned on.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-10 border border-bone/30 px-8 py-3 font-mono text-[11px] uppercase tracking-[0.3em] text-bone transition-colors hover:border-bone/70 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-mist"
      >
        Try Again
      </button>

      {/* The destination catalogue remains available without WebGL. */}
      <section aria-labelledby="fallback-destinations" className="mt-16 w-full max-w-md">
        <h2 id="fallback-destinations" className="kicker mb-5">
          Destinations
        </h2>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {DESTINATIONS.map((d) => (
            <li key={d.id}>
              <Link
                to={`/destinations/${d.slug}`}
                className="flex items-baseline justify-between border border-white/10 px-4 py-3 transition-colors hover:border-white/40 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-mist"
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.22em]">{d.name}</span>
                <span className="meta">≈{d.elevationM.toLocaleString('en-IN')} m</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <p className="meta mt-16">27°42′09″ N — 88°08′51″ E · Sikkim, India</p>
    </main>
  )
}

