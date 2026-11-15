# Abandoned, Not Forgotten — Orbital Archive

A **3D scrollytelling** experience built for the **NASA Space Apps Challenge**.

> **Official challenge:** Abandoned but not Forgotten: Storytelling about NASA's Discarded Equipment on the Moon and Mars

A fixed WebGL canvas, an HTML narrative that scrolls past it, and a GSAP timeline that
drives the lights. The artifact itself never moves: it holds one fixed stage slot
while its rotation follows the cursor.

A Solar System prologue, five abandoned artifacts, and a Solar System epilogue:
**Spirit & Opportunity**, **Ingenuity**, **Phoenix & InSight**, **Surveyor 3** and
**Kepler**. A standalone six-question quiz opens from the header.


> "They never stopped working. They stopped being heard."

---

## Stack

| Tool | Role |
| --- | --- |
| **React + Vite** | App, HMR, build |
| **Tailwind CSS** | Design system, responsive layout, typography |
| **Three.js / @react-three/fiber** | Declarative 3D scene |
| **@react-three/drei** | `Stars`, `Sparkles`, `MeshDistortMaterial`, `useGLTF`, `useAnimations`, `useProgress` |
| **GSAP + ScrollTrigger** | Scrubbed timeline and per-section reveals |

---

## Installation

Requirements: **Node.js 20 LTS or newer** and npm.

```bash
# 1. Move into the project
cd "C:\Users\moham\Documents\Projet par défaut"

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Vite prints the local URL (default `http://localhost:5173`).

### Production build

```bash
npm run build
npm run preview
```

### Starting over from scratch (if needed)

```bash
npm create vite@latest orbital-archive -- --template react
cd orbital-archive
npm install
npm install three @react-three/fiber @react-three/drei gsap
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
```

Then copy this project's files over and run `npm run dev`.

---

## Structure

```text
.
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .env.example
├── public/
│   ├── favicon.svg
│   ├── robots.txt
│   └── models/
│       ├── solar-system.glb
│       ├── opportunity.glb
│       ├── ingenuity.glb
│       ├── insight.glb
│       ├── surveyor3.glb
│       ├── kepler.glb
│       └── README.md
└── src/
    ├── main.jsx
    ├── App.jsx                # scroll timeline + page composition
    ├── index.css              # Tailwind + grain, base type
    ├── lib/
    │   └── scrollState.js     # shared mutable state, GSAP <-> R3F
    └── components/
        ├── Canvas3D.jsx       # fixed canvas, lights, per-chapter GLB
        ├── LoadingScreen.jsx  # loading screen + percentage
        ├── ArtifactQuiz.jsx   # six-question knowledge check
        ├── QuizModal.jsx      # full-screen quiz panel (portal)
        └── Overlay.jsx        # 100vh sections, HUD, header, CTA
```

---

## 3D / scroll architecture

### 1. The canvas is fixed, the narrative scrolls

`Canvas3D` renders inside a `fixed inset-0 z-0` container. The HTML sections in
`Overlay` sit on top with `z-10` and scroll normally. The camera, the stage and
the artifact are fixed; scrolling only changes the lights.

### 2. Two kinds of motion, neither tied to React

`src/lib/scrollState.js` exports a mutable object with the lighting targets only:

```js
{ keyIntensity, rimIntensity, glow }
```

- **Scroll → light.** A single GSAP timeline writes those three numbers; `useFrame`
  damps the real light intensities toward them.
- **Pointer → rotation.** A passive `pointermove` listener on `window` stores the
  cursor position (the canvas sits behind the copy, so canvas-only events would
  stop at the text). `Stage` damps the group rotation around a fixed rest pose
  per artifact (`baseX` / `baseY` in `STAGE`). There is **no** X/Y/Z translation
  and no camera dolly: the artifact cannot slide when chapters change.
- **Viewport → placement.** `placementFor()` computes the stage slot once per
  resize (right of the copy on desktop, above it on phones) and that position is
  passed as a React prop, so the frame loop never touches it.

Because nothing visual depends on scroll except intensity, the browser has no
per-frame layout or paint work to do beyond compositing.

### 3. The main timeline

In `App.jsx`, a single timeline is scrubbed across the full page height:

```js
gsap.timeline({
  scrollTrigger: {
    trigger: root,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.7,
  },
})
```

Six lighting movements:

| Scroll | Chapter | Light |
| --- | --- | --- |
| 0 → 17 % | Prologue → Spirit & Opportunity | key drops, amber glow rises |
| 17 → 33 % | Ingenuity | brightest key, almost no rim |
| 33 → 50 % | Phoenix & InSight | warmer key, strong amber pool |
| 50 → 67 % | Surveyor 3 | colder rim, medium key |
| 67 → 83 % | Kepler | distant key, strongest blue rim, almost no amber |
| 83 → 100 % | Epilogue | quiet, low-key, strong blue rim |

