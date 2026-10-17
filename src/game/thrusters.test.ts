import { describe, expect, it } from 'vitest'
import { THRUSTER, initialThrusters, tryHop, updateThrusters } from './thrusters'

const idle = { hover: false, boost: false, onGround: true }

describe('tryHop', () => {
  it('gives an upward impulse and uses gas when on the ground', () => {
    const r = tryHop(initialThrusters(), true)
    expect(r.hopped).toBe(true)
    expect(r.state.gas).toBe(THRUSTER.capacity - THRUSTER.hopCost)
  })

  it('does nothing in the air', () => {
    const r = tryHop(initialThrusters(), false)
    expect(r.hopped).toBe(false)
    expect(r.state.gas).toBe(THRUSTER.capacity)
  })

  it('does nothing when gas is too low', () => {
    const r = tryHop({ gas: THRUSTER.hopCost - 1 }, true)
    expect(r.hopped).toBe(false)
  })
})

describe('updateThrusters', () => {
  it('hovers only in the air and uses gas over time', () => {
    const r = updateThrusters(initialThrusters(), { ...idle, hover: true, onGround: false }, 1)
    expect(r.hovering).toBe(true)
    expect(r.state.gas).toBeCloseTo(THRUSTER.capacity - THRUSTER.hoverCostPerSec)
  })

  it('does not hover on the ground', () => {
    const r = updateThrusters(initialThrusters(), { ...idle, hover: true }, 1)
    expect(r.hovering).toBe(false)
  })

  it('stops hovering when the tank is empty', () => {
    const r = updateThrusters({ gas: 0 }, { ...idle, hover: true, onGround: false }, 0.1)
    expect(r.hovering).toBe(false)
    expect(r.state.gas).toBe(0)
  })

  it('never takes gas below zero', () => {
    const r = updateThrusters({ gas: 1 }, { ...idle, hover: true, onGround: false }, 1)
    expect(r.state.gas).toBe(0)
  })

  it('boosts on the ground and uses gas', () => {
    const r = updateThrusters(initialThrusters(), { ...idle, boost: true }, 1)
    expect(r.boosting).toBe(true)
    expect(r.state.gas).toBeCloseTo(THRUSTER.capacity - THRUSTER.boostCostPerSec)
  })

  it('refills slowly on the ground when no thruster is used', () => {
    const r = updateThrusters({ gas: 10 }, idle, 1)
    expect(r.state.gas).toBeCloseTo(10 + THRUSTER.refillPerSec)
  })

  it('does not refill in the air', () => {
    const r = updateThrusters({ gas: 10 }, { ...idle, onGround: false }, 1)
    expect(r.state.gas).toBe(10)
  })

  it('does not refill above capacity', () => {
    const r = updateThrusters({ gas: THRUSTER.capacity - 1 }, idle, 1)
    expect(r.state.gas).toBe(THRUSTER.capacity)
  })
})
