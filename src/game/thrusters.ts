// Cold-gas thruster pack: a short hop, a brief hover, and a launch boost.
// It is not real flight - the tank empties in a few seconds.
export const THRUSTER = {
  capacity: 100,
  hopCost: 30,
  hopVelocity: 9, // m/s added upward on a hop
  hoverCostPerSec: 45,
  boostCostPerSec: 35,
  refillPerSec: 12,
}

export type ThrusterState = { gas: number }

export type ThrusterInput = { hover: boolean; boost: boolean; onGround: boolean }

export const initialThrusters = (): ThrusterState => ({ gas: THRUSTER.capacity })

export function tryHop(state: ThrusterState, onGround: boolean) {
  if (!onGround || state.gas < THRUSTER.hopCost) return { state, hopped: false }
  return { state: { gas: state.gas - THRUSTER.hopCost }, hopped: true }
}

export function updateThrusters(state: ThrusterState, input: ThrusterInput, dt: number) {
  const hovering = input.hover && !input.onGround && state.gas > 0
  const boosting = input.boost && !hovering && state.gas > 0
  let gas = state.gas
  if (hovering) gas -= THRUSTER.hoverCostPerSec * dt
  if (boosting) gas -= THRUSTER.boostCostPerSec * dt
  if (!hovering && !boosting && input.onGround) gas += THRUSTER.refillPerSec * dt
  gas = Math.min(THRUSTER.capacity, Math.max(0, gas))
  return { state: { gas }, hovering, boosting }
}
