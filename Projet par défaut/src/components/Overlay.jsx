import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const SECTIONS = [
  { id: 'prologue', index: '00', short: 'Prologue' },
  { id: 'mars-rovers', index: '01', short: 'Spirit & Opportunity' },
  { id: 'ingenuity', index: '02', short: 'Ingenuity' },
  { id: 'landers', index: '03', short: 'Phoenix & InSight' },
  { id: 'surveyor', index: '04', short: 'Surveyor 3' },
  { id: 'kepler', index: '05', short: 'Kepler' },
  { id: 'epilogue', index: '06', short: 'Epilogue' },
]

const CHAPTERS = [
  {
    id: 'mars-rovers',
    index: '01',
    kicker: 'Gusev Crater & Meridiani Planum — Mars — 2004–2018',
    title: (
      <>
        The Twin Rovers
        <br />
        <span className="font-display italic text-gold">
          That Conquered Mars
        </span>
      </>
    ),
    body: `Launched in 2003 with a 90-day warranty, Spirit and Opportunity were sent to prove that Mars once ran with liquid water. Both refused to quit. Opportunity drove 45.16 kilometres across Meridiani Planum — farther than any wheeled vehicle on another world — and kept working for nearly fifteen years. Spirit climbed the Columbia Hills, then sank into the silica-rich soil of Troy in 2010 and never answered again.`,
    stats: [
      { value: '90 days', label: 'Planned mission' },
      { value: '15 years', label: "Opportunity's service" },
      { value: '45.16 km', label: 'Longest off-world drive' },
    ],
  },
  {
    id: 'ingenuity',
    index: '02',
    kicker: 'Jezero Crater — Mars — 2021–2024',
    title: (
      <>
        First Powered Flight
        <br />
        <span className="font-display italic text-gold">
          on Another World
        </span>
      </>
    ),
    body: `The first aircraft to fly on another world was a 1.8-kilogram helicopter that hitched a ride to Mars as a 30-day technology demonstration. Ingenuity flew 72 times, scouting ahead of Perseverance and surviving winters it was never designed for — 17 kilometres and 128.8 minutes in air thinner than any on Earth. On its final flight, in January 2024, a rotor blade broke on touchdown. It rests now in Valinor Hills.`,
    stats: [
      { value: '72', label: 'Flights completed' },
      { value: '5', label: 'Flights planned' },
      { value: '128.8 min', label: 'Total flight time' },
    ],
  },
  {
    id: 'landers',
    index: '03',
    kicker: 'Vastitas Borealis & Elysium Planitia — 2008 / 2018',
    title: (
      <>
        Mars Stationary
        <br />
        <span className="font-display italic text-gold">Explorers</span>
      </>
    ),
    body: `Two landers that never moved, and never needed to. Phoenix touched down in the Martian arctic in 2008 and scraped through the soil until it struck water ice — the first time another world's water had been touched. Ten years later InSight landed near the equator to listen instead, recording more than 1,300 marsquakes through a single seismometer and measuring the size of Mars' core. Both were slowly buried by dust, and both went silent.`,
    stats: [
      { value: '2008', label: 'Phoenix landing' },
      { value: '1,300+', label: 'Marsquakes heard' },
      { value: '1,830 km', label: 'Core radius' },
    ],
  },
  {
    id: 'surveyor',
    index: '04',
    kicker: 'Oceanus Procellarum — Moon — 1967 / 1969',
    title: (
      <>
        The Moon&apos;s
        <br />
        <span className="font-display italic text-gold">
          Pre-Apollo Visitors
        </span>
      </>
    ),
    body: `Surveyor 3 landed in Oceanus Procellarum on 20 April 1967, two years before Apollo 11, to prove that the lunar surface could hold a spacecraft. It returned more than 6,000 photographs and dug into the regolith. In November 1969 Apollo 12 set down 163 metres away and Pete Conrad and Alan Bean walked over to it — the only time humans have visited a robot on another world. They cut away its camera and brought it home, where scientists found microbes that had survived 31 months in vacuum.`,
    stats: [
      { value: '1967', label: 'Surveyor 3 landing' },
      { value: '163 m', label: 'Apollo 12 walk' },
      { value: '31 months', label: 'Exposure on the Moon' },
    ],
  },
  {
    id: 'kepler',
    index: '05',
    kicker: 'Heliocentric orbit — 2009–2018',
    title: (
      <>
        The Telescope
        <br />
        <span className="font-display italic text-gold">
          That Found Other Earths
        </span>
      </>
    ),
    body: `Kepler was never sent to a planet. Launched in 2009, it was parked in a solar orbit that trails the Earth and pointed at one patch of sky for four years, watching 150,000 stars for the faint dip of a world crossing in front of one. It found more than 2,600 planets — lava worlds, ice worlds, planets circling two suns at once — and showed that planets are more common than stars. Two of its four reaction wheels failed, so engineers learned to steer it with sunlight instead. When the hydrazine ran out in October 2018, it was switched off mid-orbit. It still circles the Sun every 371 days, silent, with no way home.`,
    stats: [
      { value: '2,600+', label: 'Worlds confirmed' },
      { value: '150,000', label: 'Stars watched' },
      { value: '371 days', label: 'Solar orbit' },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  Small interface elements                                          */
/* ------------------------------------------------------------------ */
function Kicker({ index, label }) {
  return (
    <div className="flex items-center gap-4 font-mono text-[9px] uppercase tracking-[0.32em] text-bone/45 md:text-[10px]">
      <span className="text-gold">{index}</span>
      <span className="h-px w-8 bg-gold/45" />
      <span>{label}</span>
    </div>
  )
}

function Stats({ items }) {
  return (
    <ul className="mt-10 grid grid-cols-3 gap-3 border-t border-white/10 pt-6 md:mt-12 md:gap-6">
      {items.map((item) => (
        <li key={item.label}>
          <p className="font-display text-[clamp(1.5rem,2.2vw,2rem)] leading-none text-bone/90">
            {item.value}
          </p>
          <p className="mt-2 font-mono text-[7px] uppercase leading-relaxed tracking-[0.2em] text-bone/35 md:text-[8px]">
            {item.label}
          </p>
        </li>
      ))}
    </ul>
  )
}

function TopBar({ onOpenQuiz }) {
  return (
    <header className="pointer-events-auto fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-4 px-6 py-5 md:px-10 md:py-7">
      <a href="#prologue" className="group flex items-center gap-3">
        <span className="relative grid h-7 w-7 place-items-center">
          <span className="absolute inset-0 rounded-full border border-bone/25 transition-colors group-hover:border-gold/70" />
          <span className="absolute inset-[-4px] rounded-full border border-bone/10" />
          <span className="h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_14px_rgba(217,170,99,0.9)]" />
        </span>
        <span className="leading-none">
          <span className="block font-mono text-[8px] uppercase tracking-[0.3em] text-bone/40">
            NASA Space Apps
          </span>
          <span className="mt-1 block text-[10px] uppercase tracking-[0.26em] text-bone/85">
            Orbital Archive
          </span>
        </span>
      </a>

      <button
        type="button"
        onClick={onOpenQuiz}
        aria-label="Take the Artifact Quiz"
        className="group flex items-center gap-2.5 border border-gold/50 bg-gold/[0.06] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.2em] text-gold transition-all duration-300 hover:border-gold hover:bg-gold/15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/60 md:px-4 md:py-2.5 md:text-[9px] md:tracking-[0.22em]"
      >
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold/60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold" />
        </span>
        <span className="hidden sm:inline">Take the Artifact Quiz</span>
        <span className="sm:hidden">Quiz</span>
      </button>
    </header>
  )
}

function SideRail({ active }) {
  return (
    <nav
      aria-label="Story progression"
      className="pointer-events-auto fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-5 lg:flex lg:right-8"
    >
      {SECTIONS.map((section, index) => {
        const isActive = active === index
        return (
          <a
            key={section.id}
            href={`#${section.id}`}
            aria-label={`${section.index} — ${section.short}`}
            aria-current={isActive ? 'true' : undefined}
            className="group flex items-center gap-3"
          >
            <span
              className={`font-mono text-[8px] uppercase tracking-[0.24em] transition-all duration-500 ${
                isActive ? 'text-bone/80' : 'text-bone/40'
              } opacity-0 group-hover:opacity-100`}
            >
              {section.short}
            </span>
            <span
              className={`block h-px transition-all duration-500 ${
                isActive
                  ? 'w-9 bg-gold'
                  : 'w-4 bg-bone/25 group-hover:w-6 group-hover:bg-bone/50'
              }`}
            />
          </a>
        )
      })}
    </nav>
  )
}

/* A soft pool of darkness behind the copy. A plain gradient (no filter)
   keeps the composite cheap while the page scrolls. */
function CopyHalo({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute -inset-x-10 -inset-y-14 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(5,6,10,0.92)_0%,rgba(5,6,10,0.62)_46%,transparent_78%)] ${className}`}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  HTML overlay (the Canvas stays fixed behind it)                   */
/* ------------------------------------------------------------------ */
export default function Overlay({ entered, onOpenQuiz, onActiveChange }) {
  const rootRef = useRef(null)
  const progressNumberRef = useRef(null)
  const progressBarRef = useRef(null)
  const hudRef = useRef(null)
  const [activeSection, setActiveSection] = useState(0)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return undefined

    const ctx = gsap.context(() => {
      const sections = Array.from(root.querySelectorAll('[data-section]'))

      sections.forEach((section, index) => {
        const content = section.querySelector('[data-section-content]')
        if (!content) return

        // The prologue is revealed by the hero animation once the loader
        // has left; scrolling back up should not hide it again.
        if (index > 0) {
          // Transform + opacity only: no scrubbed blur, no filtered
          // repaints while the wheel is moving.
          gsap.fromTo(
            content,
            { autoAlpha: 0, y: 28 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.6,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: section,
                start: 'top 82%',
                toggleActions: 'play none none reverse',
              },
            },
          )
        }

        ScrollTrigger.create({
          trigger: section,
          start: 'top 68%',
          end: 'bottom 32%',
          onEnter: () => {
            setActiveSection(index)
            onActiveChange?.(section.id)
          },
          onEnterBack: () => {
            setActiveSection(index)
            onActiveChange?.(section.id)
          },
        })
      })

      /* HUD: percentage + gauge, written directly to the DOM */
      let lastPercent = -1
      let lastVisible = null

      ScrollTrigger.create({
        trigger: root,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => {
          const percent = Math.round(self.progress * 100)

          if (percent !== lastPercent) {
            lastPercent = percent

            if (progressNumberRef.current) {
              progressNumberRef.current.textContent = String(percent).padStart(
                3,
                '0',
              )
            }
            if (progressBarRef.current) {
              progressBarRef.current.style.transform = `scaleX(${self.progress})`
            }
          }

          const visible = self.progress > 0.012
          if (visible !== lastVisible && hudRef.current) {
            lastVisible = visible
            hudRef.current.style.opacity = visible ? '1' : '0'
          }
        },
      })

      if (document.fonts?.ready) {
        document.fonts.ready.then(() => ScrollTrigger.refresh()).catch(() => {})
      }
    }, root)

    return () => ctx.revert()
  }, [onActiveChange])

  /* Narrative entrance after the LoadingScreen */
  useEffect(() => {
    if (!entered) return undefined

    const root = rootRef.current
    if (!root) return undefined

    const tl = gsap.fromTo(
      root.querySelectorAll('[data-hero-reveal]'),
      { autoAlpha: 0, y: 28 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 1.15,
        stagger: 0.09,
        ease: 'power3.out',
        delay: 0.1,
      },
    )

    return () => tl.kill()
  }, [entered])

  return (
    <div
      ref={rootRef}
      className={`relative z-10 transition-opacity duration-1000 ${
        entered ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <TopBar onOpenQuiz={onOpenQuiz} />
      <SideRail active={activeSection} />

      <main className="overflow-x-clip">
        {/* ───────────────────────── PROLOGUE ───────────────────────── */}
        <section
          id="prologue"
          data-section
          className="relative flex min-h-screen flex-col justify-end px-6 pb-[8vh] pt-28 md:px-12 md:pb-[9vh] lg:px-20"
        >
          <div
            data-section-content
            className="mx-auto w-full max-w-[1600px]"
          >
            <div className="relative w-full max-w-[54rem] md:max-w-[min(54rem,50vw)]">
              <CopyHalo className="hidden md:block" />

              <div data-hero-reveal className="max-w-[46rem]">
                <span className="inline-block border border-gold/35 px-3 py-1.5 font-mono text-[8px] uppercase tracking-[0.28em] text-gold md:text-[9px]">
                  NASA Space Apps Challenge — 2026
                </span>
                <p className="mt-3 max-w-[34rem] text-[9px] leading-relaxed tracking-[0.14em] text-bone/35 [text-shadow:0_1px_12px_rgba(5,6,10,0.9)]">
                  <span className="text-gold/70">Official challenge — </span>
                  Abandoned but not Forgotten: Storytelling about NASA's
                  Discarded Equipment on the Moon and Mars
                </p>
              </div>

              <h1
                data-hero-reveal
                className="mt-6 text-[clamp(3.2rem,8.2vw,8.4rem)] font-light leading-[0.84] tracking-[-0.055em] text-bone [text-shadow:0_2px_60px_rgba(0,0,0,0.55)]"
              >
                <span className="block">Abandoned,</span>
                <span className="block font-display italic tracking-[-0.03em] text-gold">
                  Not Forgotten
                </span>
              </h1>

              <p
                data-hero-reveal
                className="mt-8 max-w-[32rem] text-[14px] leading-relaxed text-bone/55 md:text-[16px]"
              >
                A 3D interactive journey through humanity's silent technological
                legacy on the Moon and Mars, built for the NASA Space Apps
                Challenge.
              </p>

              <div
                data-hero-reveal
                className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-white/10 pt-5 font-mono text-[8px] uppercase tracking-[0.24em] text-bone/35 md:text-[9px]"
              >
                <span>Spirit &amp; Opportunity — 2004</span>
                <span>Ingenuity — 2021</span>
                <span>Phoenix &amp; InSight — 2008 / 2018</span>
                <span>Surveyor 3 — 1967</span>
                <span>Kepler — 2009</span>
              </div>
            </div>

            <div
              data-hero-reveal
              className="mt-10 flex items-center gap-3 border-t border-white/10 pt-5 font-mono text-[8px] uppercase tracking-[0.26em] text-bone/35 md:mt-14 md:text-[9px]"
            >
              <span className="relative block h-8 w-px overflow-hidden bg-white/15">
                <span className="animate-cue absolute inset-x-0 top-0 block h-1/2 bg-gold" />
              </span>
              Scroll to explore historical artifacts
            </div>
          </div>
        </section>

        {/* ───────────────────────── CHAPTERS ───────────────────────── */}
        {CHAPTERS.map((chapter) => (
          <section
            key={chapter.id}
            id={chapter.id}
            data-section
            className="relative flex min-h-screen items-end px-6 pb-24 pt-28 md:items-center md:px-12 md:py-32 lg:px-20"
          >
            <div data-section-content className="mx-auto w-full max-w-[1600px]">
              <div className="relative w-full max-w-[35rem] md:max-w-[min(34rem,50vw)]">
                <CopyHalo />

                {/* Ghost numeral */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -left-4 -top-28 select-none font-display text-[13rem] italic leading-none text-bone/[0.04] md:-left-12 md:-top-40 md:text-[20rem]"
                >
                  {chapter.index}
                </span>

                <Kicker index={chapter.index} label={chapter.kicker} />

                <h2 className="mt-6 font-display text-[clamp(2.35rem,4.3vw,4.35rem)] leading-[1.01] tracking-[-0.02em] text-bone [text-shadow:0_2px_40px_rgba(0,0,0,0.5)]">
                  {chapter.title}
                </h2>

                <p className="mt-6 max-w-[31rem] text-[13px] leading-relaxed text-bone/55 md:mt-8 md:text-[15px]">
                  {chapter.body}
                </p>

                <Stats items={chapter.stats} />
              </div>
            </div>
          </section>
        ))}

        {/* ───────────────────────── EPILOGUE ───────────────────────── */}
        <section
          id="epilogue"
          data-section
          className="relative flex min-h-screen flex-col justify-end px-6 pb-20 pt-28 md:px-12 lg:px-20"
        >
          <div
            data-section-content
            className="relative mx-auto w-full max-w-[1600px]"
          >
            <div className="relative w-full max-w-[40rem] md:max-w-[min(40rem,50vw)]">
              <CopyHalo />

              <Kicker index="06" label="Epilogue" />

              <h2 className="mt-8 text-[clamp(2.8rem,7.2vw,7rem)] font-light leading-[0.86] tracking-[-0.05em] text-bone [text-shadow:0_2px_60px_rgba(0,0,0,0.55)]">
                Not
                <br />
                <span className="font-display italic text-gold">
                  forgotten.
                </span>
              </h2>

              <p className="mt-7 max-w-md text-[14px] leading-relaxed text-bone/55 md:text-[15px]">
                Since the 1960s, NASA has left hardware on the Moon and on Mars:
                rovers in the dust, landers in the cold, a helicopter in the
                hills — and, farther out, a telescope still circling the Sun.
                The archive is open: revisit the signals, images, and silences of
                the machines we left behind.
              </p>

              <button
                type="button"
                onClick={onOpenQuiz}
                className="group relative mt-9 inline-flex items-center gap-3 border border-gold/60 bg-gold/[0.08] px-5 py-4 font-mono text-[8px] uppercase tracking-[0.24em] text-gold transition-colors duration-300 hover:bg-gold/15 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/70 md:text-[9px]"
              >
                <span className="relative flex h-1.5 w-1.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold/60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold" />
                </span>
                Take the Artifact Quiz
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                  className="shrink-0 transition-transform duration-500 group-hover:translate-x-1"
                >
                  <path
                    d="M2 8h11M9 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                </svg>
              </button>

              <p className="mt-6 max-w-sm text-[10px] leading-relaxed tracking-[0.02em] text-bone/35">
                An interactive archive created for the NASA Space Apps
                Challenge.
              </p>
            </div>

            <div className="mt-20 hidden flex-wrap items-end justify-between gap-5 border-t border-white/10 pt-6 font-mono text-[8px] uppercase tracking-[0.24em] text-bone/25 [@media(min-height:780px)]:flex md:mt-24 md:text-[9px]">
              <span>NASA Space Apps Challenge — 2026</span>
              <span className="max-w-xl text-center text-bone/40">
                Abandoned but not Forgotten: Storytelling about NASA's Discarded
                Equipment on the Moon and Mars
              </span>
              <span>Source — NASA / JPL / NSSDC</span>
            </div>
          </div>
        </section>
      </main>

      {/* Bottom HUD */}
      <div
        ref={hudRef}
        style={{ opacity: 0 }}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex items-end justify-between gap-6 px-6 pb-5 font-mono text-[8px] uppercase tracking-[0.28em] text-bone/35 transition-opacity duration-500 md:px-10 md:pb-7 md:text-[9px]"
      >
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline">Progress</span>
          <span className="relative block h-px w-16 overflow-hidden bg-white/10 md:w-24">
            <span
              ref={progressBarRef}
              className="absolute inset-0 block origin-left scale-x-0 bg-gold/80"
            />
          </span>
          <span ref={progressNumberRef} className="tabular-nums text-bone/65">
            000
          </span>
          <span>%</span>
        </div>

        <div className="hidden items-center gap-6 md:flex">
          <span>Archive 1967 — 2026</span>
          <span className="h-3 w-px bg-white/15" />
          <span>Move the cursor to orbit</span>
        </div>
      </div>
    </div>
  )
}
