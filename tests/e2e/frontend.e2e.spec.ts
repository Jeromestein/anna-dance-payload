import { expect, test } from '@playwright/test'

test.describe('Frontend', () => {
  test('shows the isolated POC overview', async ({ page }) => {
    await page.goto('http://localhost:3000')

    await expect(page).toHaveTitle(/Anna Dance CMS POC/)
    await expect(page.locator('h1')).toHaveText('Lightweight CMS proof of concept')
    await expect(page.getByRole('link', { name: 'Open CMS admin' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'View Faculty preview' })).toBeVisible()
  })
})
