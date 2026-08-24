import { useState } from 'react'
import type { ImageVariant } from '../data/destinations'

/**
 * Responsive, lazy-loaded image with graceful failure: srcset for the two
 * local variants, native lazy loading below the fold, and a restrained
 * typographic fallback panel if the asset is missing.
 */
export default function SmartImage({
  image,
  className = '',
  eager = false,
}: {
  image: ImageVariant | null
  className?: string
  eager?: boolean
}) {
  const [failed, setFailed] = useState(false)

  const singleSrc = !image || image.small === image.src

  if (!image || failed) {
    return (
      <div
        role="img"
        aria-label={image?.alt ?? 'Image unavailable'}
        className={`flex items-center justify-center border border-white/10 bg-[#10161c] ${className}`}
      >
        <span className="meta">Sikkim · 27° N · 88° E</span>
      </div>
    )
  }

  return (
    <img
      src={image.small}
      srcSet={singleSrc ? undefined : `${image.small} 640w, ${image.src} 1280w`}
      sizes={singleSrc ? undefined : '(max-width: 768px) 100vw, 50vw'}
      alt={image.alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  )
}
