import { Link, useParams } from 'react-router-dom'
import { DESTINATIONS, getDestination } from '../data/destinations'
import { SiteLayout } from '../components/SiteChrome'
import SmartImage from '../components/SmartImage'
import NotFoundPage from './NotFoundPage'
import { useDocumentMeta } from '../hooks/useDocumentMeta'

export default function DestinationDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const destination = slug ? getDestination(slug) : undefined

  useDestinationMeta(destination)

  if (!destination) return <NotFoundPage />

  const related = DESTINATIONS.filter((d) => d.id !== destination.id).slice(0, 3)

  return (
    <SiteLayout>
      {/* Hero */}
      <header className="relative">
        <SmartImage
          image={destination.hero}
          eager
          className="h-[52vh] w-full object-cover md:h-[64vh]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 max-w-6xl px-6 pb-10 md:px-12">
          <p className="kicker mb-3">{destination.meta.region}</p>
          <h1 className="display text-5xl uppercase tracking-[0.08em] md:text-7xl">
            {destination.name}
          </h1>
          <p className="meta mt-4">
            {destination.coords.lat.toFixed(2)}° N · {destination.coords.lon.toFixed(2)}° E · ≈
            {destination.elevationM.toLocaleString('en-IN')} m above sea level
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-16">
        {/* Description + travel facts */}
        <section className="grid gap-12 md:grid-cols-3">
          <p className="font-serif text-lg leading-relaxed text-bone/90 md:col-span-2">
            {destination.description}
          </p>
          <aside aria-label="Travel information" className="space-y-4 border-l border-white/10 pl-6">
            <div>
              <p className="kicker mb-1">Best time</p>
              <p className="font-serif text-sm text-mist">{destination.meta.bestTime}</p>
            </div>
            <div>
              <p className="kicker mb-1">Elevation</p>
              <p className="font-serif text-sm text-mist">
                ≈{destination.elevationM.toLocaleString('en-IN')} m
              </p>
            </div>
            {destination.meta.access ? (
              <div>
                <p className="kicker mb-1">Access</p>
                <p className="font-serif text-sm leading-relaxed text-mist">{destination.meta.access}</p>
              </div>
            ) : null}
          </aside>
        </section>

        {/* Experiences */}
        <section className="mt-20">
          <h2 className="kicker mb-8">Experiences</h2>
          <ul className="grid gap-x-10 gap-y-8 md:grid-cols-2">
            {destination.experiences.map((e) => (
              <li key={e.title} className="border-t border-white/10 pt-4">
                <h3 className="display text-lg tracking-[0.06em]">{e.title}</h3>
                <p className="mt-2 font-serif text-sm leading-relaxed text-mist">{e.note}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Gallery */}
        {destination.gallery.length > 0 ? (
          <section className="mt-20">
            <h2 className="kicker mb-8">Field notes</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {destination.gallery.map((g) => (
                <figure key={g.src}>
                  <SmartImage image={g} className="aspect-[16/10] w-full object-cover" />
                  <figcaption className="meta mt-2">{g.alt}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        {/* Related */}
        <section className="mt-20 border-t border-white/10 pt-10">
          <h2 className="kicker mb-8">Continue exploring</h2>
          <ul className="flex flex-wrap gap-x-8 gap-y-4">
            {related.map((d) => (
              <li key={d.id}>
                <Link
                  to={`/destinations/${d.slug}`}
                  className="display text-xl uppercase tracking-[0.12em] text-mist transition-colors hover:text-bone focus-visible:text-bone focus-visible:outline-none"
                >
                  {d.name} →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </SiteLayout>
  )
}

/** Per-destination SEO metadata (kept honest when data is missing). */
function useDestinationMeta(destination: ReturnType<typeof getDestination>) {
  return useDocumentMeta({
    title: destination
      ? `${destination.name} — 3DSikkim`
      : 'Destination not found — 3DSikkim',
    description: destination
      ? `${destination.name}, ${destination.meta.region}: ${destination.tagline}. Elevation ≈${destination.elevationM} m.`
      : 'This destination could not be found.',
  })
}
