import { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import gsap from 'gsap'

import ArtifactQuiz from './ArtifactQuiz'

/**
 * Full-screen quiz panel.
 * Portal, focus trap, scroll lock, Escape and backdrop close, GSAP
 * open/close. Self-contained: closing never chains into another modal.
 */
export default function QuizModal({ open, onClose }) {
  const rootRef = useRef(null)
  const panelRef = useRef(null)
  const closeRef = useRef(null)
  const previousFocus = useRef(null)
  const closing = useRef(false)

  const requestClose = useCallback(() => {
    if (closing.current) return
    closing.current = true

    const root = rootRef.current
    const panel = panelRef.current
    if (!root || !panel) {
      closing.current = false
      onClose()
      return
    }

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(root, { visibility: 'hidden', opacity: 0 })
        closing.current = false
        onClose()
        previousFocus.current?.focus?.()
      },
    })

    tl.to(panel, {
      opacity: 0,
      y: 18,
      scale: 0.98,
      duration: 0.3,
      ease: 'power2.in',
    }).to(root, { opacity: 0, duration: 0.32, ease: 'power2.in' }, '-=0.16')
  }, [onClose])

  /* Opening / closing, scroll lock, keyboard accessibility */
  useEffect(() => {
    if (!open) return undefined

    const root = rootRef.current
    const panel = panelRef.current
    if (!root || !panel) return undefined

    previousFocus.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    gsap.killTweensOf([root, panel])
    gsap.set(root, { visibility: 'visible' })
    gsap.fromTo(
      root,
      { opacity: 0 },
      { opacity: 1, duration: 0.35, ease: 'power2.out' },
    )
    gsap.fromTo(
      panel,
      { opacity: 0, y: 34, scale: 0.975 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.65,
        delay: 0.04,
        ease: 'power3.out',
      },
    )

    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 140)

    const trapFocus = (event) => {
      const nodes = panel.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!nodes.length) return

      const first = nodes[0]
      const last = nodes[nodes.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        requestClose()
      } else if (event.key === 'Tab') {
        trapFocus(event)
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.clearTimeout(focusTimer)
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, requestClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
      aria-labelledby="quiz-modal-title"
      style={{ opacity: 0, visibility: 'hidden' }}
      className="fixed inset-0 z-[85] flex items-center justify-center p-3 sm:p-6 md:p-8"
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={requestClose}
        className="absolute inset-0 bg-[#020306]/80 backdrop-blur-2xl"
      />
      <div
        aria-hidden="true"
        className="tech-grid pointer-events-none absolute inset-0 opacity-[0.15]"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-y-auto border border-white/15 bg-[#07080d]/95 shadow-[0_60px_140px_-40px_rgba(0,0,0,0.95)]"
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4 md:px-7 md:py-5">
          <div className="min-w-0">
            <p className="font-mono text-[8px] uppercase tracking-[0.32em] text-gold md:text-[9px]">
              NASA / Knowledge check
            </p>
            <h2
              id="quiz-modal-title"
              className="mt-1.5 text-[14px] font-normal leading-snug tracking-tight text-bone/90 md:text-base"
            >
              Space Artifact Quiz
            </h2>
            <p className="mt-1.5 hidden text-[11px] leading-relaxed text-bone/40 sm:block">
              Six questions across the archive. Everything you need is in the
              chapters above.
            </p>
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={requestClose}
            className="group flex shrink-0 items-center gap-2 border border-white/15 px-3 py-2 font-mono text-[8px] uppercase tracking-[0.18em] text-bone/60 transition-colors hover:border-gold hover:text-gold focus-visible:border-gold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/50 md:gap-3 md:px-4 md:py-2.5 md:text-[9px]"
          >
            <span>Close Quiz</span>
            <span className="hidden text-bone/30 group-hover:text-gold/50 lg:inline">
              Esc
            </span>
            <span className="grid h-6 w-6 place-items-center rounded-full border border-white/15 transition-colors group-hover:border-gold/40">
              <svg
                width="11"
                height="11"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2 2l8 8M10 2l-8 8"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
              </svg>
            </span>
          </button>
        </header>

        <ArtifactQuiz />

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-3.5 font-mono text-[8px] uppercase tracking-[0.24em] text-bone/25 md:px-7">
          <span>Source — NASA / JPL / NSSDC</span>
          <span className="text-bone/40">The archives are never truly closed.</span>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
