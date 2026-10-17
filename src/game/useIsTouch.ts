import { useSyncExternalStore } from 'react'

// Touch-first devices (phones, tablets). Add ?touch=1 to the URL to force it.
const query = '(pointer: coarse)'
const forced = () => new URLSearchParams(window.location.search).has('touch')

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(query)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

export const useIsTouch = () => useSyncExternalStore(subscribe, () => forced() || window.matchMedia(query).matches)
