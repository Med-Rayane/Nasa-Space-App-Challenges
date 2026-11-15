import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import Canvas3D from './components/Canvas3D'
import LoadingScreen from './components/LoadingScreen'
import Overlay from './components/Overlay'
import QuizModal from './components/QuizModal'
import { initialScrollState, scrollState } from './lib/scrollState'

gsap.registerPlugin(ScrollTrigger)

/**
 * Which 3D artifact is on screen for each narrative section.
 * The prologue and the epilogue bookend the story with the Solar System:
 * the archive seen from outside, then from afar.
 */
const ARTIFACT_BY_SECTION = {
  prologue: 'solar',
  'mars-rovers': 'rovers',
  ingenuity: 'ingenuity',
  landers: 'landers',
  surveyor: 'surveyor',
  kepler: 'kepler',
  epilogue: 'solar',
}

export default function App() {
  const rootRef = useRef(null)
  const [entered, setEntered] = useState(false)
  const [quizOpen, setQuizOpen] = useState(false)
  const [artifact, setArtifact] = useState('solar')

  const handleLoaded = useCallback(() => setEntered(true), [])
  const openQuiz = useCallback(() => setQuizOpen(true), [])
  const closeQuiz = useCallback(() => setQuizOpen(false), [])

  const handleActiveChange = useCallback((sectionId) => {
    const next = ARTIFACT_BY_SECTION[sectionId]
    if (!next) return

    /* Straight setState, no transition: the incoming layer is already
       warmed and GPU-resident, so the swap must land on the very frame the
       section changes. Deferring it made the model change a beat late. */
    setArtifact((current) => (current === next ? current : next))
  }, [])

  /* ------------------------------------------------------------------
   *  Scroll timeline.
   *  The artifacts hold a fixed stage position — only the lighting
   *  changes between chapters, which keeps the scrub extremely cheap.
   * ------------------------------------------------------------------ */
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return undefined

    // Reset on mount (also useful with HMR)
    Object.assign(scrollState, initialScrollState)

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.7,
          invalidateOnRefresh: true,
        },
      })

      // 01 — Spirit & Opportunity
      tl.to(
        scrollState,
        { keyIntensity: 2.05, rimIntensity: 1.85, glow: 7.2, duration: 1 },
        0,
      )
        // 02 — Ingenuity: brighter key, tight rim
        .to(
          scrollState,
          { keyIntensity: 2.9, rimIntensity: 1.05, glow: 4.6, duration: 1 },
          1,
        )
        // 03 — Phoenix & InSight: warmer, closer light
        .to(
          scrollState,
          { keyIntensity: 2.45, rimIntensity: 1.75, glow: 7.5, duration: 1 },
          2,
        )
        // 04 — Surveyor 3: colder rim
        .to(
          scrollState,
          { keyIntensity: 2.2, rimIntensity: 1.5, glow: 6, duration: 1 },
          3,
        )
        // 05 — Kepler: distant, cold, almost no warm bounce
        .to(
          scrollState,
          { keyIntensity: 1.9, rimIntensity: 2.1, glow: 3.9, duration: 1 },
          4,
        )
        // Epilogue — the whole Solar System, small and quiet again
        .to(
          scrollState,
          { keyIntensity: 1.65, rimIntensity: 1.95, glow: 3.4, duration: 0.8 },
          5,
        )
        // Hold the final light while the last lines are read
        .to({}, { duration: 0.2 }, 5.8)
    }, root)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={rootRef} className="relative w-full bg-void text-bone">
      {/* Fixed full-screen canvas, behind all HTML content */}
      <div className="fixed inset-0 z-0">
        <Canvas3D artifact={artifact} />
      </div>

      {/* Light veil + vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[2]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_72%_32%,rgba(217,170,99,0.1),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_12%_82%,rgba(86,132,240,0.09),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,6,10,0.82)_0%,transparent_22%,transparent_74%,rgba(5,6,10,0.88)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_42%,rgba(0,0,0,0.62)_100%)]" />
      </div>

      {/* HTML narrative */}
      <Overlay
        entered={entered}
        onOpenQuiz={openQuiz}
        onActiveChange={handleActiveChange}
      />

      {/* Analog grain */}
      <div
        aria-hidden="true"
        className="grain-overlay pointer-events-none fixed inset-0 z-[60]"
      />

      <LoadingScreen onComplete={handleLoaded} />

      <QuizModal open={quizOpen} onClose={closeQuiz} />
    </div>
  )
}
