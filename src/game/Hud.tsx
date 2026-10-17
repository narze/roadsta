import { RING_COUNT, useGame } from './store'
import { TouchControls } from './TouchControls'
import { useIsTouch } from './useIsTouch'
import './hud.css'

const fmt = (s: number | null) => (s === null ? '-' : `${s.toFixed(2)} s`)

export function Hud() {
  const g = useGame()
  const touch = useIsTouch()
  const start = () => {
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
            <h1>Roadster 2026</h1>
            <p className="sub">Test drive with the SpaceX cold-gas thruster pack</p>
            {touch ? (
              <ul>
                <li><b>Left thumb</b> - joystick: up to drive, down to brake, sideways to steer</li>
                <li><b>Hop</b> - hold it to hover for a moment</li>
                <li><b>Tricks</b> - hold Hop, then flick: ←/→ barrel roll, ↑ front flip, ↓ backflip</li>
                <li><b>Boost</b> - 0-60 mph in under 1 s</li>
                <li><b>↺</b> - reset to the start line</li>
              </ul>
            ) : (
              <ul>
                <li><kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> or <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> drive</li>
                <li><kbd>Space</kbd> hop - hold it to hover for a moment</li>
              <li>In the air, hold <kbd>Space</kbd> + <kbd>←</kbd>/<kbd>→</kbd> barrel roll, <kbd>↑</kbd> front flip, <kbd>↓</kbd> backflip</li>
                <li><kbd>Shift</kbd> thruster boost - 0-60 mph in under 1 s</li>
                <li><kbd>Enter</kbd> reset to the start line</li>
              </ul>
            )}
            <p className="note">Thruster gas is limited. It refills when you drive on the road. Finish each spin before you land, or you lose your speed.</p>
            {touch && <p className="note rotate-hint">Turn your phone sideways for the best view.</p>}
            <button onClick={start} disabled={!g.ready}>{g.ready ? 'Start test drive' : 'Loading...'}</button>
          </div>
        </div>
      )}
      {touch && g.started && <TouchControls />}
    </div>
  )
}
