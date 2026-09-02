import { expect, test } from '@playwright/test'

test.describe('Frontend', () => {
  test('shows the migrated academy homepage with CMS content', async ({ page }) => {
    await page.goto('http://localhost:3000')

    await expect(page).toHaveTitle(/Anna Dance Academy/)
    await expect(page.locator('h1')).toContainText('Expert Guidance.')
    await expect(page.locator('h1')).toContainText('A Colorful World of Dance.')
    await expect(
      page.getByRole('region', { name: 'Why families choose Anna Dance Academy' }),
    ).toBeVisible()
  })

  test('redirects student management to Payload login', async ({ page }) => {
    await page.goto('http://localhost:3000/users')

    await expect(page).toHaveURL(/\/admin\/login\?redirect=%2Fusers$/)
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible()
  })
})
