import { expect, test } from '@playwright/test'

test('shows the app name and no mode switcher', async ({ page }) => {
  await page.goto('/drawing/')
  await expect(page.getByRole('banner')).toContainText('Turnaround')
  await expect(page.getByRole('navigation', { name: 'Practice modes' })).toHaveCount(0)
})
