import { expect, test, type Locator, type Page } from '@playwright/test'

test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true })

type Hud = { mph: number; gas: number; airborne: boolean; hovering: boolean; trick: string | null; score: number; heading: number }
const hud = (page: Page) => page.evaluate(() => (window as unknown as { __roadster: { getState: () => Hud } }).__roadster.getState())

async function start(page: Page) {
  await page.goto('/')
  await expect(page.getByText('Left thumb')).toBeVisible()
  await page.getByRole('button', { name: 'Start test drive' }).click()
  await expect(page.getByTestId('touch-controls')).toBeVisible()
}

async function center(el: Locator) {
  const box = (await el.boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

test('the joystick drives the car on a touch screen', async ({ page }) => {
  await start(page)
  const c = await center(page.getByTestId('joystick-zone'))
  await page.mouse.move(c.x, c.y)
  await page.mouse.down()
  await page.mouse.move(c.x, c.y - 80, { steps: 5 })
  await expect.poll(async () => (await hud(page)).mph, { timeout: 15_000 }).toBeGreaterThan(10)
  await page.mouse.up()
})

test('holding the hop button hops, then hovers', async ({ page }) => {
  await start(page)
  const c = await center(page.getByRole('button', { name: 'Hop' }))
  await page.mouse.move(c.x, c.y)
  await page.mouse.down()
  await expect.poll(async () => (await hud(page)).airborne, { timeout: 10_000 }).toBe(true)
  await expect.poll(async () => (await hud(page)).hovering, { timeout: 15_000 }).toBe(true)
  await page.mouse.up()
})

test('the boost button fires the thrusters', async ({ page }) => {
  await start(page)
  const c = await center(page.getByRole('button', { name: 'Boost' }))
  await page.mouse.move(c.x, c.y)
  await page.mouse.down()
  await expect.poll(async () => (await hud(page)).mph, { timeout: 15_000 }).toBeGreaterThan(10)
  await page.mouse.up()
})

test('flicking up on the hop button in the air does a front flip', async ({ page }) => {
  await start(page)
  const c = await center(page.getByRole('button', { name: 'Hop' }))
  await page.mouse.move(c.x, c.y)
  await page.mouse.down()
  // Flick right away: the game runs a queued hop before a queued trick in the same physics step.
  // One move event: on a slow CI machine, separate move events can arrive more than the flick
  // window apart and read as a slow drag. The "hold still, then flick" case is a unit test.
  await page.mouse.move(c.x, c.y - 70)
  // The trick itself is short; on a slow CI machine a poll can miss it. Check what stays: the score and the message.
  await expect.poll(async () => (await hud(page)).score, { timeout: 60_000 }).toBeGreaterThan(0)
  await expect(page.getByTestId('toast')).toContainText('Front flip')
  await page.mouse.up()
})

test('tapping Boost in the air with the joystick pulled back turns the car around', async ({ page }) => {
  await start(page)
  // Real multi-touch, like two thumbs: pull the joystick back, hold Hop, then tap Boost in the air.
  const cdp = await page.context().newCDPSession(page)
  const hop = await center(page.getByRole('button', { name: 'Hop' }))
  const boost = await center(page.getByRole('button', { name: 'Boost' }))
  const joy = await center(page.getByTestId('joystick-zone'))
  const pt = (p: { x: number; y: number }, id: number) => ({ x: p.x, y: p.y, id })
  const touch = (type: string, points: ReturnType<typeof pt>[]) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points })

  // On a slow CI machine each touch command takes ~1.5 s, so set up everything on the ground and
  // send only one command (the Boost tap) while the car is in the air. Hold Hop to hover longer.
  const back = { x: joy.x, y: joy.y + 60 }
  await touch('touchStart', [pt(joy, 0)])
  await touch('touchMove', [pt(back, 0)]) // pull back: no sideways input, so no air-steer drift
  const before = (await hud(page)).heading
  await touch('touchStart', [pt(back, 0), pt(hop, 1)])
  await page.waitForFunction(() => (window as unknown as { __roadster: { getState: () => Hud } }).__roadster.getState().airborne, null, { polling: 'raf' })
  await touch('touchStart', [pt(back, 0), pt(hop, 1), pt(boost, 2)])

  const turned = async () => { const h = (await hud(page)).heading; return Math.abs(Math.atan2(Math.sin(h - before), Math.cos(h - before))) }
  await expect.poll(turned, { timeout: 30_000 }).toBeGreaterThan(Math.PI - 0.2)
  await touch('touchEnd', []) // lift all fingers
})

test('desktop layout has no touch controls', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Start test drive' })).toBeVisible()
  await expect(page.getByTestId('touch-controls')).toHaveCount(0)
  await page.close()
})
