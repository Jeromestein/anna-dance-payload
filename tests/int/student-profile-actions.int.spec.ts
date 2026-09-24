import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  insert: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  maybeSingle: vi.fn(),
  signUp: vi.fn(),
  notify: vi.fn(),
  requireAdmin: vi.fn(),
  claims: vi.fn(),
}))
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`)
  },
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/staff/auth', () => ({ requirePayloadAdministrator: mocks.requireAdmin }))
vi.mock('@/lib/supabase/config', () => ({ isSupabaseConfigured: () => true }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getClaims: mocks.claims, signUp: mocks.signUp },
    from: () => ({ update: mocks.update, insert: mocks.insert }),
  }),
}))
vi.mock('@/lib/supabase/admin', () => ({
  isSupabaseAdminConfigured: () => true,
  createSupabaseAdminClient: () => ({ from: () => ({ update: mocks.update }) }),
}))
vi.mock('@/lib/email/student-registration-notification.server', () => ({
  hasNewEmailIdentity: (user: { identities?: unknown[] }) => Boolean(user?.identities?.length),
  sendStudentRegistrationNotification: mocks.notify,
}))

import { updateStudentProfile, updateManagedStudentProfile } from '@/actions/student-profiles'
import { signup } from '@/app/(frontend)/login/actions'

const id = '00000000-0000-4000-8000-000000000001'
function form(overrides: Record<string, string> = {}) {
  const data = new FormData()
  for (const [key, value] of Object.entries({
    target_student_id: id,
    name: 'Test Student',
    student_name: 'Test Student',
    phone: '949-555-0100',
    student_phone: '949-555-0100',
    guardian_phone: '949-555-0100',
    date_of_birth: '2016-02-29',
    address_line1: '123 Test Street',
    city: 'Irvine',
    state: 'CA',
    postal_code: '92618',
    health_notes: 'N/A',
    email: 'test@example.invalid',
    password: 'Test-only-password',
    termsAccepted: 'yes',
    ...overrides,
  }))
    data.set(key, value)
  return data
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.claims.mockResolvedValue({ data: { claims: { sub: id, email: 'test@example.invalid' } } })
  mocks.update.mockReturnValue({ eq: mocks.eq })
  mocks.eq.mockReturnValue({ eq: mocks.eq, select: mocks.select })
  mocks.select.mockReturnValue({ maybeSingle: mocks.maybeSingle })
  mocks.maybeSingle.mockResolvedValue({ data: { id }, error: null })
  mocks.signUp.mockResolvedValue({
    data: { user: { id, identities: [{ provider: 'email' }], created_at: '2026-09-24' } },
    error: null,
  })
})

describe('Student profile save boundaries', () => {
  it.each([updateStudentProfile, updateManagedStudentProfile])(
    'requires health notes before writing',
    async (save) => {
      await expect(save(form({ health_notes: ' \n ' }))).rejects.toThrow('REDIRECT:')
      expect(mocks.update).not.toHaveBeenCalled()
    },
  )
  it.each([updateStudentProfile, updateManagedStudentProfile])(
    'saves all required fields with matching guardian phone',
    async (save) => {
      await expect(save(form())).rejects.toThrow('saved')
      expect(mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          health_notes: 'N/A',
          date_of_birth: '2016-02-29',
          address_line1: '123 Test Street',
          phone: '949-555-0100',
          guardian_phone: '949-555-0100',
        }),
      )
    },
  )
  it('rejects attempts to update another student', async () => {
    await expect(
      updateStudentProfile(form({ target_student_id: '00000000-0000-4000-8000-000000000002' })),
    ).rejects.toThrow('own+profile')
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it('checks administrator access before saving managed profiles', async () => {
    mocks.requireAdmin.mockRejectedValue(new Error('Denied'))
    await expect(updateManagedStudentProfile(form())).rejects.toThrow('Denied')
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it('requires phone and health notes before creating an email account', async () => {
    await expect(signup(form({ student_phone: '' }))).rejects.toThrow('REDIRECT:')
    await expect(signup(form({ health_notes: '' }))).rejects.toThrow('REDIRECT:')
    expect(mocks.signUp).not.toHaveBeenCalled()
  })
  it('stores enrollment details separately from authentication metadata and notifications', async () => {
    await expect(signup(form())).rejects.toThrow('Check+your+email')
    const metadata = mocks.signUp.mock.calls[0][0].options.data
    expect(metadata).not.toHaveProperty('health_notes')
    expect(metadata).not.toHaveProperty('date_of_birth')
    expect(metadata).not.toHaveProperty('address_line1')
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ health_notes: 'N/A' }))
    expect(mocks.eq).toHaveBeenCalledWith('profile_complete', false)
    expect(mocks.notify.mock.calls[0][0]).not.toHaveProperty('health_notes')
  })
  it('does not modify profiles when signup conceals an existing account', async () => {
    mocks.signUp.mockResolvedValue({ data: { user: { id, identities: [] } }, error: null })
    await expect(signup(form())).rejects.toThrow('Check+your+email')
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it('explains recovery if account creation succeeds but profile saving fails', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: { message: 'Unavailable' } })
    await expect(signup(form())).rejects.toThrow('could+not+save+all')
  })
})
