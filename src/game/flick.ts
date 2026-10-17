import type { TrickKind } from './tricks'

// A flick is a quick swipe: at least `distance` px within `window` ms.
export const FLICK = { distance: 40, window: 250 }

export type FlickDir = 'left' | 'right' | 'up' | 'down'
export type FlickPoint = { x: number; y: number; t: number }

// anchor: where the current swipe started. last: the latest finger position.
export type FlickState = { anchor: FlickPoint; last: FlickPoint }

export const startFlick = (p: FlickPoint): FlickState => ({ anchor: p, last: p })

export function detectFlick(state: FlickState, p: FlickPoint): { dir: FlickDir | null; state: FlickState } {
  // After a still hold the anchor is stale. Start the swipe where the finger last was,
  // so the first move event of a fast swipe still counts toward its distance.
  const anchor = p.t - state.anchor.t > FLICK.window ? { x: state.last.x, y: state.last.y, t: p.t } : state.anchor
  const dx = p.x - anchor.x
  const dy = p.y - anchor.y
  if (Math.hypot(dx, dy) < FLICK.distance) return { dir: null, state: { anchor, last: p } }
  const dir: FlickDir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down'
  return { dir, state: startFlick(p) }
}

const TRICK_FOR: Record<FlickDir, TrickKind> = { left: 'kickflipLeft', right: 'kickflipRight', up: 'frontFlip', down: 'backFlip' }
export const flickToTrick = (dir: FlickDir) => TRICK_FOR[dir]
