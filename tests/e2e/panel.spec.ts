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
const card = (page: Page, name: string) =>
  page.getByRole('region', { name: 'Exercise' }).getByRole('button', { name: new RegExp(`^${name}`) })
const pattern = (page: Page, name: string) =>
  page.getByRole('group', { name: 'Pattern' }).getByRole('button', { name, exact: true })
const option = (page: Page, group: string, name: string) =>
  page.getByRole('group', { name: group, exact: true }).getByRole('button', { name, exact: true })
const aid = (page: Page, name: string) => option(page, 'Aids', name)
const customise = (page: Page) => page.getByRole('button', { name: 'Customise' })

/** Waits until every tile has a fully loaded image and returns their srcs in order. */
async function renderedSrcs(page: Page, count: number, images = count): Promise<string[]> {
  await expect(tiles(page)).toHaveCount(count)
  const imgs = sheet(page).locator('img')
  await expect(imgs).toHaveCount(images, { timeout: 20_000 })
  await expect
    .poll(() => imgs.evaluateAll((els) => els.every((el) => (el as HTMLImageElement).naturalWidth > 0)))
    .toBe(true)
  return imgs.evaluateAll((els) => els.map((el) => (el as HTMLImageElement).src))
}

const srcOf = (page: Page, label: string) => tile(page, label).locator('img').getAttribute('src')

test.beforeEach(async ({ page }) => {
  await page.goto('/drawing/')
  await expect(tiles(page)).toHaveCount(4, { timeout: 20_000 })
})

test('Box basics is selected on first visit and shows 4 turntable shots', async ({ page }) => {
  await expect(card(page, 'Box basics')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('region', { name: 'Exercise' }).locator('[aria-pressed="true"]')).toHaveCount(1)
  await expect(pattern(page, 'Turntable')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('4 shots, 90° apart, at eye level')).toBeVisible()
  await expect(aid(page, 'Hidden lines')).toHaveAttribute('aria-pressed', 'true')
  await expect(customise(page)).toHaveAttribute('aria-expanded', 'false')
  await renderedSrcs(page, 4)
  // the header keeps only Saved on desktop
  await expect(page.getByRole('banner').getByRole('button')).toHaveText(['Saved'])
})

test('choosing an exercise applies it and makes a new object', async ({ page }) => {
  await renderedSrcs(page, 4)
  const before = await srcOf(page, '30° turn, 0° tilt')
  await card(page, 'Stacks and totems').click()
  await expect(card(page, 'Stacks and totems')).toHaveAttribute('aria-pressed', 'true')
  await expect(card(page, 'Box basics')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByText('8 shots, 45° apart, above')).toBeVisible()
  await expect(aid(page, 'Centre lines')).toHaveAttribute('aria-pressed', 'true')
  const after = await renderedSrcs(page, 8)
  expect(after).not.toContain(before)
  await expect(tiles(page).first().locator('.shot-snap')).toHaveAccessibleName('30° turn, 30° tilt')
})

test('changing a pattern re-renders without a new object', async ({ page }) => {
  await renderedSrcs(page, 4)
  const live = await readout(page).textContent()
  const before = await srcOf(page, '120° turn, 0° tilt')
  await option(page, 'Step', '45°').click()
  await expect(card(page, 'Box basics')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByText('8 shots, 45° apart, at eye level')).toBeVisible()
  await renderedSrcs(page, 8)
  await expect(tile(page, '75° turn, 0° tilt')).toBeVisible()
  await expect(readout(page)).toHaveText(live!)
  // a view both sets share keeps its image, so the object is the same one
  expect(await srcOf(page, '120° turn, 0° tilt')).toBe(before)
})

test('pattern switching keeps ticks', async ({ page }) => {
  await page.getByRole('checkbox', { name: 'Keep 120° turn, 0° tilt' }).check()
  await option(page, 'Step', '45°').click()
  await expect(tiles(page)).toHaveCount(8)
  await expect(page.getByRole('checkbox', { name: 'Keep 120° turn, 0° tilt' })).toBeChecked()
  await pattern(page, 'Grid').click()
  // 120° isn't in the grid, so the ticked shot stays on as a custom shot after it
  await expect(tiles(page)).toHaveCount(19)
  await expect(sheet(page).getByRole('checkbox', { checked: true })).toHaveCount(1)
  await expect(tiles(page).last().getByRole('checkbox', { name: 'Keep 120° turn, 0° tilt' })).toBeChecked()
  await expect(page.getByRole('button', { name: 'Save 1 shot', exact: true })).toBeEnabled()
})

