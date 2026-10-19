/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

test.skip(({ isMobile }) => !isMobile, 'phone layout only')

const sheet = (page: Page) => page.getByRole('list', { name: 'Shots' })
const tiles = (page: Page) => sheet(page).getByRole('listitem')
const floating = (page: Page) => page.getByRole('button', { name: 'Expand live view' })
const live = (page: Page) =>
  page.getByRole('application', { name: 'Live view. Drag or use arrow keys to rotate' })
const readout = (page: Page) => page.getByTestId('live-readout')
const settingsSheet = (page: Page) => page.getByRole('dialog', { name: 'Settings' })

async function expand(page: Page) {
  await floating(page).tap()
  await expect(page.getByRole('button', { name: 'Back to shots' })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/drawing/')
  await expect(tiles(page)).toHaveCount(4, { timeout: 20_000 })
})

test('two-column sheet with a floating live view', async ({ page }) => {
  const a = (await tiles(page).nth(0).boundingBox())!
  const b = (await tiles(page).nth(1).boundingBox())!
  const c = (await tiles(page).nth(2).boundingBox())!
  expect(Math.abs(a.y - b.y)).toBeLessThan(1)
  expect(b.x).toBeGreaterThan(a.x + a.width - 1)
  expect(c.y).toBeGreaterThan(a.y + a.height - 1)

  const box = (await floating(page).boundingBox())!
  expect(box.width).toBeCloseTo(112, 0)
  expect(box.height).toBeCloseTo(112, 0)
  const bar = (await page.getByRole('button', { name: 'Settings' }).boundingBox())!
  expect(box.x + box.width).toBeGreaterThan(390 - 24)
  expect(bar.y - (box.y + box.height)).toBeGreaterThanOrEqual(12)
  await expect(page.getByRole('banner').getByRole('button')).toHaveText(['New object', 'Saved'])
})

test('tapping the floating view expands it, back returns', async ({ page }) => {
  await expand(page)
  const box = (await live(page).boundingBox())!
  const viewport = page.viewportSize()!
  expect(box.width).toBeGreaterThanOrEqual(viewport.width - 1)
  expect(box.height).toBeGreaterThanOrEqual(viewport.height - 1)
  await page.getByRole('button', { name: 'Back to shots' }).tap()
  await expect(floating(page)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Back to shots' })).toHaveCount(0)
})

test('touch drag rotates the expanded view', async ({ page, context }) => {
  await expand(page)
  const before = await readout(page).textContent()
  const cdp = await context.newCDPSession(page)
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
    })
  await touch('touchStart', 150, 400)
  for (let i = 1; i <= 6; i++) await touch('touchMove', 150 + i * 20, 400 + i * 5)
  await touch('touchEnd', 270, 430)
  await expect(readout(page)).not.toHaveText(before!)
})

test('a drag on the floating view does not rotate or expand it', async ({ page, context }) => {
  await expect(readout(page)).toHaveCount(0)
  const box = (await floating(page).boundingBox())!
  const cdp = await context.newCDPSession(page)
  const x = box.x + 20
  const y = box.y + 56
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  for (let i = 1; i <= 4; i++)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + i * 15, y }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(floating(page)).toBeVisible()
})

test('settings open in a bottom sheet', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).tap()
  await expect(settingsSheet(page)).toBeVisible()
  await expect(settingsSheet(page).getByRole('button', { name: 'Done' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(settingsSheet(page)).toBeHidden()
})

test('the settings sheet shows exercises first', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).tap()
  const dialog = settingsSheet(page)
  await expect(dialog).toBeVisible()
  const titles = await dialog.getByRole('heading').allTextContents()
  expect(titles.slice(0, 3)).toEqual(['Settings', 'Exercise', 'Shots'])
  const exercise = (await dialog.getByRole('region', { name: 'Exercise' }).boundingBox())!
  const shots = (await dialog.getByRole('region', { name: 'Shots' }).boundingBox())!
  expect(exercise.y).toBeLessThan(shots.y)
  await expect(dialog.getByRole('button', { name: 'Variation' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: /^Box basics/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(dialog.getByText('Shots, evenly spaced')).toHaveCount(0)
})

test('grid falls back to two columns on phones', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings' }).tap()
  await settingsSheet(page).getByRole('group', { name: 'Pattern' }).getByRole('button', { name: 'Grid', exact: true }).tap()
  await page.getByRole('button', { name: 'Done' }).tap()
  await expect(tiles(page)).toHaveCount(18)
  const boxes = await tiles(page).evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect()
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) }
    }),
  )
  expect(boxes[1].y).toBe(boxes[0].y)
  expect(boxes[1].x).toBeGreaterThan(boxes[0].x)
  expect(boxes[2].y).toBeGreaterThan(boxes[0].y)
  expect(boxes[2].x).toBe(boxes[0].x)
  expect(boxes[0].w).toBeGreaterThanOrEqual(140)
  expect(boxes[0].w).toBeLessThanOrEqual(200)
})

test('no horizontal scroll', async ({ page }) => {
  expect(await page.evaluate(() => document.scrollingElement!.scrollWidth)).toBeLessThanOrEqual(390)
})
