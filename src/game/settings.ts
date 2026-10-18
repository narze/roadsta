const UNLIMITED_GAS_KEY = 'roadsta:unlimitedGas'

type FlagStorage = Pick<Storage, 'getItem' | 'setItem'>

export function loadUnlimitedGas(storage: FlagStorage) {
  try {
    return storage.getItem(UNLIMITED_GAS_KEY) === '1'
  } catch {
    return false
  }
}

export function saveUnlimitedGas(storage: FlagStorage, on: boolean) {
  try {
    storage.setItem(UNLIMITED_GAS_KEY, on ? '1' : '0')
  } catch {
    // Storage can be blocked (private browsing). The setting still works for this visit.
  }
}
