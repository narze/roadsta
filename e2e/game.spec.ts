import { expect, test, type Page } from '@playwright/test'

type Hud = { mph: number; gas: number; airborne: boolean; rings: number; trick: string | null; score: number; heading: number }
const hud = (page: Page) => page.evaluate(() => (window as unknown as { __roadster: { getState: () => Hud } }).__roadster.getState())

async function start(page: Page) {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()
  await expect(page.getByTestId('speed')).toHaveText('0')
  await page.getByRole('button', { name: 'Start test drive' }).click()
}

test('the car drives forward when the player holds the up arrow', async ({ page }) => {
  await start(page)
  await page.keyboard.down('ArrowUp')
  await expect.poll(async () => (await hud(page)).mph, { timeout: 15_000 }).toBeGreaterThan(20)
  await page.keyboard.up('ArrowUp')
  await expect(page.getByTestId('speed')).not.toHaveText('0')
})

test('space makes the car hop and uses thruster gas', async ({ page }) => {
  await start(page)
  await expect.poll(async () => (await hud(page)).gas).toBe(100)
  await page.keyboard.press('Space')
  await expect.poll(async () => (await hud(page)).airborne, { timeout: 10_000 }).toBe(true)
  expect((await hud(page)).gas).toBeLessThan(100)
  await expect.poll(async () => (await hud(page)).airborne, { timeout: 15_000 }).toBe(false)
})

test('holding Space and tapping an arrow in the air does a kickflip', async ({ page }) => {
  await start(page)
  await page.keyboard.down('Space')
  await expect.poll(async () => (await hud(page)).airborne, { timeout: 10_000 }).toBe(true)
  await page.keyboard.press('ArrowLeft')
  // The trick itself is short; on a slow CI machine a poll can miss it. Check what stays: the score and the message.
  await expect.poll(async () => (await hud(page)).score, { timeout: 60_000 }).toBeGreaterThan(0)
  await expect(page.getByTestId('toast')).toContainText('Kickflip left')
  await page.keyboard.up('Space')
})

test('a finished trick restores thruster gas in the air', async ({ page }) => {
  await start(page)
  await page.keyboard.down('Space')
  await expect.poll(async () => (await hud(page)).airborne, { timeout: 10_000 }).toBe(true)
  await page.keyboard.press('ArrowDown')
  await page.keyboard.up('Space') // no hover, so the gas only changes from the hop and the trick
  const afterHop = (await hud(page)).gas
  expect(afterHop).toBeLessThan(75)
  // Read the gas right at landing. Ground refill is slow (12/s), so a jump of 20+ can only come from the trick.
  await expect.poll(async () => (await hud(page)).airborne, { timeout: 15_000 }).toBe(false)
  expect((await hud(page)).gas).toBeGreaterThan(afterHop + 20)
})

test('pressing Space again in the air does a free double jump', async ({ page }) => {
  await start(page)
  // Track the highest point and the lowest gas inside the page, every frame, so slow machines do not miss them.
  await page.evaluate(() => {
    const w = window as unknown as { __roadster: { getState: () => Hud }; __maxAlt: number; __minGas: number }
    w.__maxAlt = 0
    w.__minGas = 100
    const tick = () => {
      const s = w.__roadster.getState() as Hud & { altitude: number }
      w.__maxAlt = Math.max(w.__maxAlt, s.altitude)
      w.__minGas = Math.min(w.__minGas, s.gas)
      requestAnimationFrame(tick)
    }
    tick()
  })
  await page.keyboard.press('Space')
  await page.waitForFunction(() => (window as unknown as { __roadster: { getState: () => { altitude: number } } }).__roadster.getState().altitude > 1, null, { polling: 'raf' })
  await page.keyboard.press('Space')
  await expect.poll(async () => (await hud(page)).airborne, { timeout: 30_000 }).toBe(false)
  const { maxAlt, minGas } = await page.evaluate(() => {
    const w = window as unknown as { __maxAlt: number; __minGas: number }
    return { maxAlt: w.__maxAlt, minGas: w.__minGas }
  })
  expect(maxAlt).toBeGreaterThan(4) // one hop peaks near 3.4 m; the second jump starts above 1 m
  expect(minGas).toBeGreaterThan(65) // only the first hop costs gas (100 -> 70)
})

const turnedBy = (from: number, to: number) => Math.abs(Math.atan2(Math.sin(to - from), Math.cos(to - from)))

test('Boost with a direction held in the air turns the car instantly, once per jump', async ({ page }) => {
  await start(page)
  await page.keyboard.down('Space') // hop, then hover to stay up longer
  await page.waitForFunction(() => (window as unknown as { __roadster: { getState: () => Hud } }).__roadster.getState().airborne, null, { polling: 'raf' })
  const before = (await hud(page)).heading
  await page.keyboard.down('ArrowDown') // "back": a 180 degree turn, with no air steering drift
  await page.keyboard.press('ShiftLeft')
  await expect.poll(async () => turnedBy(before, (await hud(page)).heading), { timeout: 30_000 }).toBeGreaterThan(Math.PI - 0.2)
  const after = (await hud(page)).heading
  await page.keyboard.press('ShiftLeft') // second press in the same jump: no turn
  await page.waitForTimeout(500)
  expect(turnedBy(after, (await hud(page)).heading)).toBeLessThan(0.2)
  await page.keyboard.up('ArrowDown')
  await page.keyboard.up('Space')
})

test('while hovering, holding Shift then pressing an arrow turns the car and does not start a trick', async ({ page }) => {
  await start(page)
  await page.keyboard.down('Space') // hop + hover: Space + arrow alone would be a trick
  await page.waitForFunction(() => (window as unknown as { __roadster: { getState: () => Hud } }).__roadster.getState().airborne, null, { polling: 'raf' })
  const before = (await hud(page)).heading
  await page.keyboard.down('ShiftLeft')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.up('ShiftLeft')
  await expect.poll(async () => turnedBy(before, (await hud(page)).heading), { timeout: 30_000 }).toBeGreaterThan(Math.PI - 0.2)
  await page.keyboard.up('Space')
  await expect.poll(async () => (await hud(page)).airborne, { timeout: 30_000 }).toBe(false)
  expect((await hud(page)).score).toBe(0) // no backflip was started
})
