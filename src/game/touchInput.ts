import { create } from 'zustand'
import type { TrickKind } from './tricks'

const DEAD_ZONE = 0.15

const clamp1 = (v: number) => Math.max(-1, Math.min(1, v))

// Rescale one axis so input starts at 0 at the dead zone edge and reaches 1 at full tilt.
function axis(v: number) {
  const a = Math.abs(v)
  if (a < DEAD_ZONE) return 0
  return clamp1(Math.sign(v) * ((Math.min(a, 1) - DEAD_ZONE) / (1 - DEAD_ZONE)))
}

// Joystick vector (x right, y up, -1..1) to car input. Positive steer turns left.
export function stickToDrive(v: { x: number; y: number }) {
  return { throttle: axis(v.y), steer: -axis(v.x) || 0 }
}

type TouchInput = {
  throttle: number
  steer: number
  jump: boolean
  boost: boolean
  // Latest flick on the Hop button. The id changes on every flick.
  trick: { kind: TrickKind; id: number } | null
  setStick: (v: { x: number; y: number }) => void
  setJump: (down: boolean) => void
  setBoost: (down: boolean) => void
  requestTrick: (kind: TrickKind) => void
}

export const useTouchInput = create<TouchInput>((set) => ({
  throttle: 0,
  steer: 0,
  jump: false,
  boost: false,
  trick: null,
  setStick: (v) => set(stickToDrive(v)),
  setJump: (jump) => set({ jump }),
  setBoost: (boost) => set({ boost }),
  requestTrick: (kind) => set((s) => ({ trick: { kind, id: (s.trick?.id ?? 0) + 1 } })),
}))
