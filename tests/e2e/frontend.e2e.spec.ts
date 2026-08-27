import { expect, test } from '@playwright/test'

test.describe('Frontend', () => {
  test('shows the migrated academy homepage with CMS content', async ({ page }) => {
    await page.goto('http://localhost:3000')

    await expect(page).toHaveTitle(/Anna Dance Academy/)
    await expect(page.locator('h1')).toContainText('Rooted in Chinese dance')
    await expect(page.getByRole('heading', { name: 'Anna Liu' })).toBeVisible()
    await expect(
      page.getByRole('region', { name: 'Movement, moments, and community.' }),
    ).toBeVisible()
  })

  test('redirects student management to Payload login', async ({ page }) => {
    await page.goto('http://localhost:3000/users')

    await expect(page).toHaveURL(/\/admin\/login\?redirect=%2Fusers$/)
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible()
  })
})
