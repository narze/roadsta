import { useKeyboardControls } from '@react-three/drei'
import { useEffect } from 'react'
import { sound } from '../audio/sound'
import { Control } from './controls'
import { RING_COUNT, useGame } from './store'
import { TouchControls } from './TouchControls'
import { useIsTouch } from './useIsTouch'
import './hud.css'

const fmt = (s: number | null) => (s === null ? '-' : `${s.toFixed(2)} s`)

export function Hud() {
  const g = useGame()
  const touch = useIsTouch()
  const [subscribeKeys] = useKeyboardControls<keyof typeof Control>()
  const toggleMute = useGame((s) => s.toggleMute)
  useEffect(() => subscribeKeys((s) => s.mute, (pressed) => { if (pressed) toggleMute() }), [subscribeKeys, toggleMute])
  const start = () => {
    sound.start() // must run inside the tap/click, or the browser blocks audio
    // On phones, go full screen in landscape where the browser allows it.
    if (touch) {
      document.documentElement.requestFullscreen?.({ navigationUI: 'hide' })
        ?.then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape'))
        .catch(() => {})
    }
    g.start()
  }
  const status = g.hovering ? 'HOVER' : g.boosting ? 'BOOST' : g.airborne ? 'AIRBORNE' : 'ROAD'
  return (
    <div className={touch ? 'hud touch' : 'hud'}>
      <div className="panel top-left">
        <div className="label">Rings</div>
        <div className="big">{g.rings} / {RING_COUNT}</div>
        <div className="small">{g.courseTime !== null ? `Course done in ${g.courseTime.toFixed(2)} s` : 'Fly through all rings'}</div>
        <div className="small">Trick score <b data-testid="score">{g.score}</b></div>
      </div>

      <button className={touch ? 'icon-btn mute touch' : 'icon-btn mute'} aria-label={g.muted ? 'Unmute sound' : 'Mute sound'} onClick={g.toggleMute}>
        {g.muted ? '🔇' : '🔊'}
      </button>

      {g.toast && (
        <div key={g.toast.id} className={`toast ${g.toast.tone}`} data-testid="toast">{g.toast.text}</div>
      )}

      <div className="panel top-right">
        <div className="label">0-60 mph</div>
        <div className="row"><span>Last</span><b>{fmt(g.launch.last)}</b></div>
        <div className="row"><span>Best</span><b>{fmt(g.launch.best)}</b></div>
        <div className="small">{g.launch.phase === 'armed' ? 'Ready - launch now' : g.launch.phase === 'running' ? `${g.launch.elapsed.toFixed(2)} s` : 'Stop to try again'}</div>
      </div>

      <div className="panel bottom-left">
        <div className="speed"><span data-testid="speed">{Math.round(g.mph)}</span><small>mph</small></div>
        <div className="small">{Math.round(g.mph * 1.609)} km/h · alt {g.altitude.toFixed(1)} m</div>
      </div>

      <div className="panel bottom-right">
        <div className={`status ${status.toLowerCase()}`}>{status}</div>
        <div className="label">Cold-gas thrusters</div>
        <div className="gas"><div className="fill" style={{ width: `${g.gas}%` }} /></div>
      </div>

      {!g.started && (
        <div className="overlay">
          <div className="card">
            <h1>Tesler Roadsta</h1>
            <p className="sub">Test drive with the cold-gas thruster pack</p>
            {touch ? (
              <ul>
                <li><b>Left thumb</b> - joystick: up to drive, down to brake, sideways to steer</li>
                <li><b>Hop</b> - tap again in the air to double jump, hold to hover</li>
                <li><b>Tricks</b> - hold Hop, then flick: ←/→ kickflip, ↑ front flip, ↓ backflip</li>
                <li><b>Boost</b> - 0-60 in under 1 s. In the air: push the joystick + tap Boost to face that way</li>
                <li><b>↺</b> - reset to the start line</li>
              </ul>
            ) : (
              <ul>
                <li><kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> or <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> drive</li>
                <li><kbd>Space</kbd> hop - press again in the air for a free double jump, hold it to hover</li>
              <li>In the air, hold <kbd>Space</kbd> + <kbd>←</kbd>/<kbd>→</kbd> kickflip, <kbd>↑</kbd> front flip, <kbd>↓</kbd> backflip</li>
                <li><kbd>Shift</kbd> boost - 0-60 mph in under 1 s. In the air, <kbd>Shift</kbd> + a direction turns up to 20° toward that way on screen</li>
                <li><kbd>Enter</kbd> reset to the start line · <kbd>M</kbd> mute sound</li>
              </ul>
            )}
            <p className="note">Thruster gas is limited. It refills when you drive on the road, and each finished trick gives back 30%. Finish each spin before you land, or you lose your speed.</p>
            <label className="toggle">
              <input type="checkbox" checked={g.unlimitedGas} onChange={(e) => g.setUnlimitedGas(e.target.checked)} />
              Unlimited gas
            </label>
            {touch && <p className="note rotate-hint">Turn your phone sideways for the best view.</p>}
            <button onClick={start} disabled={!g.ready}>{g.ready ? 'Start test drive' : 'Loading...'}</button>
          </div>
        </div>
      )}
      {touch && g.started && <TouchControls />}
    </div>
  )
}
