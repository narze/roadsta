import * as THREE from 'three'

// One tile of road: full width, DASH_PERIOD meters long. Lane lines are painted into the
// texture (not separate strips), so mipmaps blend them smoothly far away instead of shimmering.
export const DASH_PERIOD = 12 // meters per tile along the road
const DASH_LENGTH = 5
const PX_PER_M = 24

export function createRoadTexture(roadWidth: number, maxAnisotropy: number) {
  const w = roadWidth * PX_PER_M
  const h = DASH_PERIOD * PX_PER_M
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#2c2f33'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#cfcfcf'
  const line = 0.35 * PX_PER_M
  ctx.fillRect(w / 2 - line / 2, (h - DASH_LENGTH * PX_PER_M) / 2, line, DASH_LENGTH * PX_PER_M) // center dash
  ctx.fillRect(0.6 * PX_PER_M, 0, line, h) // solid edge lines
  ctx.fillRect(w - 0.6 * PX_PER_M - line, 0, line, h)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = maxAnisotropy
  return tex
}
