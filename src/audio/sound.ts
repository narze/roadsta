import type * as ToneLib from 'tone'
import { motorParams, thrusterParams } from './soundParams'

// All sounds are synthesized (no audio files). Nothing is created before start(),
// which must run inside a user gesture (the Start tap) so the browser allows audio.
// Tone.js is loaded only then: importing it creates an AudioContext, which browsers
// refuse before a tap (console warnings), and it keeps Tone.js out of the first page load.

type Tone = typeof ToneLib

export type SfxName = 'hop' | 'doubleJump' | 'airTurn' | 'spin' | 'land' | 'crash' | 'ring' | 'trick' | 'finish'

type Nodes = {
  motor: ToneLib.FatOscillator
  motorVolume: ToneLib.Volume
  hiss: ToneLib.Noise
  hissFilter: ToneLib.Filter
  hissVolume: ToneLib.Volume
  thump: ToneLib.MembraneSynth
  puff: ToneLib.NoiseSynth
  whoosh: ToneLib.NoiseSynth
  whooshFilter: ToneLib.Filter
  crunch: ToneLib.NoiseSynth
  chime: ToneLib.PolySynth
}

const LOG_SIZE = 50
const LAND_COOLDOWN = 0.15 // seconds; small bumps should not spam the landing thud

class Sound {
  readonly log: SfxName[] = []
  private nodes: Nodes | null = null
  private tone: Tone | null = null
  private ctx: AudioContext | null = null
  private muted = false
  private lastLand = -1

  // Call from a click/tap handler.
  start() {
    if (this.ctx) {
      void this.ctx.resume()
      return
    }
    const ctx = new AudioContext({ latencyHint: 'interactive' })
    this.ctx = ctx
    const resumed = ctx.resume() // inside the tap: required by iOS Safari
    void Promise.all([import('tone'), resumed]).then(([Tone]) => {
      Tone.setContext(new Tone.Context({ context: ctx, lookAhead: 0 }))
      this.tone = Tone
      this.nodes = build(Tone)
      Tone.getDestination().mute = this.muted
    })
    // Pause audio in background tabs (the frame loop stops, so loops would hum forever).
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) void ctx.suspend()
      else void ctx.resume()
    })
  }

  // 'loading' until Tone.js is loaded and the sounds are built.
  state() {
    return this.nodes && this.ctx ? this.ctx.state : 'loading'
  }

  isMuted() {
    return this.muted
  }

  setMuted(muted: boolean) {
    this.muted = muted
    if (this.tone) this.tone.getDestination().mute = muted
  }

  // Continuous sounds, called about 20 times a second.
  update(s: { mph: number; airborne: boolean; hovering: boolean; boosting: boolean }) {
    const n = this.nodes
    if (!n) return
    const m = motorParams(s.mph, s.airborne)
    n.motor.frequency.rampTo(m.frequency, 0.08)
    n.motorVolume.volume.rampTo(m.volume, 0.1)
    const t = thrusterParams(s.hovering, s.boosting)
    n.hissVolume.volume.rampTo(t.volume, 0.06)
    n.hissFilter.frequency.rampTo(t.cutoff, 0.08)
  }

  play(name: SfxName) {
    this.log.push(name)
    if (this.log.length > LOG_SIZE) this.log.shift()
    const n = this.nodes
    if (!n || !this.tone) return
    const now = this.tone.now()
    switch (name) {
      case 'hop':
        n.puff.triggerAttackRelease(0.12, now)
        n.thump.triggerAttackRelease('C2', 0.1, now)
        break
      case 'doubleJump':
        n.puff.triggerAttackRelease(0.1, now)
        n.thump.triggerAttackRelease('G2', 0.08, now)
        break
      case 'airTurn':
        sweep(n, 600, 5000, 0.22, now)
        break
      case 'spin':
        sweep(n, 300, 1800, 0.35, now)
        break
      case 'land':
        if (now - this.lastLand < LAND_COOLDOWN) return
        this.lastLand = now
        n.thump.triggerAttackRelease('A1', 0.15, now)
        break
      case 'crash':
        n.crunch.triggerAttackRelease(0.4, now)
        n.thump.triggerAttackRelease('E1', 0.3, now)
        break
      case 'ring':
        ['E6', 'G6', 'C7'].forEach((note, i) => n.chime.triggerAttackRelease(note, 0.12, now + i * 0.06))
        break
      case 'trick':
        ['C5', 'E5', 'G5', 'C6'].forEach((note, i) => n.chime.triggerAttackRelease(note, 0.15, now + i * 0.07))
        break
      case 'finish':
        ['C5', 'E5', 'G5', 'C6', 'E6', 'G6'].forEach((note, i) => n.chime.triggerAttackRelease(note, 0.25, now + i * 0.1))
        n.chime.triggerAttackRelease(['C5', 'E5', 'G5', 'C6'], 1.2, now + 0.65)
        break
    }
  }
}

function sweep(n: Nodes, from: number, to: number, duration: number, now: number) {
  n.whooshFilter.frequency.cancelScheduledValues(now)
  n.whooshFilter.frequency.setValueAtTime(from, now)
  n.whooshFilter.frequency.exponentialRampToValueAtTime(to, now + duration)
  n.whoosh.triggerAttackRelease(duration, now)
}

function build(Tone: Tone): Nodes {
  const master = new Tone.Volume(-6).toDestination()

  // Electric motor whine: two slightly detuned triangles, softened by a low-pass filter.
  const motorVolume = new Tone.Volume(-60).connect(master)
  const motorFilter = new Tone.Filter(2400, 'lowpass').connect(motorVolume)
  const motor = new Tone.FatOscillator({ type: 'triangle', frequency: 180, count: 2, spread: 14 }).connect(motorFilter).start()

  // Thruster hiss: pink noise through a band-pass filter.
  const hissVolume = new Tone.Volume(-60).connect(master)
  const hissFilter = new Tone.Filter({ type: 'bandpass', frequency: 1400, Q: 0.5 }).connect(hissVolume)
  const hiss = new Tone.Noise('pink').connect(hissFilter).start()

  const thump = new Tone.MembraneSynth({ pitchDecay: 0.04, octaves: 4, envelope: { attack: 0.001, decay: 0.25, sustain: 0 } }).connect(master)
  thump.volume.value = -6
  const puff = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.002, decay: 0.15, sustain: 0 } }).connect(master)
  puff.volume.value = -16
  const whooshFilter = new Tone.Filter({ type: 'bandpass', frequency: 800, Q: 1.5 }).connect(master)
  const whoosh = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.03, decay: 0.2, sustain: 0.3, release: 0.15 } }).connect(whooshFilter)
  whoosh.volume.value = -4
  const crunch = new Tone.NoiseSynth({ noise: { type: 'brown' }, envelope: { attack: 0.001, decay: 0.35, sustain: 0 } }).connect(master)
  crunch.volume.value = -4
  const chime = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: 0.005, decay: 0.25, sustain: 0.1, release: 0.3 } }).connect(master)
  chime.volume.value = -12

  return { motor, motorVolume, hiss, hissFilter, hissVolume, thump, puff, whoosh, whooshFilter, crunch, chime }
}

export const sound = new Sound()

// Lets E2E tests see which sounds played and the audio state.
;(window as unknown as { __sfx: object }).__sfx = {
  log: sound.log,
  state: () => sound.state(),
  muted: () => sound.isMuted(),
}
