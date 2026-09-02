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
    await expect(page.getByRole('complementary', { name: 'Staff toolbar' })).toHaveCount(0)
  })

  test('redirects Student management to Payload login', async ({ page }) => {
    await page.goto('http://localhost:3000/admin/students')

    await expect(page).toHaveURL(/\/admin\/login\?redirect=%2Fadmin%2Fstudents$/)
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible()
  })

  test('redirects the Student profile to login', async ({ page }) => {
    await page.goto('http://localhost:3000/account')

    await expect(page).toHaveURL(/\/login\?error=Please\+log\+in\+to\+view\+your\+profile\.$/)
    await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible()
  })

  test('does not serve the retired users routes', async ({ request }) => {
    for (const path of ['/users', '/users/me', '/users/example-id']) {
      const response = await request.get(`http://localhost:3000${path}`, {
        maxRedirects: 0,
      })

      expect(response.status(), path).toBe(404)
    }
  })
})
