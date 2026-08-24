import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Catches render-time errors (e.g. a corrupted texture or a runtime fault in
 * the 3D layer) and degrades gracefully instead of blanking the page.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown): void {
    console.error('Experience error:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center">
          <p className="kicker mb-6">3DSikkim</p>
          <h1 className="display text-3xl tracking-[0.12em] md:text-4xl">
            THE JOURNEY COULD NOT BEGIN
          </h1>
          <p className="mt-6 max-w-md font-serif text-base leading-relaxed text-mist">
            Something went wrong while preparing the experience. Please reload
            to try again.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-10 border border-bone/30 px-8 py-3 font-mono text-[11px] uppercase tracking-[0.3em] text-bone transition-colors hover:border-bone/70 hover:bg-white/5 focus-visible:outline-none"
          >
            Reload
          </button>
        </main>
      )
    }
    return this.props.children
  }
}
