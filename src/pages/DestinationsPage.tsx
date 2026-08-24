import { Link } from 'react-router-dom'
import { DESTINATIONS } from '../data/destinations'
import { SiteLayout } from '../components/SiteChrome'
import SmartImage from '../components/SmartImage'
import { useDocumentMeta } from '../hooks/useDocumentMeta'

export default function DestinationsPage() {
  useDocumentMeta({
    title: 'Destinations — 3DSikkim',
    description:
      'Gangtok, Pelling, Lachung, Yuksom and Nathu La — the destinations of Sikkim, each with geography, elevation and experiences.',
  })

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-6 py-16">
        <p className="kicker mb-4">Destinations</p>
        <h1 className="display text-4xl uppercase tracking-[0.1em] md:text-5xl">
          Five places,
          <br />
          one mountain state
        </h1>
        <p className="mt-6 max-w-xl font-serif text-base leading-relaxed text-mist">
          From the capital on its ridge to a border pass at 4,310 metres — every
          destination below is pinned on the relief map you arrived through.
        </p>

        <ul className="mt-14 grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          {DESTINATIONS.map((d) => (
            <li key={d.id}>
              <Link
                to={`/destinations/${d.slug}`}
                className="group block focus-visible:outline-none"
              >
                <SmartImage
                  image={d.hero}
                  eager
                  className="aspect-[4/3] w-full object-cover transition-opacity group-hover:opacity-85"
                />
                <div className="mt-4 flex items-baseline justify-between gap-4">
                  <h2 className="display text-xl uppercase tracking-[0.12em]">{d.name}</h2>
                  <span className="meta">≈{d.elevationM.toLocaleString('en-IN')} m</span>
                </div>
                <p className="meta mt-1">{d.meta.region}</p>
                <p className="mt-3 font-serif text-sm leading-relaxed text-mist">{d.tagline}.</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </SiteLayout>
  )
}
