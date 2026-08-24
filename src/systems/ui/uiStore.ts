import { useSyncExternalStore } from 'react'

/**
 * Shared UI/experience state for the world-as-UI phase: whether the journey
 * has resolved into the interactive map, which destination is focused, and
 * the cinematic-dive progress (time-based camera route) when one is active.
 * Plain module store + useSyncExternalStore so both React components and
 * useFrame loops can read it without re-render churn.
 */

export interface UiState {
  /** True once master progress enters the interactive-experience segment. */
  mapActive: boolean
  /** Selected destination id, or null when nothing is focused. */
  selectedId: string | null
  /** True once the cinematic dive has physically arrived at the destination. */
  arrived: boolean
  /** True during the cinematic camera dive (camera is travelling to destination). */
  diving: boolean
  /** Elapsed normalized time within the current dive (0 → 1), for the 8-stage route. */
  diveProgress: number
}

let state: UiState = {
  mapActive: false,
  selectedId: null,
  arrived: false,
  diving: false,
  diveProgress: 0,
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
      diveProgress: 0,
    })
  }
}

export function setDiveProgress(t: number): void {
  if (state.diving && state.diveProgress !== t)
    emit({ ...state, diveProgress: t })
}

export function setArrived(arrived: boolean): void {
  if (state.arrived !== arrived) emit({ ...state, arrived })
}

export function endDive(): void {
  emit({ ...state, diving: false, diveProgress: 0 })
}

export function resetExperience(): void {
  emit({ mapActive: false, selectedId: null, arrived: false, diving: false, diveProgress: 0 })
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
