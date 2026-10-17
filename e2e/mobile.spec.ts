import { expect, test, type Locator, type Page } from '@playwright/test'

test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true })

type Hud = { mph: number; gas: number; airborne: boolean; hovering: boolean; trick: string | null; score: number }
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

test('desktop layout has no touch controls', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Start test drive' })).toBeVisible()
  await expect(page.getByTestId('touch-controls')).toHaveCount(0)
  await page.close()
})
