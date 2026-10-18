// Air turn: in the air, Boost plus a held direction snaps the car to face that direction
// as seen from the camera (up = into the screen, left = screen left), at the exact pushed angle.
const MIN_INPUT = 0.5 // ignore small stick pushes
const MIN_DELTA = 0.17 // radians (~10 degrees); if the car already faces about that way, it is just a boost
// Arrow keys only give 8 directions, so a full snap feels too sharp. Keyboard turns stop at 45 degrees.
export const KEYBOARD_MAX_TURN = Math.PI / 4

// forward: push up / away (+1). left: push left (+1). Returns radians, positive = left of "up".
export function inputAngle(forward: number, left: number): number | null {
  if (Math.hypot(forward, left) < MIN_INPUT) return null
  return Math.atan2(left, forward)
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

// Yaw change for the car, taking the short way around, at most maxTurn.
// Yaws use the car's convention (positive = left).
export function airTurnDelta(carYaw: number, cameraYaw: number, angle: number, maxTurn = Math.PI): number | null {
  const delta = wrap(cameraYaw + angle - carYaw)
  return Math.abs(delta) < MIN_DELTA ? null : Math.max(-maxTurn, Math.min(maxTurn, delta))
}
