/**
 * Mutable, render-free scroll state. Written once per frame by ScrollProvider,
 * read inside useFrame loops by every system that responds to the master
 * progress value. Deliberately not React state — no re-renders per frame.
 */
export const scrollState = {
  /** Master normalized progress, 0 → 1. */
  progress: 0,
}
