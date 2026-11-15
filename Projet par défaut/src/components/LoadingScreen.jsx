import { useEffect, useRef, useState } from 'react'
import { useProgress } from '@react-three/drei'
import gsap from 'gsap'

const PHASES = [
  { until: 24, label: 'Initializing renderer' },
  { until: 52, label: 'Calibrating optics' },
  { until: 78, label: 'Restoring archives' },
  { until: 100, label: 'Synchronizing telemetry' },
]

function phaseLabel(value) {
  return PHASES.find((phase) => value <= phase.until)?.label ?? 'Link established'
}

/**
 * Full-screen loading screen.
 * The percentage follows real assets (drei useProgress), with a
 * temporal floor so the opening sequence remains cinematic.
 */
export default function LoadingScreen({ onComplete }) {
  const { progress, active } = useProgress()
  const [value, setValue] = useState(0)
  const [gone, setGone] = useState(false)

  const rootRef = useRef(null)
  const completeRef = useRef(false)
  const progressRef = useRef(progress)
  const activeRef = useRef(active)

  progressRef.current = progress
  activeRef.current = active

  /* Progress ramp: never stuck below 100 if nothing else is loading. */
  useEffect(() => {
    const start = performance.now()
    const MIN_DURATION = 2600
    let frame = 0

    const tick = (now) => {
      const elapsed = Math.min(1, (now - start) / MIN_DURATION)
      const eased = 1 - Math.pow(1 - elapsed, 3)

      // Never overtake an asset that is still loading.
      const assetCeiling = activeRef.current
        ? Math.min(progressRef.current, 96)
        : 100

      const target = Math.min(assetCeiling, Math.floor(eased * 100))
      setValue((previous) => (target > previous ? target : previous))

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  /* Exit: fade + slide, then unmount. */
  useEffect(() => {
    if (value < 100 || completeRef.current) return

    completeRef.current = true
    onComplete?.()

    const root = rootRef.current
    if (!root) return undefined

    const tl = gsap.timeline({
      delay: 0.45,
      onComplete: () => setGone(true),
    })

    tl.to(root.querySelectorAll('[data-loader-content]'), {
      autoAlpha: 0,
      y: -22,
      duration: 0.7,
      stagger: 0.06,
      ease: 'power3.inOut',
    }).to(
      root,
      {
        autoAlpha: 0,
        duration: 0.9,
        ease: 'power2.inOut',
      },
      '-=0.38',
    )

    return () => tl.kill()
  }, [value, onComplete])

  if (gone) return null

  const label = phaseLabel(value)

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[100] flex flex-col justify-between overflow-hidden bg-void px-6 py-7 md:px-10 md:py-9"
      aria-label={`Loading experience: ${value} percent`}
    >
      {/* Fine amber glow at the bottom of the screen */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_115%,rgba(217,170,99,0.12),transparent_58%)]" />

      <div
        data-loader-content
        className="relative flex items-start justify-between gap-6 font-mono text-[9px] uppercase tracking-[0.3em] text-bone/40 md:text-[10px]"
      >
        <span>NASA Space Apps // 2026</span>
        <span className="hidden sm:block">Abandoned but not Forgotten</span>
        <span className="text-right">Cape Canaveral — 28.5729° N</span>
      </div>

      <div data-loader-content className="relative mx-auto w-full max-w-5xl">
        <p className="font-mono text-[9px] uppercase tracking-[0.42em] text-gold md:text-[10px]">
          Opening the archive
        </p>

        <div className="mt-5 flex items-end justify-between gap-8 md:mt-7">
          <div className="text-[clamp(4.2rem,15vw,12rem)] font-light leading-none tracking-[-0.07em] tabular-nums text-bone">
            {String(value).padStart(3, '0')}
            <span className="ml-2 align-top font-mono text-xs tracking-normal text-bone/30 md:text-sm">
              %
            </span>
          </div>

          <div className="mb-2 hidden text-right font-mono text-[9px] uppercase leading-loose tracking-[0.24em] text-bone/35 sm:block md:mb-4 md:text-[10px]">
            <div className="text-bone/50">{label}</div>
            <div className="mt-1 text-bone/20">
              Signal 00 — {String(value).padStart(3, '0')}
            </div>
          </div>
        </div>

        <div className="mt-6 h-px w-full overflow-hidden bg-white/10 md:mt-8">
          <div
            className="h-px bg-gold transition-[width] duration-200 ease-out"
            style={{ width: `${value}%` }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between font-mono text-[8px] uppercase tracking-[0.28em] text-bone/25 md:text-[9px]">
          <span>Loading fragments</span>
          <span className={value === 100 ? 'text-gold' : undefined}>
            {value === 100 ? 'Link established' : 'Please stand by'}
          </span>
        </div>
      </div>

      <div
        data-loader-content
        className="relative flex items-end justify-between gap-6 font-mono text-[8px] uppercase tracking-[0.26em] text-bone/25 md:text-[9px]"
      >
        <span>
          WebGL
          <span className="mx-2 text-gold/50">/</span>
          Three.js
        </span>
        <span className="hidden max-w-md text-center leading-relaxed md:block">
          Abandoned but not Forgotten: Storytelling about NASA&apos;s Discarded
          Equipment on the Moon and Mars
        </span>
        <span>Rev. 05 — 2026</span>
      </div>
    </div>
  )
}
