import { SiteLayout } from '../components/SiteChrome'
import { useDocumentMeta } from '../hooks/useDocumentMeta'

export default function ContactPage() {
  useDocumentMeta({
    title: 'Contact — 3DSikkim',
    description: 'Get in touch with the 3DSikkim team.',
  })

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="kicker mb-4">Contact</p>
        <h1 className="display text-4xl uppercase tracking-[0.1em]">Say hello</h1>
        <p className="mt-8 max-w-xl font-serif text-base leading-relaxed text-mist">
          Questions about the journey, corrections to the geography, or plans
          for your own trip through Sikkim — write to us and we will respond.
        </p>
        <a
          href="mailto:hello@3dsikkim.example"
          className="mt-10 inline-block border border-bone/40 px-8 py-3 font-mono text-[11px] uppercase tracking-[0.3em] transition-colors hover:bg-white/10 focus-visible:outline-none"
        >
          hello@3dsikkim.example
        </a>
        <p className="meta mt-16">Gangtok · Sikkim · India</p>
      </div>
    </SiteLayout>
  )
}
