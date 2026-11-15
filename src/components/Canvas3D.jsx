import {
  Component,
  Suspense,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  MeshDistortMaterial,
  PerformanceMonitor,
  Sparkles,
  Stars,
  useAnimations,
  useGLTF,
} from '@react-three/drei'
import * as THREE from 'three'
import { scrollState } from '../lib/scrollState'

/**
 * ─────────────────────────────────────────────────────────────
 *  3D ARTIFACTS
 * ─────────────────────────────────────────────────────────────
 * One model per story beat, crossfaded by `App` as the scroll moves:
 *   prologue + epilogue  → solar-system.glb (the whole archive, in orbit)
 *   Spirit & Opportunity → opportunity.glb
 *   Ingenuity            → ingenuity.glb
 *   Phoenix & InSight    → insight.glb
 *   Surveyor 3           → surveyor3.glb (falls back to the relic if absent)
 *   Kepler               → kepler.glb
 *
 * Files live in `public/models/`. `VITE_MODEL_URL` can override the
 * Opportunity model (useful for quick swaps) without touching code.
 *
 * The artifact never moves. It sits in one fixed stage slot (right of the
 * copy on desktop, above it on phones) at a fixed scale: scroll only
 * changes the lights. The only motion is a damped rotation that follows
 * the mouse — a parallax turn, never a translation.
 *
 * Layers are never thrown away. Each artifact is mounted as a "warm" layer
 * one chapter early: it draws a couple of frames at opacity 0 (so the
 * textures are uploaded and the shaders compiled) and is then parked
 * invisible until its chapter needs it. Promoting it later is therefore
 * free — no parse, no upload, no stall in the middle of a scroll.
 *
 * The outgoing artifact also holds at full opacity until the incoming layer
 * reports that it has actually drawn, so the stage is never empty and the
 * crossfade never waits for a slow file. Every layer clones its materials,
 * which lets each one fade independently.
 *
 * Every model is wrapped in an error boundary: if a file is missing,
 * mistyped or corrupt, the procedural relic takes its place and a single
 * warning is logged — the page never crashes.
 */
const MODELS = {
  solar: '/models/solar-system.glb',
  rovers: import.meta.env.VITE_MODEL_URL || '/models/opportunity.glb',
  ingenuity: '/models/ingenuity.glb',
  landers: '/models/insight.glb',
  surveyor: '/models/surveyor3.glb',
  kepler: '/models/kepler.glb',
}

const DEFAULT_ARTIFACT = 'solar'

/* Story order: preload the next two artifacts, never the whole set. */
const ORDER = ['solar', 'rovers', 'ingenuity', 'landers', 'surveyor', 'kepler']

/* Camera is fixed too: no dolly, no lateral drift. */
const CAMERA = { fov: 32, z: 7.4, y: 0.12 }
const VISIBLE_HEIGHT =
  2 * CAMERA.z * Math.tan((CAMERA.fov * Math.PI) / 360)

/* HEAD-probe cache. A missing .glb is detected before the loader runs, so the
   fallback is silent instead of an uncaught parse error. Vite answers a
   missing public file with index.html, which is why the MIME type matters. */
const availability = new Map()
const warnedUrls = new Set()

function probeModel(url) {
  const cached = availability.get(url)
  if (cached) return cached

  const entry = { status: 'pending', value: false }

  entry.promise = fetch(url, { method: 'HEAD' })
    .then((response) => {
      const type = response.headers.get('content-type') || ''
      entry.value =
        response.ok && (!type || /gltf|octet-stream|binary/i.test(type))
      entry.status = 'done'
      return entry.value
    })
    .catch(() => {
      entry.status = 'done'
      entry.value = false
      return false
    })

  availability.set(url, entry)
  return entry
}

function ModelGate({ url, fallback, children }) {
  const entry = probeModel(url)
  const [, rerender] = useReducer((value) => value + 1, 0)

  useEffect(() => {
    if (entry.status !== 'pending') return undefined

    let cancelled = false
    entry.promise.then(() => {
      if (!cancelled) rerender()
    })

    return () => {
      cancelled = true
    }
  }, [entry])

  /* Warn exactly once per URL, when the relic actually takes the stage.
     The probe mutates its cache entry, so status and value are dependencies
     too: the effect has to re-run when the HEAD request resolves. */
  useEffect(() => {
    if (entry.status !== 'done' || entry.value || warnedUrls.has(url)) return

    warnedUrls.add(url)
    console.warn(
      `[Canvas3D] ${url} is not available as a .glb. ` +
        'The procedural relic is shown instead.',
    )
  }, [entry, entry.status, entry.value, url])

  /* While the HEAD request is in flight the previous layer stays on stage. */
  if (entry.status === 'pending') return null
  return entry.value ? children : fallback
}

