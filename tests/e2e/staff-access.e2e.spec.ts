import { expect, Page, test } from '@playwright/test'

import { login } from '../helpers/login'
import {
  cleanupTestContentEditor,
  e2eDatabaseWritesEnabled,
  seedTestContentEditor,
  testContentEditor,
} from '../helpers/seedUser'

test.describe('Payload staff authorization', () => {
  test.skip(
    !e2eDatabaseWritesEnabled,
    'Payload staff tests require an explicitly approved disposable database.',
  )

  let contentEditorId: number
  let page: Page

  test.beforeAll(async ({ browser }) => {
    const contentEditor = await seedTestContentEditor()
    contentEditorId = contentEditor.id

    const context = await browser.newContext()
    page = await context.newPage()
    await login({ page, user: testContentEditor })
  })

  test.afterAll(async () => {
    await page.context().close()
    await cleanupTestContentEditor()
  })

  test('denies Student management to content editors', async () => {
    await page.goto('http://localhost:3000/admin/students')

    await expect(page).toHaveURL(/\/admin\?error=Administrator\+access\+is\+required\.$/)
  })

  test('limits content editors to their own staff record', async () => {
    const response = await page.request.get('http://localhost:3000/api/users?limit=10')
    const body = await response.json()

    expect(response.ok()).toBe(true)
    expect(body.totalDocs).toBe(1)
    expect(body.docs).toHaveLength(1)
    expect(body.docs[0].email).toBe(testContentEditor.email)
  })

  test('prevents content editors from elevating their role', async () => {
    const response = await page.request.patch(
      `http://localhost:3000/api/users/${contentEditorId}`,
      {
        data: { role: 'administrator' },
      },
    )
    const body = await response.json()

    expect(response.ok()).toBe(true)
    expect(body.doc.role).toBe('content-editor')
  })
})
