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

## Test

```sh
pnpm test   # unit tests (thrusters, 0-60 timer)
pnpm e2e    # Playwright tests in a real browser
```
