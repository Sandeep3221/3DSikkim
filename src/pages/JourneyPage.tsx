import Experience from '../experience/Experience'
import Loader from '../ui/Loader'
import Overlay from '../ui/Overlay'
import { ScrollProvider } from '../systems/scroll/ScrollProvider'

/**
 * The cinematic journey — the heart of the product. Everything else in the
 * site is editorial; this page is the world itself.
 */
export default function JourneyPage() {
  return (
    <ScrollProvider>
      <div className="fixed inset-0" aria-hidden="true">
        <Experience />
      </div>
      {/* Scroll runway — length defines total cinematic duration */}
      <div aria-hidden="true" className="h-[1100vh]" />
      <Overlay />
      <Loader />
    </ScrollProvider>
  )
}
