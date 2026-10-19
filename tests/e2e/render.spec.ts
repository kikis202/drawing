/// <reference lib="dom" />
import { expect, test } from '@playwright/test'

test('a shot renders the form with outlines on white', async ({ page }) => {
  await page.goto('/drawing/')
  const img = page.getByRole('list', { name: 'Shots' }).getByRole('listitem').first().locator('img')
  await expect(img).toBeVisible({ timeout: 20_000 })
  const result = await img.evaluate(async (el) => {
    const image = el as HTMLImageElement
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(image, 0, 0)
    const px = (x: number, y: number) => Array.from(ctx.getImageData(x, y, 1, 1).data)
    const c = Math.floor(canvas.width / 2)
    let centreInk = false
    for (let dy = -40; dy <= 40 && !centreInk; dy++) {
      for (let dx = -40; dx <= 40; dx++) {
        const [r, g, b] = px(c + dx, c + dy) as number[]
        if (r < 250 || g < 250 || b < 250) {
          centreInk = true
          break
        }
      }
    }
    return { width: image.naturalWidth, corner: px(2, 2), centreInk }
  })
  expect(result.width).toBe(640)
  expect(result.corner.slice(0, 3)).toEqual([255, 255, 255])
  expect(result.centreInk).toBe(true)
})