/* Per-artifact pose. The Solar System is an orrery, so it gets a larger
   frame and its own slow orbit animation; the single probes stay at 1:1.
   `baseX` / `baseY` are the resting orientation the pointer turns around. */
const STAGE = {
  solar: { frameScale: 1.5, animationSpeed: 0.45, baseX: 0.28, baseY: -0.45 },
  rovers: { frameScale: 1, animationSpeed: 1, baseX: 0.14, baseY: -0.5 },
  ingenuity: { frameScale: 1, animationSpeed: 1, baseX: 0.06, baseY: 0.55 },
  landers: { frameScale: 1.35, animationSpeed: 1, baseX: 0.16, baseY: -0.3 },
  surveyor: { frameScale: 1, animationSpeed: 1, baseX: 0.1, baseY: 0.65 },
  kepler: { frameScale: 1, animationSpeed: 1, baseX: 0.2, baseY: -0.4 },
}

const NORMALIZED_SIZE = 2.6

/* Asymmetric and short: the old artifact turns away quickly, the new one
   settles in slightly slower. A brief overlap keeps the stage from going
   dark; a per-layer yaw settle hides the dissolve. */
const CROSSFADE_IN = 0.55
const CROSSFADE_OUT = 0.3

/* Frames a layer must draw before it is trusted: after that its programs and
   textures live on the GPU and swapping it in costs nothing. */
const READY_FRAMES = 2

/* The incoming artifact enters slightly turned and swings into place, which
   reads as a hand-over instead of a cross-dissolve. */
const SETTLE_YAW = 0.34

/* The stage slot is anchored to the widest frame (the Solar System) so the
   model centre is identical for every artifact: swapping chapters never
   makes the object slide. */
const MAX_FRAME_SCALE = Math.max(
  ...Object.values(STAGE).map((config) => config.frameScale),
)

const POINTER_YAW = 0.5
const POINTER_PITCH = 0.22

/**
 * Fixed placement for the current viewport. Called on resize only, never
 * from the frame loop: the artifact has no scroll-driven transform.
 */
function placementFor(width, height) {
  const isPortrait = height > width
  const isMobile = width < 768 || isPortrait
  const isCompact = !isMobile && width < 1180

  const scale = isMobile ? 0.42 : isCompact ? 0.52 : 0.72
  const visibleWidth = VISIBLE_HEIGHT * (width / Math.max(height, 1))
  const extent = (NORMALIZED_SIZE * MAX_FRAME_SCALE * scale) / 2

  const x = isMobile
    ? 0
    : Math.max(
        0,
        Math.min(visibleWidth * 0.27, visibleWidth / 2 - extent - 0.18),
      )

  const y = isMobile ? VISIBLE_HEIGHT * 0.36 : isCompact ? 0.08 : 0

  return { x, y, scale }
}

/* ------------------------------------------------------------------ */
/*  GLB model + automatic normalization (size / center)               */
/* ------------------------------------------------------------------ */
function buildModel(scene) {
  const clone = scene.clone(true)

  const box = new THREE.Box3().setFromObject(clone)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const maxAxis = Math.max(size.x, size.y, size.z) || 1
  const factor = NORMALIZED_SIZE / maxAxis

  clone.scale.setScalar(factor)
  clone.position.copy(center).multiplyScalar(-factor)

  /* Each layer owns its materials: it can then fade in and out without
     touching the cache or the artifact underneath. */
  const materials = []

  clone.traverse((child) => {
    if (!child.isMesh) return

    child.castShadow = false
    child.receiveShadow = false
    child.frustumCulled = false

    const source = Array.isArray(child.material)
      ? child.material
      : [child.material]

    const copies = source.filter(Boolean).map((material) => {
      const copy = material.clone()
      const baseOpacity = copy.opacity ?? 1

      materials.push({ material: copy, baseOpacity })
      copy.transparent = true
      copy.opacity = 0

      return copy
    })

    child.material = Array.isArray(child.material) ? copies : copies[0]
  })

  return { model: clone, materials }
}

