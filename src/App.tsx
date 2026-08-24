import { lazy, Suspense, useMemo } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import ScrollToTop from './components/ScrollToTop'
import Fallback from './ui/Fallback'
import JourneyPage from './pages/JourneyPage'
import DestinationsPage from './pages/DestinationsPage'
import DestinationDetailPage from './pages/DestinationDetailPage'

// Secondary editorial routes are lazy-loaded — the cinematic journey stays lean.
const ExperiencesPage = lazy(() => import('./pages/ExperiencesPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const ContactPage = lazy(() => import('./pages/ContactPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    )
  } catch {
    return false
  }
}

export default function App() {
  const webgl = useMemo(webglAvailable, [])

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route
          path="/"
          element={
            webgl ? (
              <ErrorBoundary>
                <JourneyPage />
              </ErrorBoundary>
            ) : (
              <Fallback />
            )
          }
        />
        <Route path="/destinations" element={<DestinationsPage />} />
        <Route path="/destinations/:slug" element={<DestinationDetailPage />} />
        <Route
          path="/experiences"
          element={
            <Suspense fallback={null}>
              <ExperiencesPage />
            </Suspense>
          }
        />
        <Route
          path="/about"
          element={
            <Suspense fallback={null}>
              <AboutPage />
            </Suspense>
          }
        />
        <Route
          path="/contact"
          element={
            <Suspense fallback={null}>
              <ContactPage />
            </Suspense>
          }
        />
        <Route
          path="*"
          element={
            <Suspense fallback={null}>
              <NotFoundPage />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

