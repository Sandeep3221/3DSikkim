import { useEffect } from 'react'

interface Meta {
  title: string
  description: string
}

function upsertMeta(name: string, content: string, attribute: 'name' | 'property'): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attribute, name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/**
 * Lightweight SEO hook: document title + description + Open Graph basics.
 * No external dependency; per-route metadata without re-render cost.
 */
export function useDocumentMeta({ title, description }: Meta): void {
  useEffect(() => {
    document.title = title
    upsertMeta('description', description, 'name')
    upsertMeta('og:title', title, 'property')
    upsertMeta('og:description', description, 'property')
    upsertMeta('og:type', 'website', 'property')
    upsertMeta('og:site_name', '3DSikkim', 'property')
    upsertMeta('twitter:card', 'summary', 'name')
  }, [title, description])
}
