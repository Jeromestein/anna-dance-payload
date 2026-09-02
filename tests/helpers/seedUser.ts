import { getPayload } from 'payload'
import config from '../../src/payload.config.js'

const testRunId = `${Date.now()}-${process.pid}`

export const testUser = {
  email: `anna-dance-e2e-admin-${testRunId}@example.com`,
  password: 'E2e-Test-Only-2026!',
  role: 'administrator' as const,
}

export const testContentEditor = {
  email: `anna-dance-e2e-editor-${testRunId}@example.com`,
  password: 'E2e-Test-Only-2026!',
  role: 'content-editor' as const,
}

export const e2eDatabaseWritesEnabled = process.env.E2E_ALLOW_DATABASE_WRITES === 'true'

function requireE2EDatabaseWrites() {
  if (!e2eDatabaseWritesEnabled) {
    throw new Error(
      'Payload E2E fixtures are disabled. Use a disposable database and set E2E_ALLOW_DATABASE_WRITES=true.',
    )
  }
}

type TestStaffUser = typeof testUser | typeof testContentEditor

async function createTestStaffUser(user: TestStaffUser) {
  requireE2EDatabaseWrites()
  const payload = await getPayload({ config })

  return payload.create({
    collection: 'users',
    data: user,
  })
}

async function deleteTestStaffUser(user: TestStaffUser) {
  requireE2EDatabaseWrites()
  const payload = await getPayload({ config })

  await payload.delete({
    collection: 'users',
    where: {
      email: {
        equals: user.email,
      },
    },
  })
}

/**
 * Seeds a test user for e2e admin tests.
 */
export async function seedTestUser() {
  return createTestStaffUser(testUser)
}

/**
 * Cleans up test user after tests
 */
export async function cleanupTestUser(): Promise<void> {
  await deleteTestStaffUser(testUser)
}

export async function seedTestContentEditor() {
  return createTestStaffUser(testContentEditor)
}

export async function cleanupTestContentEditor(): Promise<void> {
  await deleteTestStaffUser(testContentEditor)
}
