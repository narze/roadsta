// Pure sound parameters, kept apart from Tone.js so they can be unit tested.

const TOP_MPH = 300

// Electric motor whine: a high tone that climbs with speed. In the air the wheels have
// no load, so the motor spins up a little.
export function motorParams(mph: number, airborne: boolean) {
  const speed = Math.abs(mph)
  const t = Math.min(speed, TOP_MPH) / TOP_MPH
  const frequency = (180 + t * 900) * (airborne ? 1.12 : 1)
  // Silent when stopped, then rises fast at low speed (square root) and levels off.
  const volume = speed < 1 ? -60 : -30 + 18 * Math.sqrt(t) // dB
  return { frequency, volume }
}

// Cold-gas thruster hiss: filtered noise. Boost is louder and brighter than hover.
export function thrusterParams(hovering: boolean, boosting: boolean) {
  if (boosting) return { on: true, volume: -3, cutoff: 3200 }
  if (hovering) return { on: true, volume: -8, cutoff: 1400 }
  return { on: false, volume: -60, cutoff: 1400 }
}

type Storage = { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void }
const MUTE_KEY = 'roadsta:muted'

export function loadMuted(storage: Storage) {
  try {
    return storage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

export function saveMuted(storage: Storage, muted: boolean) {
  try {
    storage.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {
    // Storage can be blocked (private browsing). Muting still works for this visit.
  }
}
