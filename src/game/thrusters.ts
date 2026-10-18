// Cold-gas thruster pack: a short hop, a brief hover, and a launch boost.
// It is not real flight - the tank empties in a few seconds.
export const THRUSTER = {
  capacity: 100,
  hopCost: 30,
  hopVelocity: 11, // m/s added upward on a hop
  hoverCostPerSec: 45,
  boostCostPerSec: 35,
  boostAccel: 26, // extra m/s^2 from the rear thrusters, 0-60 under 1 s
  boostTopSpeed: 130, // m/s, about 290 mph - boost fades out toward this
  refillPerSec: 12,
  trickRefill: 30, // gas back for each finished trick (30% of the tank)
}

// airJumpReady: one free double jump per time in the air, re-armed on the ground.
export type ThrusterState = { gas: number; airJumpReady: boolean }

export type ThrusterInput = { hover: boolean; boost: boolean; onGround: boolean }

export const initialThrusters = (): ThrusterState => ({ gas: THRUSTER.capacity, airJumpReady: true })

export type HopResult = { state: ThrusterState; hopped: boolean; kind?: 'ground' | 'air' }

export function tryHop(state: ThrusterState, onGround: boolean): HopResult {
  if (onGround) {
    if (state.gas < THRUSTER.hopCost) return { state, hopped: false }
    return { state: { gas: state.gas - THRUSTER.hopCost, airJumpReady: true }, hopped: true, kind: 'ground' }
  }
  // Double jump: free, once per time in the air.
  if (!state.airJumpReady) return { state, hopped: false }
  return { state: { ...state, airJumpReady: false }, hopped: true, kind: 'air' }
}

export function rewardTrick(state: ThrusterState): ThrusterState {
  return { ...state, gas: Math.min(THRUSTER.capacity, state.gas + THRUSTER.trickRefill) }
}

export function boostAcceleration(speed: number) {
  return THRUSTER.boostAccel * Math.max(0, 1 - speed / THRUSTER.boostTopSpeed)
}

export function updateThrusters(state: ThrusterState, input: ThrusterInput, dt: number) {
  const hovering = input.hover && !input.onGround && state.gas > 0
  const boosting = input.boost && !hovering && state.gas > 0
  let gas = state.gas
  if (hovering) gas -= THRUSTER.hoverCostPerSec * dt
  if (boosting) gas -= THRUSTER.boostCostPerSec * dt
  // No refill while Boost is held, so an empty tank cannot feed a sputtering boost forever.
  if (!hovering && !input.boost && input.onGround) gas += THRUSTER.refillPerSec * dt
  gas = Math.min(THRUSTER.capacity, Math.max(0, gas))
  return { state: { gas, airJumpReady: state.airJumpReady || input.onGround }, hovering, boosting }
}
