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
  await expect(tiles(page)).toHaveCount(4, { timeout: 20_000 })
})

test('shows the 4 Box basics shots by default', async ({ page }) => {
  await renderedSrcs(page, 4)
  const widths = await sheet(page)
    .locator('img')
    .evaluateAll((els) => els.map((el) => (el as HTMLImageElement).naturalWidth))
  expect(widths).toEqual(Array(4).fill(640))
})

test('clicking a shot snaps the live view to it', async ({ page }) => {
  await tile(page, '210° turn, 0° tilt').click()
  await expect(readout(page)).toHaveText('210° turn, 0° tilt')
  await expect(tile(page, '210° turn, 0° tilt')).toHaveAttribute('aria-current', 'true')
})

test('dragging the live view clears the active shot', async ({ page }) => {
  await tile(page, '210° turn, 0° tilt').click()
  await expect(tile(page, '210° turn, 0° tilt')).toHaveAttribute('aria-current', 'true')
  const box = (await canvas(page).boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 10, { steps: 4 })
  await page.mouse.up()
  await expect(readout(page)).not.toHaveText('210° turn, 0° tilt')
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
  await page.getByRole('checkbox', { name: 'Keep 30° turn, 0° tilt' }).check()
  await expect(page.getByRole('button', { name: 'Save 1 shot', exact: true })).toBeEnabled()
  await page.getByRole('checkbox', { name: 'Keep 120° turn, 0° tilt' }).check()
  await expect(page.getByRole('button', { name: 'Save 2 shots' })).toBeEnabled()
  await page.getByRole('checkbox', { name: 'Keep 30° turn, 0° tilt' }).uncheck()
  await page.getByRole('checkbox', { name: 'Keep 120° turn, 0° tilt' }).uncheck()
  await expect(page.getByRole('button', { name: 'Save 0 shots' })).toBeDisabled()
})

test('capture view adds a kept "custom" shot', async ({ page }) => {
  await page.getByRole('button', { name: 'Capture view' }).click()
  await expect(tiles(page)).toHaveCount(5)
  const fifth = tiles(page).nth(4)
  await expect(fifth.getByRole('checkbox')).toBeChecked()
  await expect(fifth.getByRole('button')).toHaveAttribute('aria-current', 'true')
  await expect(fifth.getByRole('button')).toHaveAccessibleName((await readout(page).textContent())!)
})

test('hidden lines toggle re-renders the shots', async ({ page }) => {
  const [before] = await renderedSrcs(page, 4)
  // Box basics starts with hidden lines on
  const hidden = page.getByRole('group', { name: 'Aids' }).getByRole('button', { name: 'Hidden lines' })
  await expect(hidden).toHaveAttribute('aria-pressed', 'true')
  await hidden.click()
  await expect(hidden).toHaveAttribute('aria-pressed', 'false')
  await expect.poll(async () => (await renderedSrcs(page, 4))[0]).not.toBe(before)
})

test('new object replaces the shots', async ({ page }) => {
  const before = await renderedSrcs(page, 4)
  await page.getByRole('checkbox', { name: 'Keep 30° turn, 0° tilt' }).check()
  await page.getByRole('region', { name: 'Exercise' }).getByRole('button', { name: 'New object' }).click()
  await expect
    .poll(async () => {
      const after = await renderedSrcs(page, 4)
      return after.every((src) => !before.includes(src))
    })
    .toBe(true)
  await expect(sheet(page).getByRole('checkbox', { checked: true })).toHaveCount(0)
})

test('resize keeps the snapped view', async ({ page }) => {
  await tile(page, '210° turn, 0° tilt').click()
  await expect(tile(page, '210° turn, 0° tilt')).toHaveAttribute('aria-current', 'true')
  await page.setViewportSize({ width: 1100, height: 800 })
  await page.waitForTimeout(100)
  await expect(readout(page)).toHaveText('210° turn, 0° tilt')
  await expect(tile(page, '210° turn, 0° tilt')).toHaveAttribute('aria-current', 'true')
})

test('the sheet fills the main area with large tiles', async ({ page }) => {
  const widths = await tiles(page).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width))
  expect(Math.min(...widths)).toBeGreaterThanOrEqual(240)
  const box = (await sheet(page).boundingBox())!
  const last = (await tiles(page).last().boundingBox())!
  expect(last.y + last.height).toBeLessThanOrEqual(box.y + box.height)
})

test('a tile never shows an image that belonged to another view', async ({ page }) => {
  await renderedSrcs(page, 4)
  await sheet(page).evaluate((list) => {
    const seen = new Map<string, string>()
    const conflicts: string[] = []
    const scan = () => {
      for (const li of list.querySelectorAll('li')) {
        const src = li.querySelector('img')?.getAttribute('src')
        if (!src) continue
        const label = li.querySelector('button')!.textContent!
        const prev = seen.get(src)
        if (prev !== undefined && prev !== label) conflicts.push(`${src}: ${prev} -> ${label}`)
        seen.set(src, label)
      }
    }
    scan()
    new MutationObserver(scan).observe(list, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    })
    ;(window as unknown as { staleConflicts: string[] }).staleConflicts = conflicts
  })
  const step = (name: string) =>
    page.getByRole('group', { name: 'Step', exact: true }).getByRole('button', { name, exact: true })
  await step('45°').click()
  await renderedSrcs(page, 8)
  await step('30°').click()
  await renderedSrcs(page, 12)
  await step('90°').click()
  await renderedSrcs(page, 4)
  const conflicts = await page.evaluate(() => (window as unknown as { staleConflicts: string[] }).staleConflicts)
  expect(conflicts).toEqual([])
})
