import { test, expect, Page } from '@playwright/test'
import { login } from '../helpers/login'
import {
  cleanupTestUser,
  e2eDatabaseWritesEnabled,
  seedTestUser,
  testUser,
} from '../helpers/seedUser'

test.describe('Admin Panel', () => {
  test.skip(
    !e2eDatabaseWritesEnabled,
    'Payload admin tests require an explicitly approved disposable database.',
  )

  let page: Page

  test.beforeAll(async ({ browser }) => {
    await seedTestUser()

    const context = await browser.newContext()
    page = await context.newPage()

    await login({ page, user: testUser })
  })

  test.afterAll(async () => {
    await cleanupTestUser()
  })

  test('can navigate to dashboard', async () => {
    await page.goto('http://localhost:3000/admin')
    await expect(page).toHaveURL('http://localhost:3000/admin')
    const dashboardArtifact = page.locator('span[title="Dashboard"]').first()
    await expect(dashboardArtifact).toBeVisible()
  })

  test('can navigate to list view', async () => {
    await page.goto('http://localhost:3000/admin/collections/faculty')
    await expect(page).toHaveURL('http://localhost:3000/admin/collections/faculty')
    const listViewArtifact = page.locator('h1', { hasText: 'Faculty' }).first()
    await expect(listViewArtifact).toBeVisible()
  })

  test('can navigate to Classes list view', async () => {
    await page.goto('http://localhost:3000/admin/collections/classes')
    await expect(page).toHaveURL('http://localhost:3000/admin/collections/classes')
    await expect(page.locator('h1', { hasText: 'Classes' }).first()).toBeVisible()
  })

  test('can open the Faculty create form', async () => {
    await page.goto('http://localhost:3000/admin/collections/faculty/create')
    await expect(page).toHaveURL('http://localhost:3000/admin/collections/faculty/create')
    await expect(page.locator('input[name="name"]')).toBeVisible()
    await expect(page.locator('input[name="title"]')).toBeVisible()
  })
})
