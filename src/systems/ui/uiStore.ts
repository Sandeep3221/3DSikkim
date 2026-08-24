import { useSyncExternalStore } from 'react'

/**
 * Shared UI/experience state for the world-as-UI phase: whether the journey
 * has resolved into the interactive map, and which destination is focused.
 * Plain module store + useSyncExternalStore so both React components and
 * useFrame loops can read it without re-render churn.
 */

export interface UiState {
  /** True once master progress enters the interactive-experience segment. */
  mapActive: boolean
  /** Selected destination id, or null when nothing is focused. */
  selectedId: string | null
}

let state: UiState = { mapActive: false, selectedId: null }
const listeners = new Set<() => void>()

function emit(next: UiState): void {
  state = next
  listeners.forEach((l) => l())
}

export function setMapActive(active: boolean): void {
  if (state.mapActive !== active) emit({ ...state, mapActive: active })
}

export function selectDestination(id: string | null): void {
  if (state.selectedId !== id) emit({ ...state, selectedId: id })
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