/* ------------------------------------------------------------------ */
/*  One artifact layer: geometry, animation and opacity fade          */
/* ------------------------------------------------------------------ */
function ArtifactLayer({ artifact, phase, onReady, onGone }) {
  const config = STAGE[artifact] ?? STAGE[DEFAULT_ARTIFACT]
  const { scene, animations } = useGLTF(MODELS[artifact])

  const { model, materials } = useMemo(() => buildModel(scene), [scene])

  const groupRef = useRef(null)
  const fade = useRef(0)
  const frames = useRef(0)
  const reported = useRef(false)
  const gone = useRef(false)
  const settle = useRef(0)
  const settledFor = useRef(phase)

  /* The Solar System ships a 20 s orbit animation. The mixer is bound to
     this layer's own clone, so every stage animates independently. */
  const { actions } = useAnimations(animations, groupRef)

  useEffect(() => {
    const clips = Object.values(actions)
    if (!clips.length) return undefined

    clips.forEach((action) => {
      action.reset()
      action.enabled = true
      action.setEffectiveTimeScale(config.animationSpeed)
      action.setEffectiveWeight(1)
      action.play()
    })

    return () => clips.forEach((action) => action.stop())
  }, [actions, config.animationSpeed])

  /* The cloned materials are never reused by another layer. */
  useEffect(
    () => () => materials.forEach(({ material }) => material.dispose()),
    [materials],
  )

  useEffect(() => {
    if (phase !== 'leaving') gone.current = false
  }, [phase])

  useFrame((_, delta) => {
    const group = groupRef.current

    frames.current += 1

    /* Two drawn frames are enough: shaders compiled, textures uploaded. Only
       now may the parent hand the stage to this layer. */
    if (!reported.current && frames.current >= READY_FRAMES) {
      reported.current = true
      onReady?.(artifact)
    }

    if (phase === 'warm') {
      /* Pre-rolled and parked: an invisible layer is skipped entirely by the
         renderer, leaving the whole frame budget to the visible artifact. */
      if (group?.visible && frames.current >= READY_FRAMES) group.visible = false
      return
    }

    if (group && !group.visible) group.visible = true

    /* Arriving artifact: start turned away, damp back to its resting pose as
       it fades in. The rotation is local to this layer, so the outgoing one
       is not dragged along. */
    if (group) {
      if (phase === 'active' && phase !== settledFor.current) {
        settle.current = SETTLE_YAW
      }
      settle.current = THREE.MathUtils.damp(settle.current, 0, 3.2, delta)
      group.rotation.y = settle.current
    }
    settledFor.current = phase

    const target = phase === 'active' ? 1 : 0
    const current = fade.current

    /* Once the fade has settled, touching every material each frame would
       be pure waste (and it is exactly what makes scrolling stutter). */
    if (current === target) {
      if (target === 0 && phase === 'leaving' && !gone.current) {
        gone.current = true
        onGone?.(artifact)
      }
      return
    }

    const step = delta / (target > current ? CROSSFADE_IN : CROSSFADE_OUT)
    const next =
      target > current
        ? Math.min(target, current + step)
        : Math.max(target, current - step)

    fade.current = next

    const eased = next * next * (3 - 2 * next)
    for (const entry of materials) {
      entry.material.opacity = entry.baseOpacity * eased
    }
  })

  return (
    <group ref={groupRef} scale={config.frameScale}>
      <primitive object={model} dispose={null} />
    </group>
  )
}

/* Only the layer whose phase actually changed re-renders at a swap: the
   other four stay exactly as they are. */
const StageLayer = memo(ArtifactLayer)

