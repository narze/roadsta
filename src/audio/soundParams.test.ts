import { describe, expect, it } from 'vitest'
import { loadMuted, motorParams, saveMuted, thrusterParams } from './soundParams'

describe('motorParams (electric motor whine)', () => {
  it('rises in pitch and volume with speed', () => {
    const idle = motorParams(0, false)
    const fast = motorParams(150, false)
    expect(fast.frequency).toBeGreaterThan(idle.frequency)
    expect(fast.volume).toBeGreaterThan(idle.volume)
  })

  it('stops rising above top speed', () => {
    expect(motorParams(1000, false)).toEqual(motorParams(300, false))
  })

  it('is silent at a standstill, like a real electric car', () => {
    expect(motorParams(0, false).volume).toBeLessThanOrEqual(-60)
  })

  it('is clearly audible at cruising speed', () => {
    expect(motorParams(70, false).volume).toBeGreaterThan(-25)
  })

  it('spins up a little in the air (no load on the wheels)', () => {
    expect(motorParams(60, true).frequency).toBeGreaterThan(motorParams(60, false).frequency)
  })
})

describe('thrusterParams (cold-gas hiss)', () => {
  it('is silent when no thruster fires', () => {
    expect(thrusterParams(false, false).on).toBe(false)
  })

  it('boost is louder and brighter than hover', () => {
    const hover = thrusterParams(true, false)
    const boost = thrusterParams(false, true)
    expect(hover.on && boost.on).toBe(true)
    expect(boost.volume).toBeGreaterThan(hover.volume)
    expect(boost.cutoff).toBeGreaterThan(hover.cutoff)
  })
})

describe('mute setting', () => {
  const memory = () => {
    const data = new Map<string, string>()
    return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) }
  }

  it('is off by default and remembers the last choice', () => {
    const storage = memory()
    expect(loadMuted(storage)).toBe(false)
    saveMuted(storage, true)
    expect(loadMuted(storage)).toBe(true)
  })

  it('does not crash when storage is blocked (private browsing)', () => {
    const blocked = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    expect(loadMuted(blocked)).toBe(false)
    expect(() => saveMuted(blocked, true)).not.toThrow()
  })
})
