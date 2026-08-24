/**
 * Reduced-motion preference. Exposed as plain module state + subscription so
 * useFrame loops can poll it cheaply without React re-renders.
 */

type Listener = () => void

const mq =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null

let reduced = mq?.matches ?? false
const listeners = new Set<Listener>()

if (mq) {
  const onChange = (e: MediaQueryListEvent) => {
    reduced = e.matches
    listeners.forEach((l) => l())
  }
  mq.addEventListener('change', onChange)
}

export function prefersReducedMotion(): boolean {
  return reduced
}

export function subscribeReducedMotion(cb: Listener): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
