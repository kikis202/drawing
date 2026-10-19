/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

test.skip(({ isMobile }) => isMobile, 'desktop layout only')

const sheet = (page: Page) => page.getByRole('list', { name: 'Shots' })
const tiles = (page: Page) => sheet(page).getByRole('listitem')
const tile = (page: Page, label: string) => sheet(page).getByRole('button', { name: label, exact: true })
const readout = (page: Page) => page.getByTestId('live-readout')
const canvas = (page: Page) =>
  page.getByRole('application', { name: 'Live view. Drag or use arrow keys to rotate' })

/** Waits until every tile has a fully loaded image and returns their srcs in order. */
async function renderedSrcs(page: Page, count: number): Promise<string[]> {
  await expect(tiles(page)).toHaveCount(count)
  const imgs = sheet(page).locator('img')
  await expect(imgs).toHaveCount(count, { timeout: 20_000 })
  await expect
    .poll(() => imgs.evaluateAll((els) => els.every((el) => (el as HTMLImageElement).naturalWidth > 0)))
    .toBe(true)
  return imgs.evaluateAll((els) => els.map((el) => (el as HTMLImageElement).src))
}

function parseTurn(text: string): number {
  return Number(/^(\d+)° turn/.exec(text)![1])
}

test.beforeEach(async ({ page }) => {
  await page.goto('/drawing/')
  await expect(tiles(page)).toHaveCount(8, { timeout: 20_000 })
})

test('shows 8 rendered shots by default', async ({ page }) => {
  await renderedSrcs(page, 8)
  const widths = await sheet(page)
    .locator('img')
    .evaluateAll((els) => els.map((el) => (el as HTMLImageElement).naturalWidth))
  expect(widths).toEqual(Array(8).fill(640))
})

test('clicking a shot snaps the live view to it', async ({ page }) => {
  await tile(page, '180° turn, 0° tilt').click()
  await expect(readout(page)).toHaveText('180° turn, 0° tilt')
  await expect(tile(page, '180° turn, 0° tilt')).toHaveAttribute('aria-current', 'true')
})

test('dragging the live view clears the active shot', async ({ page }) => {
  await tile(page, '180° turn, 0° tilt').click()
  await expect(tile(page, '180° turn, 0° tilt')).toHaveAttribute('aria-current', 'true')
  const box = (await canvas(page).boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 10, { steps: 4 })
  await page.mouse.up()
  await expect(readout(page)).not.toHaveText('180° turn, 0° tilt')
  await expect(sheet(page).locator('[aria-current="true"]')).toHaveCount(0)
})

test('arrow keys rotate the live view', async ({ page }) => {
  const before = parseTurn((await readout(page).textContent())!)
  await canvas(page).focus()
  await page.keyboard.press('ArrowLeft')
  await expect.poll(async () => parseTurn((await readout(page).textContent())!)).toBe((before + 5) % 360)
})

test('keep ticks update the save button', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Save 0 shots' })).toBeDisabled()
  await page.getByRole('checkbox', { name: 'Keep 0° turn, 0° tilt' }).check()
  await expect(page.getByRole('button', { name: 'Save 1 shot', exact: true })).toBeEnabled()
  await page.getByRole('checkbox', { name: 'Keep 90° turn, 0° tilt' }).check()
  await expect(page.getByRole('button', { name: 'Save 2 shots' })).toBeEnabled()
  await page.getByRole('checkbox', { name: 'Keep 0° turn, 0° tilt' }).uncheck()
  await page.getByRole('checkbox', { name: 'Keep 90° turn, 0° tilt' }).uncheck()
  await expect(page.getByRole('button', { name: 'Save 0 shots' })).toBeDisabled()
})

test('capture view adds a kept "custom" shot', async ({ page }) => {
  await page.getByRole('button', { name: 'Capture view' }).click()
  await expect(tiles(page)).toHaveCount(9)
  const ninth = tiles(page).nth(8)
  await expect(ninth.getByRole('checkbox')).toBeChecked()
  await expect(ninth.getByRole('button')).toHaveAttribute('aria-current', 'true')
  await expect(ninth.getByRole('button')).toHaveAccessibleName((await readout(page).textContent())!)
})

test('changing the shot count keeps ticked shots', async ({ page }) => {
  await page.getByRole('checkbox', { name: 'Keep 90° turn, 0° tilt' }).check()
  const more = page.getByRole('button', { name: 'More shots' })
  for (let i = 0; i < 4; i++) await more.click()
  await expect(page.getByRole('status').filter({ hasText: /^12$/ })).toBeVisible()
  await expect(tiles(page)).toHaveCount(13)
  await expect(sheet(page).getByRole('checkbox', { checked: true })).toHaveCount(1)
  await expect(page.getByRole('checkbox', { name: 'Keep 90° turn, 0° tilt' })).toBeChecked()
})

test('hidden lines toggle re-renders the shots', async ({ page }) => {
  const [before] = await renderedSrcs(page, 8)
  await page.getByRole('checkbox', { name: 'Hidden lines' }).check()
  await expect.poll(async () => (await renderedSrcs(page, 8))[0]).not.toBe(before)
})

test('new object replaces the shots', async ({ page }) => {
  const before = await renderedSrcs(page, 8)
  await page.getByRole('checkbox', { name: 'Keep 0° turn, 0° tilt' }).check()
  await page.getByRole('banner').getByRole('button', { name: 'New object' }).click()
  await expect
    .poll(async () => {
      const after = await renderedSrcs(page, 8)
      return after.every((src) => !before.includes(src))
    })
    .toBe(true)
  await expect(sheet(page).getByRole('checkbox', { checked: true })).toHaveCount(0)
})

test('resize keeps the snapped view', async ({ page }) => {
  await tile(page, '180° turn, 0° tilt').click()
  await expect(tile(page, '180° turn, 0° tilt')).toHaveAttribute('aria-current', 'true')
  await page.setViewportSize({ width: 1100, height: 800 })
  await page.waitForTimeout(100)
  await expect(readout(page)).toHaveText('180° turn, 0° tilt')
  await expect(tile(page, '180° turn, 0° tilt')).toHaveAttribute('aria-current', 'true')
})
