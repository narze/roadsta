import { expect, test, type Page } from '@playwright/test'

type Sfx = { log: string[]; state: () => string; muted: () => boolean }
const sfx = <T>(page: Page, read: (s: Sfx) => T) =>
  page.evaluate((fn) => new Function('s', `return (${fn})(s)`)((window as unknown as { __sfx: Sfx }).__sfx), read.toString()) as Promise<T>

async function start(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start test drive' }).click()
}

test('the Start tap turns the audio on', async ({ page }) => {
  await start(page)
  await expect.poll(() => sfx(page, (s) => s.state())).toBe('running')
})

test('a hop plays the hop sound, then the landing sound', async ({ page }) => {
  await start(page)
  await page.keyboard.press('Space')
  await expect.poll(() => sfx(page, (s) => s.log.includes('hop')), { timeout: 15_000 }).toBe(true)
  await expect.poll(() => sfx(page, (s) => s.log.includes('land')), { timeout: 30_000 }).toBe(true)
})

test('mute works by button and by the M key, and is remembered', async ({ page }) => {
  await start(page)
  await page.getByRole('button', { name: 'Mute sound' }).click()
  await expect.poll(() => sfx(page, (s) => s.muted())).toBe(true)

  await page.reload()
  await page.getByRole('button', { name: 'Start test drive' }).click()
  await expect(page.getByRole('button', { name: 'Unmute sound' })).toBeVisible()
  await expect.poll(() => sfx(page, (s) => s.muted())).toBe(true)

  await page.keyboard.press('m')
  await expect.poll(() => sfx(page, (s) => s.muted())).toBe(false)
  await expect(page.getByRole('button', { name: 'Mute sound' })).toBeVisible()
})
