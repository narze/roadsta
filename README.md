# Tesler Roadsta - Test Drive

[![CI](https://github.com/narze/roadsta/actions/workflows/ci.yml/badge.svg)](https://github.com/narze/roadsta/actions/workflows/ci.yml)

Play: https://roadsta.vercel.app

A browser test drive of the Tesler Roadsta with a cold-gas thruster pack.
The car does not fly. It launches very fast, hops, and hovers for a short time.

Stack: Vite, React, three.js, React Three Fiber, drei, Rapier physics, postprocessing, zustand.

## Run

```sh
mise install   # Node and pnpm versions from mise.toml
pnpm install
pnpm dev
```

## Controls

| Key | Action |
|---|---|
| Arrow keys or WASD | Drive |
| Space | Hop - press again in the air for a free double jump, hold it to hover |
| Shift | Thruster boost (0-60 mph in under 1 s) |
| Enter or Backspace | Reset to the start line |
| In the air: hold Space + ← / → | Kickflip left / right |
| In the air: hold Space + ↑ / ↓ | Front flip / backflip |

On touch screens: a joystick on the left drives the car. Tap **Hop** to hop, tap it again in the air for a free double jump, and hold it to hover.
While you hold Hop in the air, flick your finger left/right for a kickflip, or up/down for a front flip or backflip.

Each finished trick restores 30% of the thruster gas. Finish each spin before you land. A clean landing scores points (combos multiply them).
Landing mid-spin is a bad landing and costs most of your speed.

## Test

```sh
pnpm test   # unit tests (thrusters, 0-60 timer)
pnpm e2e    # Playwright tests in a real browser
```
