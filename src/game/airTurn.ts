// Air turn: in the air, Boost plus a held direction snaps the car to face that way.
// The direction is relative to the car: left/right = 90 degrees, back = 180, diagonals = 45/135.
const MIN_INPUT = 0.5 // ignore small stick pushes
const MIN_ANGLE = 0.35 // radians (~20 degrees); closer to straight ahead is just a boost

// throttle: +1 forward / -1 back. steer: +1 left / -1 right. Returns radians, positive = left.
export function airTurnAngle(throttle: number, steer: number): number | null {
  if (Math.hypot(throttle, steer) < MIN_INPUT) return null
  const angle = Math.atan2(steer, throttle)
  return Math.abs(angle) < MIN_ANGLE ? null : angle
}
