// Track layout as plain data. The course repeats one section five times;
// odd sections are mirrored and the mesa gap gets wider each time.
type Vec3 = [number, number, number]

export type Block = { kind: 'wall' | 'mesa' | 'barrier'; position: Vec3; size: Vec3; color: string }
export type Ramp = { z: number; height: number; length: number }

export const ROAD_WIDTH = 24
export const ROAD_START = -40
export const ROAD_LENGTH = 4500
export const SECTIONS = 5
export const CAR_WIDTH = 2.04 // collider width, shared with the car physics
const SECTION_LENGTH = 760

const RINGS_OUT: Vec3[] = []
const BLOCKS_OUT: Block[] = []
const RAMPS_OUT: Ramp[] = []

for (let s = 0; s < SECTIONS; s++) {
  const o = s * SECTION_LENGTH
  const m = s % 2 === 0 ? 1 : -1
  const gap = 30 + 6 * s
  const mesa2Start = 440 + gap

  RINGS_OUT.push(
    [0, 1.6, o + 80],
    [-6 * m, 1.6, o + 150],
    [0, 3.8, o + 230], // over the wall
    [0, 6.5, o + 330], // off the ramp
    [0, 4.5, o + 440 + gap / 2], // over the gap between the mesas
    [7 * m, 1.6, o + 560],
    [-7 * m, 1.6, o + 620],
    [0, 5, o + 700], // hop and hover
  )
  BLOCKS_OUT.push(
    { kind: 'wall', position: [0, 1.1, o + 230], size: [ROAD_WIDTH, 2.2, 1.2], color: '#e6e6e6' },
    { kind: 'mesa', position: [0, 1.25, o + 420], size: [ROAD_WIDTH, 2.5, 40], color: '#c9b79c' },
    { kind: 'mesa', position: [0, 1.25, o + mesa2Start + 20], size: [ROAD_WIDTH, 2.5, 40], color: '#c9b79c' },
    { kind: 'barrier', position: [-6.9, 0.6, o + 670], size: [9.8, 1.2, 1], color: '#d33' }, // 4 m gap in the middle
    { kind: 'barrier', position: [6.9, 0.6, o + 670], size: [9.8, 1.2, 1], color: '#d33' },
  )
  RAMPS_OUT.push(
    { z: o + 290, height: 4, length: 22 }, // launch ramp
    { z: o + 393, height: 2.5, length: 14 }, // up onto the first mesa
  )
}

export const RINGS: readonly Vec3[] = RINGS_OUT
export const BLOCKS: readonly Block[] = BLOCKS_OUT
export const RAMPS: readonly Ramp[] = RAMPS_OUT
