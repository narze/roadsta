// Air tricks: kickflips and flips. They spin the car model, not the physics body.
export type TrickKind = 'kickflipLeft' | 'kickflipRight' | 'frontFlip' | 'backFlip'

export const TRICK = {
  duration: 0.7, // seconds for one full spin
  cleanFrom: 0.8, // landing after this much of a spin still counts as clean
  points: { kickflipLeft: 100, kickflipRight: 100, frontFlip: 150, backFlip: 150 } satisfies Record<TrickKind, number>,
}

export const TRICK_NAMES: Record<TrickKind, string> = {
  kickflipLeft: 'Kickflip left',
  kickflipRight: 'Kickflip right',
  frontFlip: 'Front flip',
  backFlip: 'Backflip',
}

export type TrickState = { active: TrickKind | null; progress: number; combo: TrickKind[] }

export type LandResult = { kind: 'clean'; tricks: TrickKind[]; points: number } | { kind: 'crash' } | null

export const initialTricks = (): TrickState => ({ active: null, progress: 0, combo: [] })

export function startTrick(s: TrickState, kind: TrickKind, airborne: boolean): TrickState {
  if (!airborne || s.active) return s
  return { ...s, active: kind, progress: 0 }
}

export function updateTricks(s: TrickState, dt: number): TrickState {
  if (!s.active) return s
  const progress = s.progress + dt / TRICK.duration
  if (progress < 1) return { ...s, progress }
  return { active: null, progress: 0, combo: [...s.combo, s.active] }
}

export function land(s: TrickState): { state: TrickState; result: LandResult } {
  const state = initialTricks()
  if (s.active && s.progress < TRICK.cleanFrom) return { state, result: { kind: 'crash' } }
  const tricks = s.active ? [...s.combo, s.active] : s.combo
  if (tricks.length === 0) return { state, result: null }
  const base = tricks.reduce((sum, t) => sum + TRICK.points[t], 0)
  return { state, result: { kind: 'clean', tricks, points: base * tricks.length } }
}

const ease = (p: number) => p * p * (3 - 2 * p)

// Model rotation in radians. Roll is about the forward axis, pitch about the side axis.
export function trickRotation(s: TrickState) {
  if (!s.active) return { roll: 0, pitch: 0 }
  const a = ease(Math.min(1, s.progress)) * Math.PI * 2
  switch (s.active) {
    case 'kickflipLeft': return { roll: -a, pitch: 0 }
    case 'kickflipRight': return { roll: a, pitch: 0 }
    case 'frontFlip': return { roll: 0, pitch: a }
    case 'backFlip': return { roll: 0, pitch: -a }
  }
}
