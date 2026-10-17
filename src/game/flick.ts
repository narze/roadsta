import type { TrickKind } from './tricks'

// A flick is a quick swipe: at least `distance` px within `window` ms.
export const FLICK = { distance: 40, window: 250 }

export type FlickDir = 'left' | 'right' | 'up' | 'down'
export type FlickPoint = { x: number; y: number; t: number }

export function detectFlick(anchor: FlickPoint, p: FlickPoint): { dir: FlickDir | null; anchor: FlickPoint } {
  if (p.t - anchor.t > FLICK.window) return { dir: null, anchor: p }
  const dx = p.x - anchor.x
  const dy = p.y - anchor.y
  if (Math.hypot(dx, dy) < FLICK.distance) return { dir: null, anchor }
  const dir: FlickDir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down'
  return { dir, anchor: p }
}

const TRICK_FOR: Record<FlickDir, TrickKind> = { left: 'rollLeft', right: 'rollRight', up: 'frontFlip', down: 'backFlip' }
export const flickToTrick = (dir: FlickDir) => TRICK_FOR[dir]
