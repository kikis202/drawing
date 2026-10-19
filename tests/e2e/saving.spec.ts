/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const sheet = (page: Page) => page.getByRole('list', { name: 'Shots' })
const tiles = (page: Page) => sheet(page).getByRole('listitem')
const savedPanel = (page: Page) => page.getByRole('dialog', { name: 'Saved' })

test.beforeEach(async ({ page }) => {
  await page.goto('/drawing/')
  await expect(tiles(page)).toHaveCount(4, { timeout: 20_000 })
})

async function keep(page: Page, ...labels: string[]) {
  for (const label of labels) await page.getByRole('checkbox', { name: `Keep ${label}`, exact: true }).check()
}

test('save, list, reopen', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop layout only')
  await keep(page, '30° turn, 0° tilt', '120° turn, 0° tilt')
  await page.getByRole('button', { name: 'Save 2 shots' }).click()
  await expect(page.getByRole('status')).toHaveText('Saved 2 shots.')

  // Change the object so reopening is visible.
  await page.getByRole('button', { name: 'New object' }).click()
  await expect(tiles(page)).toHaveCount(4)

  const opener = page.getByRole('button', { name: 'Saved', exact: true })
  await opener.click()
  await expect(savedPanel(page)).toBeVisible()
  await expect(savedPanel(page).getByRole('listitem')).toHaveCount(1)
  await expect(savedPanel(page).getByText('2 shots')).toBeVisible()
  await savedPanel(page).getByRole('button', { name: 'Open' }).click()
  await expect(savedPanel(page)).toBeHidden()

  // The saved views are already in the restored pattern, so they are kept there, not added again.
  await expect(tiles(page)).toHaveCount(4)
  await expect(page.getByRole('button', { name: 'Save 2 shots' })).toBeEnabled()
  await expect(sheet(page).getByRole('checkbox', { checked: true })).toHaveCount(2)
  await expect(page.getByRole('checkbox', { name: 'Keep 30° turn, 0° tilt', checked: true })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Keep 120° turn, 0° tilt', checked: true })).toBeVisible()
})

test('opening a set restores its exercise', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop layout only')
  await page.getByRole('button', { name: /Stacks/ }).click()
  await expect(page.getByRole('button', { name: /Stacks/ })).toHaveAttribute('aria-pressed', 'true')
  const first = sheet(page).getByRole('checkbox').first()
  await first.check()
  await page.getByRole('button', { name: /^Save 1 shot/ }).click()
  await expect(page.getByRole('status')).toHaveText('Saved 1 shot.')
  await page.getByRole('button', { name: /Box basics/ }).click()
  await expect(page.getByRole('button', { name: /Box basics/ })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: 'Saved', exact: true }).click()
  await savedPanel(page).getByRole('button', { name: 'Open' }).click()
  await expect(page.getByRole('button', { name: /Stacks/ })).toHaveAttribute('aria-pressed', 'true')
})

test('a damaged record is flagged and does not crash Open', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop layout only')
  await keep(page, '30° turn, 0° tilt')
  await page.getByRole('button', { name: 'Save 1 shot' }).click()
  await expect(page.getByRole('status')).toHaveText('Saved 1 shot.')
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('turnaround', 1)
        req.onerror = () => reject(req.error)
        req.onsuccess = () => {
          const tx = req.result.transaction('sets', 'readwrite')
          tx.objectStore('sets').put({ id: 'bad', createdAt: Date.now() + 100_000 })
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
        }
      }),
  )
  await page.getByRole('button', { name: 'Saved', exact: true }).click()
  const items = savedPanel(page).getByRole('listitem')
  await expect(items).toHaveCount(2)
  await expect(items.first().getByText("Can't be read")).toBeVisible()
  await expect(items.last().getByText('1 shot')).toBeVisible()
  await items.first().getByRole('button', { name: 'Open' }).click()
  await expect(savedPanel(page).getByRole('alert')).toHaveText("Couldn't open that set.")
  await expect(savedPanel(page)).toBeVisible()
  await items.last().getByRole('button', { name: 'Open' }).click()
  await expect(savedPanel(page)).toBeHidden()
})

test('Escape closes the Saved panel and focus returns to its button', async ({ page }) => {
  const opener = page.getByRole('button', { name: 'Saved', exact: true })
  await opener.click()
  await expect(savedPanel(page)).toBeVisible()
  await expect(savedPanel(page).getByText('No saved sets yet. Tick shots and press Save to keep them here.')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(savedPanel(page)).toBeHidden()
  await expect(opener).toBeFocused()
})

test('save without storage shows message', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop layout only')
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true })
  })
  await page.goto('/drawing/')
  await expect(tiles(page)).toHaveCount(4, { timeout: 20_000 })
  await keep(page, '30° turn, 0° tilt')
  await page.getByRole('button', { name: 'Save 1 shot' }).click()
  await expect(page.getByRole('status')).toContainText(
    "Couldn't save: this browser is blocking storage. Download the shots instead.",
  )
  // The app still snaps and rotates.
  await sheet(page).getByRole('button', { name: '120° turn, 0° tilt', exact: true }).click()
  await expect(page.getByTestId('live-readout')).toHaveText('120° turn, 0° tilt')

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download shots' }).click()
  expect((await download).suggestedFilename()).toMatch(/^turnaround-.*\.zip$/)
})

test('download a set', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop layout only')
  await keep(page, '30° turn, 0° tilt')
  await page.getByRole('button', { name: 'Save 1 shot' }).click()
  await expect(page.getByRole('status')).toHaveText('Saved 1 shot.')
  await page.getByRole('button', { name: 'Saved', exact: true }).click()
  const download = page.waitForEvent('download')
  await savedPanel(page).getByRole('button', { name: 'Download' }).click()
  expect((await download).suggestedFilename()).toMatch(/^turnaround-.*\.zip$/)
})

test('download one shot', async ({ page }) => {
  await expect(sheet(page).locator('img')).toHaveCount(4, { timeout: 20_000 })
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download 120° turn, 0° tilt' }).click()
  expect((await download).suggestedFilename()).toBe('120-turn-0-tilt.png')
})

test('phone: the header Saved button opens the panel', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone layout only')
  await page.getByRole('button', { name: 'Saved', exact: true }).click()
  await expect(savedPanel(page)).toBeVisible()
})
