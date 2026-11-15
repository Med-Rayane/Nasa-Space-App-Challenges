# 3D artifacts

Six `.glb` files power the scrollytelling. They are served at
`/models/<filename>`; the Solar System opens and closes the story, and each
abandoned artifact gets its own chapter:

| File | Size | Chapter |
| --- | --- | --- |
| `solar-system.glb` | 10.7 MB | Prologue + Epilogue (animated orrery, 20 s loop) |
| `opportunity.glb` | 11.4 MB | Spirit & Opportunity (Mars Exploration Rover) |
| `ingenuity.glb` | 1.9 MB | Ingenuity (Mars Helicopter) |
| `insight.glb` | 21.3 MB | Phoenix & InSight (InSight lander, deployed) |
| `surveyor3.glb` | 11.4 MB | Surveyor 3 (Surveyor lunar lander) |
| `kepler.glb` | 1.9 MB | Kepler (Kepler Space Telescope) |

The mapping lives in `src/components/Canvas3D.jsx` (`MODELS`). `App.jsx` picks
the artifact from the section currently on screen. `Canvas3D` keeps every
artifact it has shown mounted: the next one is warmed one chapter early (drawn
twice at opacity 0, then parked invisible) so its textures and shaders are already
on the GPU when its chapter arrives. The hand-over is then a 0.55 s fade-in with
a slight turn into the rest pose, against a 0.3 s fade-out. Every artifact keeps a
fixed stage position and scale (scroll never moves it); its rotation follows the
pointer.

`kepler.glb` sits outside the Moon/Mars scope of the challenge, but it is a NASA
artifact of the same kind — abandoned, silent, still in orbit — and gives the
archive its widest view. Delete the chapter in `Overlay.jsx` and the `kepler`
entry in `ARTIFACT_BY_SECTION` to drop it.

## Swapping a model

1. Drop the replacement in this folder and point `MODELS` at it (or keep the
   filename and simply overwrite the file).
2. Refresh the page. This folder is excluded from the dev-server watcher, so
   Vite will not hot-reload it.
3. `.env` optionally overrides the Opportunity entry via `VITE_MODEL_URL`.
   Vite reads `.env` only at startup — restart `npm run dev` after changing it.

## Fallbacks

`ArtifactLayer` passes through `ModelGate` and `ModelBoundary` (both in
`Canvas3D.jsx`). If a file is missing, corrupt or blocked, the build does not
break: the procedural "orbital relic" (metallic sphere with rings) fades in
instead and one warning is logged to the console.

`ModelGate` sends a cached `HEAD` request first and checks both the status and
the MIME type, because a missing file in dev still answers `200 text/html` with
Vite's `index.html`. That keeps the loader from ever parsing an HTML page.
`ModelBoundary` remains the second line of defence for a file that exists but
is corrupt.

The next two artifacts in the story are preloaded on idle, and only after the
same probe confirms a real `.glb`. The `console.warn` is emitted when the relic
actually takes the stage, once per missing URL.

## Normalization

`buildModel` clones the scene, centers it on its bounding box and rescales it so
the longest axis measures ~2.6 units. Models are not rotated, so export them
Y up. The Solar System is then framed at ×1.5 while its own orbit animation
plays (`STAGE` in `Canvas3D.jsx`); the pointer only tilts each artifact around
a fixed rest pose. To tune the shared size, edit:

```js
const NORMALIZED_SIZE = 2.6
```

## Notes

- `.glb` keeps geometry and materials in one file; a `.gltf` also needs its
  `.bin` and textures copied here.
- Files in `public/` are copied to `dist/` untouched at build time.
- This folder is excluded from the dev-server watcher (`server.watch.ignored`
  in `vite.config.js`). Watching large binaries crashed Vite with
  `EBUSY: resource busy or locked` on Windows while a file was being written.
