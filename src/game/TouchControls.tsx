import nipplejs from 'nipplejs'
import { useEffect, useRef, type PointerEvent } from 'react'
import { detectFlick, flickToTrick, startFlick, type FlickDir, type FlickState } from './flick'
import { useGame } from './store'
import { useTouchInput } from './touchInput'

// Hold-to-press button: stays down while the finger is on it, even if it slides off.
// With onFlick, a quick swipe while holding it reports a direction.
function HoldButton({ label, className, onChange, onFlick }: {
  label: string
  className: string
  onChange: (down: boolean) => void
  onFlick?: (dir: FlickDir) => void
}) {
  const flick = useRef<FlickState | null>(null)
  const press = (down: boolean) => (e: PointerEvent<HTMLButtonElement>) => {
    e.preventDefault()
    if (down) e.currentTarget.setPointerCapture(e.pointerId)
    flick.current = down ? startFlick({ x: e.clientX, y: e.clientY, t: e.timeStamp }) : null
    onChange(down)
  }
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    if (!onFlick || !flick.current) return
    const r = detectFlick(flick.current, { x: e.clientX, y: e.clientY, t: e.timeStamp })
    flick.current = r.state
    if (r.dir) onFlick(r.dir)
  }
  return (
    <button
      className={`touch-btn ${className}`}
      aria-label={label}
      onPointerDown={press(true)}
      onPointerMove={move}
      onPointerUp={press(false)}
      onPointerCancel={press(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  )
}

export function TouchControls() {
  const zone = useRef<HTMLDivElement>(null)
  const { setStick, setJump, setBoost, requestTrick } = useTouchInput()
  const reset = useGame((s) => s.reset)

  useEffect(() => {
    if (!zone.current) return
    const manager = nipplejs.create({
      zone: zone.current,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      size: 130,
      color: { front: 'rgba(255, 255, 255, 0.85)', back: 'rgba(255, 255, 255, 0.18)' },
      restOpacity: 0.7,
    })
    manager.on('move', (e) => setStick(e.data.vector))
    manager.on('end', () => setStick({ x: 0, y: 0 }))
    return () => {
      manager.destroy()
      setStick({ x: 0, y: 0 })
    }
  }, [setStick])

  // Release everything if the page loses focus mid-press.
  useEffect(() => {
    const release = () => {
      setJump(false)
      setBoost(false)
    }
    window.addEventListener('blur', release)
    return () => window.removeEventListener('blur', release)
  }, [setJump, setBoost])

  return (
    <div className="touch-controls" data-testid="touch-controls">
      <div ref={zone} className="joystick-zone" data-testid="joystick-zone" />
      <div className="touch-buttons">
        <HoldButton label="Boost" className="boost" onChange={setBoost} />
        <HoldButton label="Hop" className="hop" onChange={setJump} onFlick={(dir) => requestTrick(flickToTrick(dir))} />
      </div>
      <button className="touch-reset" aria-label="Reset" onClick={reset}>↺</button>
    </div>
  )
}
