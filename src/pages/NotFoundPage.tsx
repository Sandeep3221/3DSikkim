import { Link } from 'react-router-dom'
import { SiteLayout } from '../components/SiteChrome'

/** Route fallback — also used for invalid destination slugs. */
export default function NotFoundPage() {
  return (
    <SiteLayout>
      <div className="mx-auto flex max-w-3xl flex-col items-start px-6 py-24">
        <p className="kicker mb-4">404</p>
        <h1 className="display text-4xl uppercase tracking-[0.1em]">Off the map</h1>
        <p className="mt-6 max-w-md font-serif text-base leading-relaxed text-mist">
          This page is not part of the journey. Return to the destinations the
          relief map does know about.
        </p>
        <Link
          to="/destinations"
          className="mt-10 inline-block border border-bone/40 px-8 py-3 font-mono text-[11px] uppercase tracking-[0.3em] transition-colors hover:bg-white/10 focus-visible:outline-none"
        >
          Destinations →
        </Link>
      </div>
    </SiteLayout>
  )
}