The visible artifact is driven by `ARTIFACT_BY_SECTION` in `App.jsx`: `Overlay`
reports the section in view, `App` maps it to an artifact id (set directly, no
`startTransition`: the swap must land on the frame the section changes), and
`Canvas3D` hands the stage over between layers that are already resident on the
GPU. The outgoing model holds at full opacity until the incoming one has drawn,
so a slow download never leaves an empty stage.

### 4. The copy

Each section in `Overlay.jsx` fades in with a non-scrubbed `ScrollTrigger`
(`toggleActions`, opacity + translate only, 0.6 s). The artifact hand-over is
triggered at `top 68%`, just after the copy starts arriving, so the model and the
text change together. There is no scrubbed `filter: blur()` and no blurred halo
behind the type: both forced expensive repaints on every scroll frame. The copy
always occupies the left column, leaving the stage clear for the artifact.

---

## Space Artifact Quiz

The quiz is an independent view, not a page section. The header button
**Take the Artifact Quiz** (and a text link in the epilogue) opens
`QuizModal`, a full-screen panel rendered in a portal.

- Six questions across the archive: Spirit & Opportunity (×2), Ingenuity (×2),
  Phoenix, and Surveyor 3 / Apollo 12.
- Instant feedback: the chosen row turns emerald or rose, the correct row is
  always revealed, and a detailed note explains the answer.
- Live `Score: n/6` in the modal header, plus a six-segment progress gauge.
- Answers are locked after the first pick (`aria-disabled` + guard), so the
  score cannot be farmed.
- After the sixth answer the panel switches to a summary: final score, a
  per-question recap, a message that adapts to the score, and **Replay quiz**.
- Closing: the **Close Quiz** button, backdrop click, or `Escape`. Focus is
  trapped, page scroll is locked, and focus returns to the trigger.
- State lives entirely in `ArtifactQuiz.jsx`; `QuizModal.jsx` only owns the
  chrome and the open/close choreography.

To add or change a question, edit the `QUESTIONS` array at the top of
`src/components/ArtifactQuiz.jsx` (`question`, `options`, `answer` index,
`note`, `meta`, `short`). The gauge and the `n/6` counters derive from its
length.

---

## 3D models

The five artifacts live in `public/models/` and are mapped in
`src/components/Canvas3D.jsx`:

```js
const MODELS = {
  solar: '/models/solar-system.glb',
  rovers: import.meta.env.VITE_MODEL_URL || '/models/opportunity.glb',
  ingenuity: '/models/ingenuity.glb',
  landers: '/models/insight.glb',
  surveyor: '/models/surveyor3.glb',
  kepler: '/models/kepler.glb',
}
```

- Prologue + Epilogue → `solar-system.glb` (the frame, not an artifact)
- Spirit & Opportunity → `opportunity.glb`
- Ingenuity → `ingenuity.glb`
- Phoenix & InSight → `insight.glb`
- Surveyor 3 → `surveyor3.glb`
- Kepler → `kepler.glb`

`.env` optionally overrides the Opportunity entry (`VITE_MODEL_URL`); the other
five are fixed in code. Vite reads `.env` only at startup, so restart
`npm run dev` after changing it.

`buildModel` automatically centers and rescales each model (bounding box,
longest axis ≈ 2.6 units), clones its materials for the crossfade, and drops it
into the shared stage. The Solar System is framed at ×1.5 (`STAGE`) while its
20 s orbit animation plays at 0.45×. Every artifact keeps a fixed rest pose
(`baseX` / `baseY`) that the cursor tilts around, so export them Y up.

### Hand-over between artifacts

Every artifact that has ever taken the stage stays mounted. Layers have four
phases:

| Phase | Meaning |
| --- | --- |
| `warm` | mounted, drawn once at `opacity: 0`, then parked (`visible: false`): textures uploaded, shaders compiled, zero draw cost |
| `incoming` | requested by the scroll, not yet drawn |
| `active` | fading up to full opacity |
| `leaving` | fading out, then back to `warm` |

1. one chapter *before* it is needed, the next artifact is mounted on idle time
   and draws two frames at `opacity: 0`; the renderer then parks it;
2. when the reader reaches its chapter it is promoted instantly — no parse, no
   GPU upload, no stall on the swap frame;
3. the incoming layer fades in over 0.55 s while turning ~20° into its rest pose,
   the outgoing one fades out over 0.3 s (smoothstep, no scale or position
   change);
4. the outgoing layer is parked, not unmounted, so scrolling back is free.

Should a layer arrive late (very fast navigation), the outgoing artifact holds at
full opacity until the newcomer reports *ready*: the stage is never empty and the
hand-over never blocks the first frame.

