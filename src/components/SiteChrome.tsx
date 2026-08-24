import { Link, NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'

const LINKS = [
  { to: '/', label: 'Explore', end: true },
  { to: '/destinations', label: 'Destinations' },
  { to: '/experiences', label: 'Experiences' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

/** Minimal shared navigation + footer for editorial routes. */
export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-bone">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:border focus:border-bone/40 focus:bg-black focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-white/5 bg-black/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="kicker focus-visible:outline-none">
            3DSikkim
          </Link>
          <nav aria-label="Primary" className="flex flex-wrap gap-4 md:gap-6">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `meta transition-colors hover:text-bone focus-visible:text-bone focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-mist/70 ${
                    isActive ? 'text-bone' : 'text-faint'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main id="main">{children}</main>
      <SiteFooter />
    </div>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <p className="meta">3DSikkim — a geographic journey through Sikkim</p>
        <p className="meta">27°42′09″ N — 88°08′51″ E</p>
      </div>
    </footer>
  )
}
