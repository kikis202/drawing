import { expect, test } from '@playwright/test'

test('explains when WebGL 2 is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      if (type === 'webgl2') return null
      return (original as (...a: unknown[]) => unknown).call(this, type, ...rest)
    } as typeof original
  })
  await page.goto('/drawing/')
  await expect(
    page.getByText("This browser can't show 3D graphics. WebGL is turned off or not supported."),
  ).toBeVisible()
  await expect(page.getByRole('list', { name: 'Shots' })).toHaveCount(0)
})
