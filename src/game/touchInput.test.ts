import { describe, expect, it } from 'vitest'
import { stickToDrive } from './touchInput'

describe('stickToDrive', () => {
  it('gives no input inside the dead zone', () => {
    expect(stickToDrive({ x: 0.05, y: -0.08 })).toEqual({ throttle: 0, steer: 0 })
  })

  it('pushing up is full throttle', () => {
    expect(stickToDrive({ x: 0, y: 1 }).throttle).toBeCloseTo(1)
  })

  it('pulling down brakes or reverses', () => {
    expect(stickToDrive({ x: 0, y: -1 }).throttle).toBeCloseTo(-1)
  })

  it('pushing left steers left (positive steer)', () => {
    expect(stickToDrive({ x: -1, y: 0 }).steer).toBeCloseTo(1)
    expect(stickToDrive({ x: 1, y: 0 }).steer).toBeCloseTo(-1)
  })

  it('scales smoothly from the edge of the dead zone', () => {
    const half = stickToDrive({ x: 0, y: 0.6 }).throttle
    expect(half).toBeGreaterThan(0.3)
    expect(half).toBeLessThan(0.8)
  })

  it('clamps values to -1..1', () => {
    const r = stickToDrive({ x: 3, y: -3 })
    expect(r.throttle).toBe(-1)
    expect(r.steer).toBe(-1)
  })
})
