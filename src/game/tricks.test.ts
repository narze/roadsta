import { describe, expect, it } from 'vitest'
import { TRICK, initialTricks, land, startTrick, trickRotation, updateTricks } from './tricks'

const spinTo = (progress: number) => updateTricks(startTrick(initialTricks(), 'kickflipLeft', true), TRICK.duration * progress)

describe('startTrick', () => {
  it('starts a trick in the air', () => {
    expect(startTrick(initialTricks(), 'frontFlip', true).active).toBe('frontFlip')
  })

  it('does nothing on the ground', () => {
    expect(startTrick(initialTricks(), 'frontFlip', false).active).toBeNull()
  })

  it('does not interrupt a trick that is in progress', () => {
    const s = startTrick(startTrick(initialTricks(), 'kickflipLeft', true), 'backFlip', true)
    expect(s.active).toBe('kickflipLeft')
  })
})

describe('updateTricks', () => {
  it('adds a finished trick to the combo', () => {
    const s = spinTo(1.01)
    expect(s.active).toBeNull()
    expect(s.combo).toEqual(['kickflipLeft'])
  })

  it('allows a second trick after the first one ends', () => {
    let s = spinTo(1.01)
    s = updateTricks(startTrick(s, 'backFlip', true), TRICK.duration * 1.01)
    expect(s.combo).toEqual(['kickflipLeft', 'backFlip'])
  })
})

describe('land', () => {
  it('scores a clean landing after a full trick', () => {
    const r = land(spinTo(1.01))
    expect(r.result).toEqual({ kind: 'clean', tricks: ['kickflipLeft'], points: TRICK.points.kickflipLeft })
    expect(r.state).toEqual(initialTricks())
  })

  it('counts a nearly finished trick as clean', () => {
    const r = land(spinTo(TRICK.cleanFrom + 0.05))
    expect(r.result?.kind).toBe('clean')
  })

  it('crashes when the car lands mid-trick', () => {
    expect(land(spinTo(0.5)).result).toEqual({ kind: 'crash' })
  })

  it('multiplies points by the combo size', () => {
    let s = spinTo(1.01)
    s = updateTricks(startTrick(s, 'frontFlip', true), TRICK.duration * 1.01)
    const r = land(s)
    expect(r.result).toMatchObject({ kind: 'clean', points: (TRICK.points.kickflipLeft + TRICK.points.frontFlip) * 2 })
  })

  it('returns no result when there was no trick', () => {
    expect(land(initialTricks()).result).toBeNull()
  })
})

describe('trickRotation', () => {
  it('is zero with no trick', () => {
    expect(trickRotation(initialTricks())).toEqual({ roll: 0, pitch: 0 })
  })

  it('kickflips left as a negative roll and right as a positive roll', () => {
    const half = (k: 'kickflipLeft' | 'kickflipRight') => updateTricks(startTrick(initialTricks(), k, true), TRICK.duration / 2)
    expect(trickRotation(half('kickflipLeft')).roll).toBeCloseTo(-Math.PI)
    expect(trickRotation(half('kickflipRight')).roll).toBeCloseTo(Math.PI)
  })

  it('front flip pitches the nose down (positive), back flip pitches it up (negative)', () => {
    const half = (k: 'frontFlip' | 'backFlip') => updateTricks(startTrick(initialTricks(), k, true), TRICK.duration / 2)
    expect(trickRotation(half('frontFlip')).pitch).toBeCloseTo(Math.PI)
    expect(trickRotation(half('backFlip')).pitch).toBeCloseTo(-Math.PI)
  })
})