/* ------------------------------------------------------------------ */
/*  Error boundary: a broken GLB degrades to the procedural artifact  */
/* ------------------------------------------------------------------ */
class ModelBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.warn(
      `[Canvas3D] Could not display the "${this.props.artifact}" model. ` +
        'Falling back to the procedural artifact. Check that the file exists ' +
        'in public/models/ and is a valid .glb.',
      error,
    )
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/* ------------------------------------------------------------------ */
/*  Placeholder artifact: a metallic "orbital relic"                  */
/* ------------------------------------------------------------------ */
function OrbitalRelic() {
  const rings = useRef(null)
  const outerRing = useRef(null)
  const satellites = useRef(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime

    if (rings.current) {
      rings.current.rotation.x = 1.16 + Math.sin(t * 0.22) * 0.07
      rings.current.rotation.z = 0.22 + t * 0.05
    }

    if (outerRing.current) {
      outerRing.current.rotation.z = -t * 0.035
      outerRing.current.rotation.x = -0.72 + Math.cos(t * 0.16) * 0.05
    }

    if (satellites.current) {
      satellites.current.rotation.y = -t * 0.24
    }
  })

  return (
    <group>
      {/* Hammered metallic core */}
      <mesh>
        <sphereGeometry args={[1.14, 96, 96]} />
        <MeshDistortMaterial
          color="#5d6370"
          metalness={0.9}
          roughness={0.38}
          distort={0.13}
          speed={1.05}
        />
      </mesh>

      {/* Wireframe shell: a "technical" reading of the object */}
      <mesh scale={1.075}>
        <icosahedronGeometry args={[1.14, 2]} />
        <meshBasicMaterial
          color="#d9aa63"
          wireframe
          transparent
          opacity={0.09}
          depthWrite={false}
        />
      </mesh>

      {/* Golden equatorial band */}
      <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1.005, 1.005, 1.005]}>
        <torusGeometry args={[1.12, 0.008, 8, 220]} />
        <meshStandardMaterial
          color="#d9aa63"
          metalness={1}
          roughness={0.25}
          emissive="#d9aa63"
          emissiveIntensity={0.35}
        />
      </mesh>

      {/* Main ring + orbiting satellites */}
      <group ref={rings} rotation={[1.16, 0, 0.22]}>
        <mesh>
          <torusGeometry args={[1.78, 0.011, 8, 256]} />
          <meshStandardMaterial
            color="#d9aa63"
            metalness={1}
            roughness={0.3}
            emissive="#d9aa63"
            emissiveIntensity={0.25}
          />
        </mesh>

        <group ref={satellites}>
          {[0, 1, 2, 3].map((i) => {
            const angle = (i * Math.PI) / 2 + 0.35
            return (
              <mesh
                key={i}
                position={[
                  Math.cos(angle) * 1.78,
                  Math.sin(angle) * 1.78,
                  0,
                ]}
              >
                <sphereGeometry args={[i === 0 ? 0.045 : 0.028, 16, 16]} />
                <meshStandardMaterial
                  color="#20232b"
                  metalness={0.95}
                  roughness={0.28}
                  emissive="#d9aa63"
                  emissiveIntensity={i === 0 ? 1.1 : 0.55}
                />
              </mesh>
            )
          })}
        </group>
      </group>

      {/* Second, wider and more discreet ring */}
      <group ref={outerRing} rotation={[-0.72, 0.35, 0.95]}>
        <mesh>
          <torusGeometry args={[2.18, 0.005, 6, 256]} />
          <meshBasicMaterial color="#f2efe8" transparent opacity={0.22} />
        </mesh>
      </group>

      {/* Antenna + beacon */}
      <group position={[0.48, 0.94, 0.15]} rotation={[0, 0, -0.34]}>
        <mesh position={[0, 1.05, 0]}>
          <cylinderGeometry args={[0.011, 0.019, 2.1, 10]} />
          <meshStandardMaterial color="#aab0bc" metalness={0.92} roughness={0.35} />
        </mesh>
        <mesh position={[0, 2.1, 0]}>
          <sphereGeometry args={[0.055, 20, 20]} />
          <meshBasicMaterial color="#ffd79a" />
        </mesh>
        <pointLight
          position={[0, 2.1, 0]}
          color="#ffcf87"
          intensity={1.1}
          distance={3.2}
          decay={2}
        />
      </group>
    </group>
  )
}

/* The relic is a fallback, not a model: it fades in on its own so the
   missing-file case still feels like a transition. */
