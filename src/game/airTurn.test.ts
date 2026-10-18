import { describe, expect, it } from 'vitest'
import { airTurnAngle } from './airTurn'
import { initialThrusters, tryAirTurn, updateThrusters } from './thrusters'

// throttle: +1 forward / -1 back. steer: +1 left / -1 right (same as the driving input).
describe('airTurnAngle', () => {
  it('turns 90 degrees left or right', () => {
    expect(airTurnAngle(0, 1)).toBeCloseTo(Math.PI / 2)
    expect(airTurnAngle(0, -1)).toBeCloseTo(-Math.PI / 2)
  })

  it('turns around when pulling back', () => {
    expect(Math.abs(airTurnAngle(-1, 0)!)).toBeCloseTo(Math.PI)
  })

  it('turns 45 and 135 degrees for diagonals', () => {
    expect(airTurnAngle(1, 1)).toBeCloseTo(Math.PI / 4)
    expect(airTurnAngle(-1, -1)).toBeCloseTo((-3 * Math.PI) / 4)
  })

  it('does not turn with no direction, a tiny push, or straight ahead', () => {
    expect(airTurnAngle(0, 0)).toBeNull()
    expect(airTurnAngle(0.2, -0.2)).toBeNull()
    expect(airTurnAngle(1, 0)).toBeNull()
    expect(airTurnAngle(1, 0.1)).toBeNull()
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
