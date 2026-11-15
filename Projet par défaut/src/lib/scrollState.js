/**
 * Mutable state shared between GSAP (which writes the targets)
 * and React Three Fiber (which reads and damps every frame).
 *
 * Deliberately outside React: no 60 fps re-renders.
 *
 * Only the lighting changes with scroll. The artifact itself never moves:
 * it keeps a fixed stage position and its rotation follows the pointer.
 */
export const initialScrollState = {
  keyIntensity: 2.4,
  rimIntensity: 1.2,
  glow: 6,
}

export const scrollState = { ...initialScrollState }
