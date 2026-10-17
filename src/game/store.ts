import { create } from 'zustand'
import { initialLaunchTimer, type LaunchTimer } from './launchTimer'

export const RING_COUNT = 8

type GameState = {
  ready: boolean
  started: boolean
  mph: number
  gas: number
  airborne: boolean
  hovering: boolean
  boosting: boolean
  altitude: number
  launch: LaunchTimer
  rings: number
  collected: boolean[]
  courseStart: number | null
  courseTime: number | null
  resetId: number
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
  launch: initialLaunchTimer(),
  rings: 0,
  collected: Array(RING_COUNT).fill(false),
  courseStart: null,
  courseTime: null,
  resetId: 0,
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
      resetId: s.resetId + 1,
    })),
}))

// Lets E2E tests read the game state.
;(window as unknown as { __roadster: typeof useGame }).__roadster = useGame
