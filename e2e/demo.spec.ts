import { expect, test } from '@playwright/test'

// No Spotify login needed: demo mode ships a bundled fictional collection.
test('landing renders and links the demo studio', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /organize your music/i })).toBeVisible()
  await page.getByRole('link', { name: /demoyu dene|try the demo/i }).click()
  await expect(page).toHaveURL(/\/app\?demo=1/)
})

test('demo studio shows bins and tracks', async ({ page }) => {
  await page.goto('/app?demo=1')
  await expect(page.getByText(/demo collection/i).first()).toBeVisible()
  // Genre bins load in the sidebar
  await expect(page.locator('.bin').first()).toBeVisible()
  // Track rows render in the table
  await expect(page.locator('tbody tr').first()).toBeVisible()
})

test('unknown routes render the 404 page', async ({ page }) => {
  await page.goto('/nope-not-here')
  await expect(page.getByText(/404|not found/i).first()).toBeVisible()
})
