import { useEffect, useRef, useState } from 'react'

/**
 * Six questions across the archive.
 * Rendered inside QuizModal, which owns the panel chrome, focus trap
 * and close behaviour. All state stays local here.
 */
const QUESTIONS = [
  {
    id: 'rovers-lifespan',
    short: 'Rovers',
    meta: 'Spirit & Opportunity — Mars, 2004',
    question:
      'What was the original planned lifespan of the twin Mars rovers?',
    options: ['90 days', '5 years', '1 year'],
    answer: 0,
    note: 'Both rovers were built for a 90-sol primary mission. Spirit kept working for six years, Opportunity for nearly fifteen — one of the greatest engineering over-deliveries in space history.',
  },
  {
    id: 'spirit-stuck',
    short: 'Rovers',
    meta: 'Spirit — Gusev Crater, 2010',
    question:
      'In which Martian landmark did Spirit become permanently stuck in 2010?',
    options: ['Gale Crater', 'Troy silica-rich soil', 'Jezero Crater'],
    answer: 1,
    note: 'In May 2009 Spirit broke through a crust into soft, silica-rich soil at Troy. Unable to free its wheels, it worked on as a stationary lander until contact was lost on 22 March 2010.',
  },
  {
    id: 'ingenuity-flights',
    short: 'Ingenuity',
    meta: 'Ingenuity — Jezero Crater, 2021–2024',
    question:
      'How many successful flights did Ingenuity complete before retirement, despite being designed for only 5?',
    options: ['25', '50', '72'],
    answer: 2,
    note: 'Designed for five flights in 30 days, Ingenuity logged 72 flights between April 2021 and January 2024 — 128.8 minutes in the air and 17 kilometres flown.',
  },
  {
    id: 'ingenuity-damage',
    short: 'Ingenuity',
    meta: 'Ingenuity — final flight, 2024',
    question:
      'On which Martian moon or region did Ingenuity suffer the rotor blade damage that ended its mission?',
    options: ['Valinor Hills', 'Olympus Mons', 'Phobos'],
    answer: 0,
    note: 'On its 72nd flight, on 18 January 2024, Ingenuity landed hard at Valinor Hills. Images later showed a damaged rotor blade. It never flew again — the first aircraft abandoned on another world.',
  },
  {
    id: 'phoenix-ice',
    short: 'Phoenix',
    meta: 'Phoenix — Vastitas Borealis, 2008',
    question:
      'What did Phoenix confirm when it scraped away the Martian soil at its landing site?',
    options: [
      'An ocean of liquid water at the equator',
      'Water ice just below the surface',
      'A layer of frozen methane',
    ],
    answer: 1,
    note: 'Phoenix dug into the arctic plains in June 2008 and exposed bright white material that turned out to be water ice. It was the first mission to touch another world\u2019s water, and the ice sublimated away in the images within days.',
  },
  {
    id: 'surveyor-apollo',
    short: 'Surveyor 3',
    meta: 'Surveyor 3 & Apollo 12 — Oceanus Procellarum, 1969',
    question:
      'Which Apollo crew walked to a spacecraft that was already sitting on the Moon?',
    options: ['Apollo 11', 'Apollo 12', 'Apollo 17'],
    answer: 1,
    note: 'Apollo 12 landed 163 metres from Surveyor 3 in November 1969. Pete Conrad and Alan Bean walked over and cut away its camera — the only human visit to a robotic probe on another world, and the source of the famous 31-month exposure experiment.',
  },
]

const TOTAL = QUESTIONS.length

