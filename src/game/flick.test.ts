import { describe, expect, it } from 'vitest'
import { FLICK, detectFlick, flickToTrick } from './flick'

const at = (x: number, y: number, t: number) => ({ x, y, t })

describe('detectFlick', () => {
  it('detects a fast swipe in each direction (screen y grows downward)', () => {
    const a = at(100, 100, 0)
    expect(detectFlick(a, at(100 - FLICK.distance, 100, 100)).dir).toBe('left')
    expect(detectFlick(a, at(100 + FLICK.distance, 100, 100)).dir).toBe('right')
    expect(detectFlick(a, at(100, 100 - FLICK.distance, 100)).dir).toBe('up')
    expect(detectFlick(a, at(100, 100 + FLICK.distance, 100)).dir).toBe('down')
  })

  it('uses the larger axis for diagonal swipes', () => {
    expect(detectFlick(at(0, 0, 0), at(-50, 20, 50)).dir).toBe('left')
  })

  it('ignores short moves and keeps the anchor', () => {
    const a = at(0, 0, 0)
    const r = detectFlick(a, at(10, 5, 50))
    expect(r.dir).toBeNull()
    expect(r.anchor).toBe(a)
  })

  it('ignores slow drags by moving the anchor forward', () => {
    const r = detectFlick(at(0, 0, 0), at(60, 0, FLICK.window + 1))
    expect(r.dir).toBeNull()
    expect(r.anchor).toEqual(at(60, 0, FLICK.window + 1))
  })

  it('re-anchors after a flick so the next flick can chain', () => {
    const p = at(0, -60, 80)
    expect(detectFlick(at(0, 0, 0), p).anchor).toEqual(p)
  })
})

describe('flickToTrick', () => {
  it('maps directions to tricks', () => {
    expect(flickToTrick('left')).toBe('rollLeft')
    expect(flickToTrick('right')).toBe('rollRight')
    expect(flickToTrick('up')).toBe('frontFlip')
    expect(flickToTrick('down')).toBe('backFlip')
  })
})