Materials are cloned per layer, so two artifacts can share the screen without
fighting over opacity. Once a fade settles, the layer stops touching its
materials entirely — an idle stage does no per-frame material work. Layers are
memoized, so a swap re-renders only the layers whose phase actually changed.

### Fallbacks

Each layer passes through `ModelGate` (a `HEAD` probe, cached per URL, that
checks both the status and the MIME type) and then through `ModelBoundary`, a
small error boundary. A `Suspense` fallback of `null` keeps crossfades quiet:

- while a GLB downloads or parses, the previous artifact (or the loading
  screen, on first paint) keeps the stage occupied;
- if the probe says the URL is not a real `.glb` (missing file, Vite's
  `index.html` fallback, wrong type), the procedural "orbital relic" (hammered
  sphere, golden rings, antenna) is rendered without ever calling the loader;
- if a file exists but is corrupt, `ModelBoundary` catches the parser error and
  renders the same relic.

Either way a single `console.warn` names the URL; the page never crashes on a
bad asset. The next two artifacts are preloaded during idle time (and only when
the same probe confirms a real `.glb` is served), so a chapter's GLB is parsed
before it is needed rather than in the middle of a scroll.

`public/models/` is excluded from the dev-server watcher in `vite.config.js`:
watching large binaries crashed Vite with `EBUSY: resource busy or locked` on
Windows while a file was still being written. Refresh the page after adding or
replacing an asset.

---

## Quick customization

| Element | File |
| --- | --- |
| Colors (`void`, `bone`, `gold`, `signal`) | `tailwind.config.js` |
| Fonts | `index.html` + `tailwind.config.js` |
| Copy and chapters | `src/components/Overlay.jsx` |
| Quiz questions | `src/components/ArtifactQuiz.jsx` |
| Quiz modal shell | `src/components/QuizModal.jsx` |
| Model→chapter mapping | `src/App.jsx` + `src/components/Canvas3D.jsx` |
| Scroll lighting timeline | `src/App.jsx` |
| Stage placement / pointer turn | `src/components/Canvas3D.jsx` |
| Model / materials / lights | `src/components/Canvas3D.jsx` |
| Loading screen | `src/components/LoadingScreen.jsx` |

---

## Performance

- Adaptive DPR (`PerformanceMonitor`): starts at `min(devicePixelRatio, 1.5)` and
  steps down by 0.25 (never below 1) if the frame rate drops, so the picture stays
  smooth instead of dropping frames. `stencil` is off.
- The artifact has no scroll-driven transform: no position, scale or camera
  maths in the frame loop, and no React re-render on scroll.
- Scroll only writes three light intensities into a plain object, through one
  timeline with `scrub: 0.7`.
- Section reveals are non-scrubbed and animate transform/opacity only. No
  scrubbed `blur()`, no blurred halos, no `scroll-behavior: smooth`, no
  full-screen blend mode on the grain overlay — all of those forced a repaint
  (or a full-page composite) on every wheel tick.
- A settled fade stops writing to its materials; an idle stage does no per-frame
  material work.
- The next artifact is warmed (drawn at opacity 0, then parked) while the reader
  is still on the previous chapter, so the swap frame carries no parse, upload or
  shader compile. Visited layers stay resident and invisible.
- The next two artifacts are preloaded (HEAD-checked, on idle) so network and
  parse time are spread out instead of bunched at a transition.
- Stars and dust generated by shaders, kept deliberately sparse (1,600 stars,
  24 sparkles).
- `prefers-reduced-motion` disables decorative CSS animations.

For a heavy GLB: compress it (Draco / Meshopt), reduce the number of
materials, and lower `count` in `<Stars>` or `dpr` if needed.

---

## Editorial sources

NASA / JPL / NSSDC — Mars Exploration Rovers (Spirit & Opportunity), Ingenuity
Mars Helicopter, Phoenix, InSight, Surveyor 3 / Apollo 12, and the Kepler Space
Telescope. Mission figures (45.16 km driven, 72 flights, 128.8 minutes airborne,
1,300+ marsquakes, the 163 m Apollo 12 walk, the 31-month Surveyor 3 exposure,
2,600+ confirmed Kepler planets and its 371-day solar orbit) follow NASA's
published numbers; check `spaceappschallenge.org` for the official challenge
text.

> Kepler orbits the Sun, not the Moon or Mars. It is kept as the archive's
> widest view — the same kind of discarded NASA hardware, one step farther out.
> To drop it, remove the `kepler` chapter from `Overlay.jsx` and its entry from
> `ARTIFACT_BY_SECTION`; everything else follows the data.

---

Made for the NASA Space Apps Challenge. Open data. Infinite curiosity.
