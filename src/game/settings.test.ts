import { describe, expect, it } from 'vitest'
import { loadUnlimitedGas, saveUnlimitedGas } from './settings'

const memory = () => {
  const data = new Map<string, string>()
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) }
}

describe('unlimited gas setting', () => {
  it('is off by default and remembers the last choice', () => {
    const storage = memory()
    expect(loadUnlimitedGas(storage)).toBe(false)
    saveUnlimitedGas(storage, true)
    expect(loadUnlimitedGas(storage)).toBe(true)
    saveUnlimitedGas(storage, false)
    expect(loadUnlimitedGas(storage)).toBe(false)
  })

  it('does not crash when storage is blocked (private browsing)', () => {
    const blocked = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    expect(loadUnlimitedGas(blocked)).toBe(false)
    expect(() => saveUnlimitedGas(blocked, true)).not.toThrow()
  })
})
