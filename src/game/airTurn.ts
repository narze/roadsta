// Air turn: in the air, Boost plus a held direction snaps the car to face that direction
// as seen from the camera (up = into the screen, left = screen left), at the exact pushed angle.
const MIN_INPUT = 0.5 // ignore small stick pushes
const MIN_DELTA = 0.17 // radians (~10 degrees); if the car already faces about that way, it is just a boost

// forward: push up / away (+1). left: push left (+1). Returns radians, positive = left of "up".
export function inputAngle(forward: number, left: number): number | null {
  if (Math.hypot(forward, left) < MIN_INPUT) return null
  return Math.atan2(left, forward)
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

// Yaw change for the car, taking the short way around. Yaws use the car's convention (positive = left).
export function airTurnDelta(carYaw: number, cameraYaw: number, angle: number): number | null {
  const delta = wrap(cameraYaw + angle - carYaw)
  return Math.abs(delta) < MIN_DELTA ? null : delta
}