test('grid shows tilt rows as rows', async ({ page }) => {
  await pattern(page, 'Grid').click()
  await expect(option(page, 'Grid size', '6 × 3')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('18 shots: 6 turns × 3 tilts')).toBeVisible()
  await expect(tiles(page)).toHaveCount(18)
  const rows = await tiles(page).evaluateAll((els) =>
    els.map((el) => ({ y: Math.round(el.getBoundingClientRect().y), label: el.querySelector('button')!.textContent! })),
  )
  const ys = [...new Set(rows.map((r) => r.y))]
  expect(ys).toHaveLength(3)
  for (const r of rows.slice(6, 12)) {
    expect(r.y).toBe(ys[1])
    expect(r.label).toMatch(/, 0° tilt$/)
  }

  // the map gets a row of its own, so the tilt rows stay aligned
  await customise(page).click()
  await page.getByRole('checkbox', { name: 'Add a top-view map' }).check()
  await expect(tiles(page)).toHaveCount(19)
  const withMap = await tiles(page).evaluateAll((els) =>
    els.map((el) => ({ x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y) })),
  )
  expect(withMap[1].x).toBe(withMap[0].x)
  expect(withMap[1].y).toBeGreaterThan(withMap[0].y)
  expect(new Set(withMap.slice(1, 7).map((t) => t.y)).size).toBe(1)
  await expect(tiles(page).first().locator('.shot-snap')).toHaveAccessibleName('Top view (map)')
})

test('variation is disabled for Freeform', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Variation' })).toBeEnabled()
  await card(page, 'Freeform').click()
  await expect(tiles(page)).toHaveCount(8)
  const variation = page.getByRole('button', { name: 'Variation' })
  await expect(variation).toBeDisabled()
  await expect(variation).toHaveAttribute('title', 'Variation works with Clean forms')
})

test('variation keeps the shots and draws new proportions', async ({ page }) => {
  const before = await renderedSrcs(page, 4)
  await page.getByRole('button', { name: 'Variation' }).click()
  await expect.poll(async () => (await renderedSrcs(page, 4))[0]).not.toBe(before[0])
  await expect(card(page, 'Box basics')).toHaveAttribute('aria-pressed', 'true')
})

test('customise shows level names and disables joins above the level', async ({ page }) => {
  await customise(page).click()
  await expect(customise(page)).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByText('One shape, varied proportions')).toBeVisible()
  await expect(page.getByText('Applies to the next object').first()).toBeVisible()
  await expect(option(page, 'Shapes', 'Box')).toHaveAttribute('aria-pressed', 'true')
  await option(page, 'Level', '2').click()
  await expect(page.getByText('Boxes only, joined flush')).toBeVisible()
  await expect(card(page, 'Box basics')).toHaveAttribute('aria-pressed', 'false')
  await expect(option(page, 'Joins', 'Stack')).toBeEnabled()
  await expect(option(page, 'Joins', 'Half-sunk from level 3')).toBeDisabled()
  await expect(option(page, 'Joins', 'Clean cut from level 5')).toBeDisabled()
  // Level 5 without its cut says so
  await option(page, 'Level', '5').click()
  await expect(page.getByText('Level 5 (no cut: Clean cut is off)')).toBeVisible()
  await option(page, 'Joins', 'Clean cut').click()
  await expect(page.getByText('Level 5 (no cut: Clean cut is off)')).toHaveCount(0)
})

test('hide one shot covers a tile until Reveal', async ({ page }) => {
  await customise(page).click()
  await page.getByRole('checkbox', { name: 'Hide one shot to test me' }).check()
  await expect(sheet(page).getByText(/^Draw this view: \d+° turn, 0° tilt$/)).toHaveCount(1)
  await renderedSrcs(page, 4, 3)
  const hidden = tiles(page).filter({ hasText: 'Draw this view' })
  await expect(hidden.getByRole('checkbox')).toBeVisible()
  await hidden.getByRole('button', { name: 'Reveal' }).click()
  await expect(sheet(page).getByText(/^Draw this view/)).toHaveCount(0)
  await renderedSrcs(page, 4)
})

