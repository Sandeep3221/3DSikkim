import { SiteLayout } from '../components/SiteChrome'
import { useDocumentMeta } from '../hooks/useDocumentMeta'

export default function AboutPage() {
  useDocumentMeta({
    title: 'About — 3DSikkim',
    description:
      '3DSikkim is a cinematic, scroll-driven journey from deep space to the mountains of Sikkim, resolving into a geographic travel guide.',
  })

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="kicker mb-4">About</p>
        <h1 className="display text-4xl uppercase tracking-[0.1em]">One world, not a website</h1>
        <div className="mt-8 space-y-6 font-serif text-base leading-relaxed text-mist">
          <p>
            3DSikkim begins four hundred kilometres above the Earth and ends on
            a relief map of Sikkim. The journey you scroll through is rendered
            in real time — the same terrain you fly past becomes the map you
            explore.
          </p>
          <p>
            The destination pages stay close to the ground: real places,
            approximate elevations, and honest notes about permits and seasons.
            Where imagery is shown it is captioned with what it actually depicts.
          </p>
          <p className="text-bone/80">
            Kangchenjunga, the guardian at the head of this journey, is the
            third-highest mountain on Earth at 8,586 metres.
          </p>
        </div>
      </div>
    </SiteLayout>
  )
}
