// Arrow keys always work. WASD uses physical key codes.
export const Control = {
  forward: 'forward',
  back: 'back',
  left: 'left',
  right: 'right',
  jump: 'jump',
  boost: 'boost',
  reset: 'reset',
  mute: 'mute',
} as const

export const keyMap = [
  { name: Control.forward, keys: ['ArrowUp', 'KeyW'] },
  { name: Control.back, keys: ['ArrowDown', 'KeyS'] },
  { name: Control.left, keys: ['ArrowLeft', 'KeyA'] },
  { name: Control.right, keys: ['ArrowRight', 'KeyD'] },
  { name: Control.jump, keys: ['Space'] },
  { name: Control.boost, keys: ['ShiftLeft', 'ShiftRight'] },
  { name: Control.reset, keys: ['Backspace', 'Enter'] },
  { name: Control.mute, keys: ['KeyM'] },
]
