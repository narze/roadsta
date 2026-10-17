import { describe, expect, it } from 'vitest'
import { FLICK, detectFlick, flickToTrick, startFlick } from './flick'

const at = (x: number, y: number, t: number) => ({ x, y, t })

describe('detectFlick', () => {
  const swipe = (from: ReturnType<typeof at>, to: ReturnType<typeof at>) => detectFlick(startFlick(from), to)

  it('detects a fast swipe in each direction (screen y grows downward)', () => {
    const a = at(100, 100, 0)
    expect(swipe(a, at(100 - FLICK.distance, 100, 100)).dir).toBe('left')
    expect(swipe(a, at(100 + FLICK.distance, 100, 100)).dir).toBe('right')
    expect(swipe(a, at(100, 100 - FLICK.distance, 100)).dir).toBe('up')
    expect(swipe(a, at(100, 100 + FLICK.distance, 100)).dir).toBe('down')
  })

  it('uses the larger axis for diagonal swipes', () => {
    expect(swipe(at(0, 0, 0), at(-50, 20, 50)).dir).toBe('left')
  })

  it('ignores short moves', () => {
    expect(swipe(at(0, 0, 0), at(10, 5, 50)).dir).toBeNull()
  })

  it('ignores slow drags', () => {
    let s = startFlick(at(0, 0, 0))
    for (let i = 1; i <= 6; i++) {
      const r = detectFlick(s, at(0, -30 * i, 300 * i)) // 30 px every 300 ms
      expect(r.dir).toBeNull()
      s = r.state
    }
  })

  it('measures a flick from where the finger rested after a long still hold', () => {
    // Hold still for 1 s, then swipe up 70 px in two quick move events.
    const s = startFlick(at(0, 0, 0))
    const first = detectFlick(s, at(0, -35, 1000))
    expect(first.dir).toBeNull()
    expect(detectFlick(first.state, at(0, -70, 1016)).dir).toBe('up')
  })

  it('can chain a second flick after the first', () => {
    const first = swipe(at(0, 0, 0), at(0, -60, 80))
    expect(first.dir).toBe('up')
    expect(detectFlick(first.state, at(-60, -60, 160)).dir).toBe('left')
  })
})

describe('flickToTrick', () => {
  it('maps directions to tricks', () => {
    expect(flickToTrick('left')).toBe('kickflipLeft')
    expect(flickToTrick('right')).toBe('kickflipRight')
    expect(flickToTrick('up')).toBe('frontFlip')
    expect(flickToTrick('down')).toBe('backFlip')
  })
})
