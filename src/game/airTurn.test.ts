import { describe, expect, it } from 'vitest'
import { airTurnDelta, inputAngle, KEYBOARD_MAX_TURN } from './airTurn'
import { initialThrusters, tryAirTurn, updateThrusters } from './thrusters'

// Input angle: forward = push up / away, left = push left. Radians, positive = left of "up".
describe('inputAngle', () => {
  it('reads the exact analog angle of the push', () => {
    expect(inputAngle(1, 0)).toBeCloseTo(0)
    expect(inputAngle(0, 1)).toBeCloseTo(Math.PI / 2)
    expect(inputAngle(0, -1)).toBeCloseTo(-Math.PI / 2)
    expect(inputAngle(Math.cos(Math.PI / 6), -Math.sin(Math.PI / 6))).toBeCloseTo(-Math.PI / 6) // 30 degrees right
    expect(Math.abs(inputAngle(-1, 0)!)).toBeCloseTo(Math.PI)
  })

  it('ignores no input or a tiny push', () => {
    expect(inputAngle(0, 0)).toBeNull()
    expect(inputAngle(0.2, -0.2)).toBeNull()
  })
})

// Turn needed so the car faces the pushed direction as seen from the camera.
describe('airTurnDelta', () => {
  it('with the camera behind the car, matches the push angle', () => {
    expect(airTurnDelta(0, 0, Math.PI / 2)).toBeCloseTo(Math.PI / 2)
    expect(airTurnDelta(1, 1, -Math.PI / 6)).toBeCloseTo(-Math.PI / 6)
  })

  it('is relative to the camera, not the car', () => {
    // Car points 0.5 rad left of the camera. Pushing up means "face where the camera looks".
    expect(airTurnDelta(0.5, 0, 0)).toBeCloseTo(-0.5)
  })

  it('takes the short way around across the +/-180 degree line', () => {
    expect(airTurnDelta(Math.PI - 0.1, -Math.PI + 0.1, 0)).toBeCloseTo(0.2)
  })

  it('limits the turn to a maximum angle, in the same direction', () => {
    expect(airTurnDelta(0, 0, Math.PI / 2, KEYBOARD_MAX_TURN)).toBeCloseTo(KEYBOARD_MAX_TURN)
    expect(airTurnDelta(0, 0, -Math.PI / 2, KEYBOARD_MAX_TURN)).toBeCloseTo(-KEYBOARD_MAX_TURN)
    expect(Math.abs(airTurnDelta(0, 0, Math.PI, KEYBOARD_MAX_TURN)!)).toBeCloseTo(KEYBOARD_MAX_TURN)
    expect(airTurnDelta(0, 0, 0.3, KEYBOARD_MAX_TURN)).toBeCloseTo(0.3) // smaller turns are not changed
  })

  it('keyboard turns are limited to 20 degrees', () => {
    expect(KEYBOARD_MAX_TURN).toBeCloseTo(Math.PI / 9)
  })

  it('does not turn when the car already faces about that way', () => {
    expect(airTurnDelta(0, 0, 0)).toBeNull()
    expect(airTurnDelta(0, 0.1, 0)).toBeNull()
  })
})

describe('tryAirTurn', () => {
  it('turns once in the air', () => {
    const r = tryAirTurn(initialThrusters(), true)
    expect(r.turned).toBe(true)
    expect(tryAirTurn(r.state, true).turned).toBe(false)
  })

  it('does not turn on the ground', () => {
    expect(tryAirTurn(initialThrusters(), false).turned).toBe(false)
  })

  it('is free and re-arms when the car is back on the ground', () => {
    const used = tryAirTurn({ ...initialThrusters(), gas: 40 }, true).state
    expect(used.gas).toBe(40)
    expect(updateThrusters(used, { hover: false, boost: false, onGround: true }, 0.1).state.airTurnReady).toBe(true)
  })
})
