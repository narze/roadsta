// Measures 0-60 mph times from a standing start.
export type LaunchTimer = {
  phase: 'idle' | 'armed' | 'running' | 'done'
  elapsed: number
  last: number | null
  best: number | null
}

const STOP_MPH = 0.5
const TARGET_MPH = 60

export const initialLaunchTimer = (): LaunchTimer => ({ phase: 'idle', elapsed: 0, last: null, best: null })

export function updateLaunchTimer(t: LaunchTimer, mph: number, dt: number): LaunchTimer {
  if (mph < STOP_MPH) return t.phase === 'armed' ? t : { ...t, phase: 'armed', elapsed: 0 }
  if (t.phase === 'armed') return { ...t, phase: 'running', elapsed: dt }
  if (t.phase !== 'running') return t
  const elapsed = t.elapsed + dt
  if (mph < TARGET_MPH) return { ...t, elapsed }
  const best = t.best === null ? elapsed : Math.min(t.best, elapsed)
  return { ...t, phase: 'done', elapsed, last: elapsed, best }
}