test('aids re-render the shots', async ({ page }) => {
  const [before] = await renderedSrcs(page, 4)
  await aid(page, 'Box').click()
  await expect(aid(page, 'Box')).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(async () => (await renderedSrcs(page, 4))[0]).not.toBe(before)
  // Lines only and Silhouette can't both be on
  await aid(page, 'Lines only').click()
  await aid(page, 'Silhouette').click()
  await expect(aid(page, 'Silhouette')).toHaveAttribute('aria-pressed', 'true')
  await expect(aid(page, 'Lines only')).toHaveAttribute('aria-pressed', 'false')
})

test('settings persist across reload', async ({ page }) => {
  await card(page, 'Chests and lids').click()
  await expect(tiles(page)).toHaveCount(8)
  await page.reload()
  await expect(tiles(page)).toHaveCount(8, { timeout: 20_000 })
  await expect(card(page, 'Chests and lids')).toHaveAttribute('aria-pressed', 'true')
  await option(page, 'Tilt', 'Below').click()
  await page.reload()
  await expect(tiles(page)).toHaveCount(8, { timeout: 20_000 })
  await expect(option(page, 'Tilt', 'Below')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('region', { name: 'Exercise' }).locator('[aria-pressed="true"]')).toHaveCount(0)
})

test('a sequence starts from the live view', async ({ page }) => {
  const box = (await canvas(page).boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 20, { steps: 4 })
  await page.mouse.up()
  const live = (await readout(page).textContent())!
  await pattern(page, 'Sequence').click()
  await expect(tiles(page)).toHaveCount(6)
  await expect(tiles(page).first().locator('.shot-snap')).toHaveAccessibleName(live)

  // later drags don't move it, until Start from live view
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 - 80, box.y + box.height / 2, { steps: 4 })
  await page.mouse.up()
  const moved = (await readout(page).textContent())!
  expect(moved).not.toBe(live)
  await expect(tiles(page).first().locator('.shot-snap')).toHaveAccessibleName(live)
  await page.getByRole('button', { name: 'Start from live view' }).click()
  await expect(tiles(page).first().locator('.shot-snap')).toHaveAccessibleName(moved)
})

test('a large grid keeps tiles readable and scrolls to its last column', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await pattern(page, 'Grid').click()
  await option(page, 'Grid size', '8 × 5').click()
  await expect(tiles(page)).toHaveCount(40)
  await expect
    .poll(async () => Math.min(...(await tiles(page).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width)))))
    .toBeGreaterThanOrEqual(140)
  const overflow = await sheet(page).evaluate((el) => el.scrollWidth - el.clientWidth)
  expect(overflow).toBeGreaterThan(0)
  // the eighth column is reachable: scrolled fully right, it sits inside the sheet
  await sheet(page).evaluate((el) => el.scrollTo({ left: el.scrollWidth, top: 0 }))
  const box = (await sheet(page).boundingBox())!
  const eighth = (await tiles(page).nth(7).boundingBox())!
  expect(eighth.x).toBeGreaterThanOrEqual(box.x)
  expect(eighth.x + eighth.width).toBeLessThanOrEqual(box.x + box.width)
  // and so is the first, scrolled back
  await sheet(page).evaluate((el) => el.scrollTo({ left: 0, top: 0 }))
  const first = (await tiles(page).first().boundingBox())!
  expect(first.x).toBeGreaterThanOrEqual(box.x)
})

test('clicking what is already selected changes nothing', async ({ page }) => {
  await customise(page).click()
  await page.getByRole('checkbox', { name: 'Hide one shot to test me' }).check()
  await pattern(page, 'Sequence').click()
  await expect(tiles(page)).toHaveCount(6)
  const covered = sheet(page).getByText(/^Draw this view: /)
  await expect(covered).toHaveCount(1)
  const label = await covered.textContent()
  for (let i = 0; i < 3; i++) {
    await pattern(page, 'Sequence').click()
    await option(page, 'Axis', 'Vertical').click()
    await option(page, 'Steps', '6 × 15°').click()
    await page.getByRole('button', { name: 'Start from live view' }).click()
    await page.getByRole('button', { name: 'Start from live view' }).click()
  }
  await expect(covered).toHaveCount(1)
  await expect(covered).toHaveText(label!)

  // the selected exercise card keeps its object
  await page.getByRole('checkbox', { name: 'Hide one shot to test me' }).uncheck()
  await card(page, 'Stacks and totems').click()
  const before = await renderedSrcs(page, 8)
  await card(page, 'Stacks and totems').click()
  await expect(card(page, 'Stacks and totems')).toHaveAttribute('aria-pressed', 'true')
  await page.waitForTimeout(300)
  expect(await renderedSrcs(page, 8)).toEqual(before)
})
