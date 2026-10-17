import { expect, test, type Page } from '@playwright/test'

type Hud = { mph: number; gas: number; airborne: boolean; rings: number; trick: string | null; score: number }
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
  await expect.poll(async () => (await hud(page)).trick, { timeout: 10_000 }).toBe('kickflipLeft')
  await expect(page.getByTestId('toast')).toContainText('Kickflip left', { timeout: 20_000 })
  await page.keyboard.up('Space')
  expect((await hud(page)).score).toBeGreaterThan(0)
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