function RelicFallback({ name, phase, onReady, onGone }) {
  const groupRef = useRef(null)
  const entries = useRef([])
  const fade = useRef(0)
  const frames = useRef(0)
  const reported = useRef(false)
  const gone = useRef(false)

  useLayoutEffect(() => {
    const found = []

    groupRef.current?.traverse((node) => {
      if (!node.isMesh) return

      const list = Array.isArray(node.material)
        ? node.material
        : [node.material]

      list.filter(Boolean).forEach((material) => {
        found.push({ material, baseOpacity: material.opacity ?? 1 })
        material.transparent = true
        material.opacity = 0
      })
    })

    entries.current = found
  }, [])

  useEffect(() => {
    if (phase !== 'leaving') gone.current = false
  }, [phase])

  useFrame((_, delta) => {
    frames.current += 1

    if (!reported.current && frames.current >= READY_FRAMES) {
      reported.current = true
      onReady?.(name)
    }

    const target = phase === 'active' ? 1 : 0
    const current = fade.current
    if (current === target) {
      if (target === 0 && phase === 'leaving' && !gone.current) {
        gone.current = true
        onGone?.(name)
      }
      return
    }

    const step = delta / (target > current ? CROSSFADE_IN : CROSSFADE_OUT)
    const next =
      target > current
        ? Math.min(target, current + step)
        : Math.max(target, current - step)

    fade.current = next

    const eased = next * next * (3 - 2 * next)
    for (const entry of entries.current) {
      entry.material.opacity = entry.baseOpacity * eased
    }
  })

  return (
    <group ref={groupRef}>
      <OrbitalRelic />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Dramatic lighting, driven by scroll (the only scroll-bound state)  */
/* ------------------------------------------------------------------ */
function Lights() {
  const key = useRef(null)
  const rim = useRef(null)
  const glow = useRef(null)

  useFrame((_, delta) => {
    const damp = THREE.MathUtils.damp

    if (key.current) {
      key.current.intensity = damp(
        key.current.intensity,
        scrollState.keyIntensity,
        3,
        delta,
      )
    }
    if (rim.current) {
      rim.current.intensity = damp(
        rim.current.intensity,
        scrollState.rimIntensity,
        3,
        delta,
      )
    }
    if (glow.current) {
      glow.current.intensity = damp(
        glow.current.intensity,
        scrollState.glow,
        3,
        delta,
      )
    }
  })

  return (
    <>
      <ambientLight intensity={0.3} color="#7080a3" />

      {/* Soft sky/ground bounce: keeps dark materials readable */}
      <hemisphereLight args={['#9fb6ff', '#1a120a', 0.45]} />

      {/* Key light: warm, high contrast */}
      <directionalLight
        ref={key}
        position={[4.5, 6, 5]}
        intensity={2.6}
        color="#fff1da"
      />

      {/* Front-left fill so black carbon parts (Ingenuity) are not silhouettes */}
      <directionalLight position={[-3.5, 2, 5.5]} intensity={1.25} color="#c3d4ff" />

      {/* Soft frontal wash: separates near-black composites from the void */}
      <directionalLight position={[1.5, 0.5, 6]} intensity={0.55} color="#ffe9cd" />

      {/* Back-right kicker: draws a bright edge on thin, dark geometry */}
      <directionalLight position={[3, 1.5, -5]} intensity={1.1} color="#9fb4ff" />

      {/* Cold rim light to detach the silhouette */}
      <directionalLight
        ref={rim}
        position={[-5, -2.5, -4]}
        intensity={1.3}
        color="#6d8cff"
      />

      {/* Low amber ambient glow */}
      <pointLight
        ref={glow}
        position={[0, -2.2, 2.4]}
        intensity={5.5}
        distance={9}
        decay={2}
        color="#d9aa63"
      />
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Stage: fixed placement + damped pointer rotation                  */
/* ------------------------------------------------------------------ */
function Stage({ artifact, children }) {
  const group = useRef(null)
  const { size } = useThree()
  const pointer = useRef({ x: 0, y: 0, tx: 0, ty: 0 })

  /* The canvas sits behind the copy, so its own pointer events only fire
     over empty space. Listening on the window keeps the turn continuous
     while the cursor travels across the text. */
  useEffect(() => {
    const update = (event) => {
      const width = window.innerWidth || 1
      const height = window.innerHeight || 1

      pointer.current.tx = THREE.MathUtils.clamp(
        (event.clientX / width) * 2 - 1,
        -1,
        1,
      )
      pointer.current.ty = THREE.MathUtils.clamp(
        1 - (event.clientY / height) * 2,
        -1,
        1,
      )
    }

    window.addEventListener('pointermove', update, { passive: true })
    return () => window.removeEventListener('pointermove', update)
  }, [])

  /* Recomputed on resize only: no scroll-dependent position. */
  const placement = useMemo(
    () => placementFor(size.width, size.height),
    [size.width, size.height],
  )


  useFrame((_, delta) => {
    const g = group.current
    if (!g) return

    const config = STAGE[artifact] ?? STAGE[DEFAULT_ARTIFACT]
    const p = pointer.current
    const damp = THREE.MathUtils.damp

    p.x = damp(p.x, p.tx, 3.6, delta)
    p.y = damp(p.y, p.ty, 3.6, delta)

    g.rotation.y = damp(g.rotation.y, config.baseY + p.x * POINTER_YAW, 4.5, delta)
    g.rotation.x = damp(g.rotation.x, config.baseX + p.y * POINTER_PITCH, 4.5, delta)
  })

  return (
    <group
      ref={group}
      position={[placement.x, placement.y, 0]}
      scale={placement.scale}
    >
      {children}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/*  Fixed canvas                                                      */
/* ------------------------------------------------------------------ */
export default function Canvas3D({ artifact = DEFAULT_ARTIFACT }) {
  const activeArtifact = MODELS[artifact] ? artifact : DEFAULT_ARTIFACT

  /* Every artifact ever visited stays mounted, parked invisible. Re-visiting
     a chapter is therefore instant, and nothing is ever parsed on the way. */
  const [layers, setLayers] = useState(() => [
    { artifact: activeArtifact, phase: 'active' },
  ])

  /* Adaptive resolution: full quality until the GPU asks for more time.
     Steps are gradual and bounded so the picture never visibly jumps. */
  const maxDpr = Math.min(window.devicePixelRatio || 1, 1.5)
  const [dpr, setDpr] = useState(maxDpr)
  const shiftDpr = useCallback(
    (direction) => {
      setDpr((current) => {
        const next = Math.round((current + direction * 0.25) * 100) / 100
        return Math.min(maxDpr, Math.max(1, next))
      })
    },
    [maxDpr],
  )

  const desired = useRef(activeArtifact)
  const readyArtifacts = useRef(new Set())

  /* Incoming wins immediately; anything else that was visible retires. */
  const promote = useCallback((name) => {
    setLayers((previous) => {
      const incoming = previous.find((layer) => layer.artifact === name)
      if (!incoming) return previous

      const alreadySettled =
        incoming.phase === 'active' &&
        !previous.some(
          (layer) => layer.phase === 'active' && layer.artifact !== name,
        )

      if (alreadySettled) return previous

      return previous.map((layer) => {
        if (layer.artifact === name) return { ...layer, phase: 'active' }
        if (layer.phase === 'active') return { ...layer, phase: 'leaving' }
        if (layer.phase === 'incoming') return { ...layer, phase: 'warm' }
        return layer
      })
    })
  }, [])

  /* A warm layer reports ready long before its chapter: it is only promoted
     when the story actually reaches it. */
  const handleReady = useCallback(
    (name) => {
      readyArtifacts.current.add(name)
      if (name === desired.current) promote(name)
    },
    [promote],
  )

  /* A layer that has finished fading is parked, not unmounted: its GPU
     resources stay valid for the next time the reader scrolls back. */
  const handleGone = useCallback((name) => {
    setLayers((previous) =>
      previous.map((layer) =>
        layer.artifact === name && layer.phase === 'leaving'
          ? { ...layer, phase: 'warm' }
          : layer,
      ),
    )
  }, [])

  useEffect(() => {
    desired.current = activeArtifact

    setLayers((previous) => {
      const known = readyArtifacts.current.has(activeArtifact)
      const mounted = previous.some((layer) => layer.artifact === activeArtifact)

      const next = previous.map((layer) => {
        if (layer.artifact === activeArtifact) {
          return { ...layer, phase: known ? 'active' : 'incoming' }
        }
        /* Hold the outgoing artifact at full opacity until the incoming
           layer has drawn: the stage is never empty. */
        if (layer.phase === 'active' && known) {
          return { ...layer, phase: 'leaving' }
        }
        if (layer.phase === 'incoming' || layer.phase === 'leaving') {
          return { ...layer, phase: 'warm' }
        }
        return layer
      })

      if (mounted) return next
      return [
        ...next,
        { artifact: activeArtifact, phase: known ? 'active' : 'incoming' },
      ]
    })
  }, [activeArtifact])

  /* Warm the next artifact one chapter early: mount it, let it draw two
     frames at opacity 0 (textures uploaded, programs compiled) and park it.
     The hand-off later is a plain opacity ramp. */
  useEffect(() => {
    const index = ORDER.indexOf(activeArtifact)
    if (index === -1) return undefined

    const upcoming = ORDER[(index + 1) % ORDER.length]
    if (!upcoming || upcoming === activeArtifact) return undefined

    let cancelled = false
    let idle = 0

    const mount = () => {
      if (cancelled) return
      setLayers((previous) =>
        previous.some((layer) => layer.artifact === upcoming)
          ? previous
          : [
              ...previous,
              {
                artifact: upcoming,
                phase:
                  upcoming === desired.current ? 'incoming' : 'warm',
              },
            ],
      )
    }

    /* Deferred until the reader has settled on this chapter, and to idle
       time, so the parse never lands inside a scroll frame. */
    const timer = window.setTimeout(() => {
      if (cancelled) return

      if (typeof window.requestIdleCallback === 'function') {
        idle = window.requestIdleCallback(mount, { timeout: 2000 })
      } else {
        mount()
      }
    }, 900)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      if (idle && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idle)
      }
    }
  }, [activeArtifact])

  /* Download the next two artifacts on idle, once a quick HEAD request
     confirms that a real .glb is served there (a missing file would
     otherwise trip the error boundary's warning before its chapter). */
  useEffect(() => {
    const index = ORDER.indexOf(activeArtifact)
    const upcoming = [ORDER[index + 1], ORDER[index + 2]].filter(Boolean)
    if (!upcoming.length) return undefined

    let cancelled = false
    const timers = []
    const idles = []

    const schedule = (callback, delay) => {
      const timer = window.setTimeout(() => {
        if (cancelled) return

        if (typeof window.requestIdleCallback === 'function') {
          idles.push(window.requestIdleCallback(callback, { timeout: 2500 }))
        } else {
          callback()
        }
      }, delay)

      timers.push(timer)
    }

    upcoming.forEach((name, position) => {
      const url = MODELS[name]
      if (!url) return

      schedule(() => {
        probeModel(url).promise.then((available) => {
          if (!cancelled && available) useGLTF.preload(url)
        })
      }, 500 + position * 2400)
    })

    return () => {
      cancelled = true
      timers.forEach((timer) => window.clearTimeout(timer))
      if (typeof window.cancelIdleCallback === 'function') {
        idles.forEach((idle) => window.cancelIdleCallback(idle))
      }
    }
  }, [activeArtifact])

  return (
    <Canvas
      dpr={dpr}
      gl={{
        antialias: true,
        alpha: true,
        stencil: false,
        powerPreference: 'high-performance',
      }}
      camera={{
        position: [0, CAMERA.y, CAMERA.z],
        fov: CAMERA.fov,
        near: 0.1,
        far: 160,
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.12
      }}
    >
      <PerformanceMonitor
        flipflops={2}
        onDecline={() => shiftDpr(-1)}
        onIncline={() => shiftDpr(1)}
      />

      <fog attach="fog" args={['#05060a', 10, 28]} />

      <Lights />

      <Suspense fallback={null}>
        <Stars
          radius={70}
          depth={45}
          count={1600}
          factor={3.4}
          saturation={0}
          fade
          speed={0.2}
        />

        <Stage artifact={activeArtifact}>
          {layers.map((layer) => {
            const fallback = (
              <RelicFallback
                name={layer.artifact}
                phase={layer.phase}
                onReady={handleReady}
                onGone={handleGone}
              />
            )

            return (
              <Suspense key={layer.artifact} fallback={null}>
                <ModelGate url={MODELS[layer.artifact]} fallback={fallback}>
                  <ModelBoundary artifact={layer.artifact} fallback={fallback}>
                    <StageLayer
                      artifact={layer.artifact}
                      phase={layer.phase}
                      onReady={handleReady}
                      onGone={handleGone}
                    />
                  </ModelBoundary>
                </ModelGate>
              </Suspense>
            )
          })}
        </Stage>

        <Sparkles
          count={24}
          scale={[10, 10, 8]}
          size={1.7}
          speed={0.18}
          opacity={0.28}
          color="#e7d3aa"
          noise={0.4}
        />
      </Suspense>
    </Canvas>
  )
}

