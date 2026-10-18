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
| In the air: Shift + an arrow (or diagonal) | Air turn: instantly turn up to 20° toward that direction on screen, keeping your speed (once per jump) |
| Enter or Backspace | Reset to the start line |
| M | Mute / unmute sound (remembered) |
| In the air: hold Space + ← / → | Kickflip left / right |
| In the air: hold Space + ↑ / ↓ | Front flip / backflip |

On touch screens: a joystick on the left drives the car. Tap **Hop** to hop, tap it again in the air for a free double jump, and hold it to hover.
In the air, tap **Boost** while the joystick is pushed: the car instantly faces the exact direction you push, as seen on screen (once per jump).
While you hold Hop in the air, flick your finger left/right for a kickflip, or up/down for a front flip or backflip.

Each finished trick restores 30% of the thruster gas. Tick **Unlimited gas** on the start card to keep the tank full (remembered). Finish each spin before you land. A clean landing scores points (combos multiply them).
Landing mid-spin is a bad landing and costs most of your speed.

## Sound

All sounds are synthesized with [Tone.js](https://tonejs.github.io/) - no audio files: an electric motor whine that rises with speed, thruster hiss for hover and boost, and one-shot sounds for hops, the air turn, tricks, landings, rings, and the finish. Audio starts on the Start tap (browsers block sound before a tap), and Tone.js loads only then.

## Test

```sh
pnpm test   # unit tests (thrusters, 0-60 timer)
pnpm e2e    # Playwright tests in a real browser
```
