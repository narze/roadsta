# Roadster 2026 - Test Drive

A browser test drive of the 2026 Tesla Roadster with the SpaceX cold-gas thruster pack.
The car does not fly. It launches very fast, hops, and hovers for a short time.

Stack: Vite, React, three.js, React Three Fiber, drei, Rapier physics, postprocessing, zustand.

## Run

```sh
pnpm install
pnpm dev
```

## Controls

| Key | Action |
|---|---|
| Arrow keys or WASD | Drive |
| Space | Hop - hold it to hover for a moment |
| Shift | Thruster boost (0-60 mph in under 1 s) |
| Enter or Backspace | Reset to the start line |
| In the air: hold Space + ← / → | Barrel roll left / right |
| In the air: hold Space + ↑ / ↓ | Front flip / backflip |

On touch screens: a joystick on the left drives the car. Tap **Hop** to hop and hold it to hover.
While you hold Hop in the air, flick your finger left/right for a barrel roll, or up/down for a front flip or backflip.

Finish each spin before you land. A clean landing scores points (combos multiply them).
Landing mid-spin is a bad landing and costs most of your speed.

## Test

```sh
pnpm test   # unit tests (thrusters, 0-60 timer)
pnpm e2e    # Playwright tests in a real browser
```
