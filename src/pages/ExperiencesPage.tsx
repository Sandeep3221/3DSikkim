import { Link } from 'react-router-dom'
import { ALL_EXPERIENCES } from '../data/destinations'
import { SiteLayout } from '../components/SiteChrome'
import { useDocumentMeta } from '../hooks/useDocumentMeta'

export default function ExperiencesPage() {
  useDocumentMeta({
    title: 'Experiences — 3DSikkim',
    description:
      'Monasteries, treks, valleys and viewpoints — experiences across the destinations of Sikkim.',
  })

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-6 py-16">
        <p className="kicker mb-4">Experiences</p>
        <h1 className="display text-4xl uppercase tracking-[0.1em] md:text-5xl">
          Ways to be in the mountains
        </h1>

        <ul className="mt-14 grid gap-x-12 gap-y-10 md:grid-cols-2">
          {ALL_EXPERIENCES.map((e) => (
            <li key={`${e.destinationSlug}-${e.title}`} className="border-t border-white/10 pt-5">
              <p className="meta">{e.destinationName}</p>
              <h2 className="display mt-2 text-xl tracking-[0.06em]">{e.title}</h2>
              <p className="mt-2 font-serif text-sm leading-relaxed text-mist">{e.note}</p>
              <Link
                to={`/destinations/${e.destinationSlug}`}
                className="meta mt-3 inline-block transition-colors hover:text-bone focus-visible:outline-none"
              >
                {e.destinationName} →
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </SiteLayout>
  )
}
