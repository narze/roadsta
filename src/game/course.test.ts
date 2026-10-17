import { describe, expect, it } from 'vitest'
import { BLOCKS, CAR_WIDTH, RAMPS, RINGS, ROAD_LENGTH, ROAD_START, ROAD_WIDTH, SECTIONS } from './course'

const OLD_ROAD_LENGTH = 900
const OLD_LAST_RING_Z = 700

describe('course', () => {
  it('is five times longer than the first track', () => {
    expect(ROAD_LENGTH).toBe(OLD_ROAD_LENGTH * 5)
    expect(SECTIONS).toBe(5)
    expect(RINGS.at(-1)![2]).toBeGreaterThanOrEqual(OLD_LAST_RING_Z * 5)
  })

  it('has eight rings per section, in driving order', () => {
    expect(RINGS).toHaveLength(8 * SECTIONS)
    for (let i = 1; i < RINGS.length; i++) expect(RINGS[i][2]).toBeGreaterThan(RINGS[i - 1][2])
  })

  it('keeps every ring and obstacle on the road', () => {
    const end = ROAD_START + ROAD_LENGTH
    for (const [x, , z] of RINGS) {
      expect(Math.abs(x)).toBeLessThan(ROAD_WIDTH / 2)
      expect(z).toBeGreaterThan(ROAD_START)
      expect(z).toBeLessThan(end - 50)
    }
    for (const r of RAMPS) expect(r.z + r.length / 2).toBeLessThan(end)
    for (const b of BLOCKS) expect(b.position[2] + b.size[2] / 2).toBeLessThan(end)
  })

  it('never puts a ring center inside a solid block', () => {
    for (const [x, y, z] of RINGS) {
      for (const { position: p, size: s } of BLOCKS) {
        const inside = Math.abs(x - p[0]) < s[0] / 2 && Math.abs(y - p[1]) < s[1] / 2 && Math.abs(z - p[2]) < s[2] / 2
        expect(inside, `ring at z=${z} is inside a block at z=${p[2]}`).toBe(false)
      }
    }
  })

  it('makes the mesa gap wider in each section', () => {
    const mesas = BLOCKS.filter((b) => b.kind === 'mesa')
    expect(mesas).toHaveLength(2 * SECTIONS)
    const gaps = []
    for (let i = 0; i < mesas.length; i += 2) {
      const [a, b] = [mesas[i], mesas[i + 1]]
      gaps.push(b.position[2] - b.size[2] / 2 - (a.position[2] + a.size[2] / 2))
    }
    for (let i = 1; i < gaps.length; i++) expect(gaps[i]).toBeGreaterThan(gaps[i - 1])
  })

  it('leaves a gap between the barriers that the car fits through with room to spare', () => {
    const barriers = BLOCKS.filter((b) => b.kind === 'barrier')
    for (let i = 0; i < barriers.length; i += 2) {
      const [l, r] = [barriers[i], barriers[i + 1]].sort((a, b) => a.position[0] - b.position[0])
      const gap = r.position[0] - r.size[0] / 2 - (l.position[0] + l.size[0] / 2)
      expect(gap).toBeGreaterThanOrEqual(CAR_WIDTH * 1.8)
    }
  })
})