function summaryMessage(score) {
  if (score === TOTAL) {
    return 'Perfect signal. You read the archive like a mission log — every artifact accounted for.'
  }
  if (score === TOTAL - 1) {
    return 'Strong transmission. One artifact still keeps a secret — scroll back through the story and it will tell you.'
  }
  if (score >= TOTAL / 2) {
    return 'Solid telemetry. Half the archive is decoded; the rest is still waiting in the chapters above.'
  }
  if (score > 0) {
    return 'Signal received. The hardware in this archive has more to say — a second pass will reward you.'
  }
  return 'Faint signal. Every one of these machines outlived its warranty; the stories are still above.'
}

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M3 8.5 6.2 11.7 13 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CrossIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M4 4l8 8M12 4l-8 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function ArtifactQuiz() {
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState(null)
  const [results, setResults] = useState(() => Array(TOTAL).fill(null))
  const [finished, setFinished] = useState(false)

  const questionRef = useRef(null)
  const summaryRef = useRef(null)
  const interacted = useRef(false)

  const question = QUESTIONS[step]
  const answered = selected !== null
  const score = results.filter(Boolean).length
  const isCorrect = selected === question?.answer

  /* Move focus to the new heading only after the visitor starts playing. */
  useEffect(() => {
    if (!interacted.current) return
    const target = finished ? summaryRef.current : questionRef.current
    target?.focus({ preventScroll: true })
  }, [step, finished])

  const handleSelect = (index) => {
    if (answered) return
    interacted.current = true
    setSelected(index)
    setResults((previous) => {
      const next = [...previous]
      next[step] = index === question.answer
      return next
    })
  }

  const handleNext = () => {
    if (!answered) return
    interacted.current = true
    if (step === TOTAL - 1) {
      setFinished(true)
      return
    }
    setStep((value) => value + 1)
    setSelected(null)
  }

  const handleReplay = () => {
    interacted.current = true
    setStep(0)
    setSelected(null)
    setResults(Array(TOTAL).fill(null))
    setFinished(false)
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Progress + live score */}
      <div className="flex items-center justify-between gap-4 px-5 pt-5 font-mono text-[8px] uppercase tracking-[0.26em] md:px-7 md:text-[9px]">
        <span className="text-gold">
          {finished ? 'Result' : `Question 0${step + 1} / 0${TOTAL}`}
        </span>
        <span className="tabular-nums text-bone/55" aria-live="polite">
          Score: {score}/{TOTAL}
        </span>
      </div>

      {/* Six-segment gauge */}
      <div className="flex gap-1.5 px-5 pt-4 md:px-7" aria-hidden="true">
        {QUESTIONS.map((item, index) => (
          <span
            key={item.id}
            className={`h-px flex-1 transition-colors duration-500 ${
              finished || index < step
                ? 'bg-gold/70'
                : index === step
                  ? 'bg-bone/40'
                  : 'bg-white/10'
            }`}
          />
        ))}
      </div>

      {finished ? (
        /* ─────────────────────────── SUMMARY ─────────────────────────── */
        <div key="summary" className="animate-quiz-in px-5 py-6 md:px-7 md:py-7">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-gold md:text-[9px]">
                Final score
              </p>
              <p
                ref={summaryRef}
                tabIndex={-1}
                className="mt-3 font-display text-[clamp(3rem,6.5vw,4.5rem)] leading-none tracking-[-0.03em] text-bone outline-none"
              >
                {score}
                <span className="text-bone/45">/{TOTAL}</span>
              </p>
            </div>

            <ul className="grid grid-cols-1 gap-x-8 gap-y-1.5 font-mono text-[8px] uppercase tracking-[0.22em] sm:grid-cols-2 md:text-[9px]">
              {QUESTIONS.map((item, index) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-4 text-bone/50"
                >
                  <span>{item.short}</span>
                  <span
                    className={
                      results[index] ? 'text-emerald-300/90' : 'text-rose-300/80'
                    }
                  >
                    {results[index] ? 'Correct' : 'Missed'}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p
            role="status"
            aria-live="polite"
            className="mt-5 max-w-lg text-[12.5px] leading-relaxed text-bone/55 md:text-[13.5px]"
          >
            {summaryMessage(score)}
          </p>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-stretch">
            <button
              type="button"
              onClick={handleReplay}
              className="group flex items-center justify-center gap-2.5 border border-bone/20 px-5 py-3 font-mono text-[8px] uppercase tracking-[0.24em] text-bone/60 transition-colors duration-300 hover:border-bone/45 hover:text-bone focus-visible:border-gold focus-visible:text-gold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/50 md:text-[9px]"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                className="transition-transform duration-500 group-hover:-rotate-180"
              >
                <path
                  d="M3 8a5 5 0 1 1 1.6 3.7M3 8V4.6M3 8h3.4"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Replay quiz
            </button>
          </div>
        </div>
      ) : (
        /* ────────────────────────── QUESTION ─────────────────────────── */
        <div key={step} className="animate-quiz-in px-5 py-5 md:px-7 md:py-6">
          <p className="font-mono text-[8px] uppercase tracking-[0.26em] text-bone/50 md:text-[9px]">
            {question.meta}
          </p>

          <h3
            ref={questionRef}
            tabIndex={-1}
            className="mt-2.5 text-[14.5px] font-normal leading-snug tracking-tight text-bone/90 outline-none md:text-[16.5px]"
          >
            {question.question}
          </h3>

          <ul className="mt-5 space-y-2">
            {question.options.map((option, index) => {
              const correct = index === question.answer
              const chosen = index === selected

              let tone =
                'border-white/10 text-bone/70 hover:border-gold/50 hover:bg-bone/[0.04]'
              if (answered) {
                if (correct) {
                  tone =
                    'border-emerald-400/50 bg-emerald-400/[0.08] text-emerald-50'
                } else if (chosen) {
                  tone = 'border-rose-400/50 bg-rose-400/[0.08] text-rose-50'
                } else {
                  tone = 'border-white/[0.06] text-bone/30'
                }
              }

              return (
                <li key={option}>
                  <button
                    type="button"
                    onClick={() => handleSelect(index)}
                    aria-disabled={answered}
                    aria-pressed={chosen}
                    className={`flex w-full items-center gap-3.5 border px-4 py-3 text-left text-[12px] leading-snug transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/60 aria-disabled:cursor-default md:text-[13px] ${tone}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border font-mono text-[8px] transition-colors duration-300 ${
                        answered && correct
                          ? 'border-emerald-300/60 text-emerald-200'
                          : answered && chosen
                            ? 'border-rose-300/60 text-rose-200'
                            : 'border-white/25 text-bone/60'
                      }`}
                    >
                      {'ABC'[index]}
                    </span>
                    <span className="sr-only">Option {'ABC'[index]}: </span>
                    <span className="flex-1">{option}</span>
                    {answered && correct && (
                      <span className="text-emerald-300">
                        <CheckIcon />
                      </span>
                    )}
                    {answered && chosen && !correct && (
                      <span className="text-rose-300">
                        <CrossIcon />
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>

          {/* Instant feedback */}
          <div role="status" aria-live="polite">
            {answered && (
              <div
                className={`animate-quiz-in mt-4 border-l pl-3.5 ${
                  isCorrect
                    ? 'border-emerald-400/50'
                    : 'border-rose-400/50'
                }`}
              >
                <p
                  className={`font-mono text-[8px] uppercase tracking-[0.26em] ${
                    isCorrect ? 'text-emerald-300/80' : 'text-rose-300/80'
                  }`}
                >
                  {isCorrect ? 'Correct' : 'Not quite'}
                </p>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-bone/55 md:text-[12.5px]">
                  {question.note}
                </p>
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between gap-4">
            <p className="font-mono text-[8px] uppercase tracking-[0.26em] text-bone/50">
              {answered ? 'Answer locked' : 'Choose an answer'}
            </p>

            <button
              type="button"
              onClick={handleNext}
              disabled={!answered}
              className={`group flex items-center gap-2 border px-4 py-2.5 font-mono text-[8px] uppercase tracking-[0.24em] transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/60 md:text-[9px] ${
                answered
                  ? 'border-gold/50 text-gold hover:bg-gold/10'
                  : 'cursor-default border-white/[0.06] text-bone/35'
              }`}
            >
              {step === TOTAL - 1 ? 'See result' : 'Next question'}
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
                className="transition-transform duration-500 group-hover:translate-x-1"
              >
                <path
                  d="M2 8h11M9 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
