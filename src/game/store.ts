import { create } from 'zustand'
import { RINGS } from './course'
import { initialLaunchTimer, type LaunchTimer } from './launchTimer'
import type { TrickKind } from './tricks'

export const RING_COUNT = RINGS.length

export type Toast = { id: number; text: string; tone: 'good' | 'bad' }

type GameState = {
  ready: boolean
  started: boolean
  mph: number
  gas: number
  airborne: boolean
  hovering: boolean
  boosting: boolean
  altitude: number
  trick: TrickKind | null
  launch: LaunchTimer
  rings: number
  collected: boolean[]
  courseStart: number | null
  courseTime: number | null
  resetId: number
  score: number
  toast: Toast | null
  showToast: (text: string, tone: Toast['tone']) => void
  addScore: (points: number) => void
  setReady: () => void
  start: () => void
  collectRing: (i: number) => void
  reset: () => void
}

export const useGame = create<GameState>((set, get) => ({
  ready: false,
  started: false,
  mph: 0,
  gas: 100,
  airborne: false,
  hovering: false,
  boosting: false,
  altitude: 0,
  trick: null,
  launch: initialLaunchTimer(),
  rings: 0,
  collected: Array(RING_COUNT).fill(false),
  courseStart: null,
  courseTime: null,
  resetId: 0,
  score: 0,
  toast: null,
  showToast: (text, tone) => set((s) => ({ toast: { id: (s.toast?.id ?? 0) + 1, text, tone } })),
  addScore: (points) => set((s) => ({ score: s.score + points })),
  setReady: () => set({ ready: true }),
  start: () => set({ started: true }),
  collectRing: (i) => {
    const { collected, courseStart } = get()
    if (collected[i]) return
    const next = collected.map((c, j) => c || j === i)
    const rings = next.filter(Boolean).length
    const now = performance.now()
    const begin = courseStart ?? now
    set({
      collected: next,
      rings,
      courseStart: begin,
      courseTime: rings === RING_COUNT ? (now - begin) / 1000 : null,
    })
  },
  reset: () =>
    set((s) => ({
      collected: Array(RING_COUNT).fill(false),
      rings: 0,
      courseStart: null,
      courseTime: null,
      score: 0,
      resetId: s.resetId + 1,
    })),
}))

// Lets E2E tests read the game state.
;(window as unknown as { __roadster: typeof useGame }).__roadster = useGame
