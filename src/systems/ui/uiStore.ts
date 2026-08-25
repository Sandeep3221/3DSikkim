import { useSyncExternalStore } from 'react'

/**
 * Shared UI/experience state for the world-as-UI phase: whether the journey
 * has resolved into the interactive map, which destination is focused, and
 * whether a cinematic dive is in progress.
 *
 * IMPORTANT: per-frame values (like dive progress) must NEVER live here.
 * Every emit re-renders all subscribers — a per-frame emit caused a fatal
 * freeze (terrain geometry rebuilt 60×/s). Per-frame values live in the
 * imperative `diveRuntime` module below, read inside useFrame/rAF loops.
 */

export interface UiState {
  /** True once master progress enters the interactive-experience segment. */
  mapActive: boolean
  /** Selected destination id, or null when nothing is focused. */
  selectedId: string | null
  /** True once the cinematic dive has physically arrived at the destination. */
  arrived: boolean
  /** True while the cinematic camera route owns the camera. */
  diving: boolean
}

let state: UiState = {
  mapActive: false,
  selectedId: null,
  arrived: false,
  diving: false,
}
const listeners = new Set<() => void>()

function emit(next: UiState): void {
  state = next
  listeners.forEach((l) => l())
}

export function setMapActive(active: boolean): void {
  if (state.mapActive !== active) emit({ ...state, mapActive: active })
}

export function selectDestination(id: string | null): void {
  if (state.selectedId !== id) {
    emit({
      ...state,
      selectedId: id,
      arrived: false,
      diving: id !== null,
    })
    diveRuntime.progress = 0
  }
}

/** Imperative, render-free dive progress (0 → 1). Read in rAF/useFrame only. */
export const diveRuntime = { progress: 0 }

export function setArrived(arrived: boolean): void {
  if (state.arrived !== arrived) emit({ ...state, arrived })
}

export function endDive(): void {
  diveRuntime.progress = 0
  if (state.diving) emit({ ...state, diving: false })
}

export function resetExperience(): void {
  diveRuntime.progress = 0
  emit({ mapActive: false, selectedId: null, arrived: false, diving: false })
}

/* Imperative getters for animation loops (no subscription). */
export const getUiState = (): UiState => state

const subscribe = (cb: () => void): (() => void) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** Reactive snapshot for React components. */
export function useUiState(): UiState {
  return useSyncExternalStore(subscribe, getUiState)
}
