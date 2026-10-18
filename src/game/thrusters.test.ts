import { describe, expect, it } from 'vitest'
import { THRUSTER, boostAcceleration, fillTank, initialThrusters, rewardTrick, tryHop, updateThrusters } from './thrusters'

const tank = (gas: number) => ({ ...initialThrusters(), gas })

const idle = { hover: false, boost: false, onGround: true }

describe('tryHop', () => {
  it('gives an upward impulse and uses gas when on the ground', () => {
    const r = tryHop(initialThrusters(), true)
    expect(r.hopped).toBe(true)
    expect(r.kind).toBe('ground')
    expect(r.state.gas).toBe(THRUSTER.capacity - THRUSTER.hopCost)
  })

  it('does one free double jump in the air', () => {
    const r = tryHop(tank(50), false)
    expect(r.hopped).toBe(true)
    expect(r.kind).toBe('air')
    expect(r.state.gas).toBe(50)
    expect(r.state.airJumpReady).toBe(false)
  })

  it('allows only one double jump per time in the air', () => {
    const first = tryHop(initialThrusters(), false)
    const second = tryHop(first.state, false)
    expect(second.hopped).toBe(false)
  })

  it('double jumps even with an empty tank', () => {
    expect(tryHop(tank(0), false).hopped).toBe(true)
  })

  it('re-arms the double jump when the car is back on the ground', () => {
    const used = tryHop(initialThrusters(), false).state
    expect(updateThrusters(used, { hover: false, boost: false, onGround: false }, 0.1).state.airJumpReady).toBe(false)
    expect(updateThrusters(used, { hover: false, boost: false, onGround: true }, 0.1).state.airJumpReady).toBe(true)
  })

  it('does nothing when gas is too low', () => {
    const r = tryHop(tank(THRUSTER.hopCost - 1), true)
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
    const r = updateThrusters(tank(0), { ...idle, hover: true, onGround: false }, 0.1)
    expect(r.hovering).toBe(false)
    expect(r.state.gas).toBe(0)
  })

  it('never takes gas below zero', () => {
    const r = updateThrusters(tank(1), { ...idle, hover: true, onGround: false }, 1)
    expect(r.state.gas).toBe(0)
  })

  it('boosts on the ground and uses gas', () => {
    const r = updateThrusters(initialThrusters(), { ...idle, boost: true }, 1)
    expect(r.boosting).toBe(true)
    expect(r.state.gas).toBeCloseTo(THRUSTER.capacity - THRUSTER.boostCostPerSec)
  })

  it('refills slowly on the ground when no thruster is used', () => {
    const r = updateThrusters(tank(10), idle, 1)
    expect(r.state.gas).toBeCloseTo(10 + THRUSTER.refillPerSec)
  })

  it('does not refill in the air', () => {
    const r = updateThrusters(tank(10), { ...idle, onGround: false }, 1)
    expect(r.state.gas).toBe(10)
  })

  it('does not refill above capacity', () => {
    const r = updateThrusters(tank(THRUSTER.capacity - 1), idle, 1)
    expect(r.state.gas).toBe(THRUSTER.capacity)
  })
})

describe('rewardTrick', () => {
  it('restores 30% of the tank for a finished trick', () => {
    expect(THRUSTER.trickRefill).toBe(THRUSTER.capacity * 0.3)
    expect(rewardTrick(tank(20)).gas).toBeCloseTo(20 + THRUSTER.trickRefill)
  })

  it('does not fill above capacity', () => {
    expect(rewardTrick(tank(90)).gas).toBe(THRUSTER.capacity)
  })
})

describe('boostAcceleration', () => {
  it('is full from a standstill', () => {
    expect(boostAcceleration(0)).toBe(THRUSTER.boostAccel)
  })

  it('fades to zero at the boost top speed and never goes negative', () => {
    expect(boostAcceleration(THRUSTER.boostTopSpeed)).toBe(0)
    expect(boostAcceleration(THRUSTER.boostTopSpeed * 2)).toBe(0)
  })
})

describe('boost on an empty tank', () => {
  it('does not refill while the boost key is held, so boost cannot sputter on forever', () => {
    const r = updateThrusters(tank(0), { hover: false, boost: true, onGround: true }, 1)
    expect(r.boosting).toBe(false)
    expect(r.state.gas).toBe(0)
  })
})

describe('fillTank (unlimited gas mode)', () => {
  it('fills the tank and keeps the air jump and air turn state', () => {
    const used = { gas: 3, airJumpReady: false, airTurnReady: false }
    expect(fillTank(used)).toEqual({ gas: THRUSTER.capacity, airJumpReady: false, airTurnReady: false })
  })
})
