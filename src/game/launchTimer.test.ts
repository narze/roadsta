import { describe, expect, it } from 'vitest'
import { initialLaunchTimer, updateLaunchTimer, type LaunchTimer } from './launchTimer'

describe('launch timer (0-60 mph)', () => {
  it('arms when the car stands still', () => {
    const t = updateLaunchTimer(initialLaunchTimer(), 0, 0.016)
    expect(t.phase).toBe('armed')
  })

  it('starts running when the car moves from a stop', () => {
    let t = updateLaunchTimer(initialLaunchTimer(), 0, 0.016)
    t = updateLaunchTimer(t, 2, 0.1)
    expect(t.phase).toBe('running')
    expect(t.elapsed).toBeCloseTo(0.1)
  })

  it('records the time when the car reaches 60 mph', () => {
    let t = updateLaunchTimer(initialLaunchTimer(), 0, 0.016)
    t = updateLaunchTimer(t, 20, 0.5)
    t = updateLaunchTimer(t, 61, 0.4)
    expect(t.phase).toBe('done')
    expect(t.last).toBeCloseTo(0.9)
    expect(t.best).toBeCloseTo(0.9)
  })

  it('keeps the best time across runs', () => {
    let t: LaunchTimer = { phase: 'armed', elapsed: 0, last: 2, best: 1.5 }
    t = updateLaunchTimer(t, 30, 1)
    t = updateLaunchTimer(t, 65, 1)
    expect(t.last).toBeCloseTo(2)
    expect(t.best).toBeCloseTo(1.5)
  })

  it('re-arms after the car stops again', () => {
    let t: LaunchTimer = { phase: 'done', elapsed: 1, last: 1, best: 1 }
    t = updateLaunchTimer(t, 0.2, 0.016)
    expect(t.phase).toBe('armed')
  })

  it('cancels a run when the car stops before 60 mph', () => {
    let t: LaunchTimer = { phase: 'running', elapsed: 1, last: null, best: null }
    t = updateLaunchTimer(t, 0.2, 0.016)
    expect(t.phase).toBe('armed')
    expect(t.last).toBeNull()
  })
})
