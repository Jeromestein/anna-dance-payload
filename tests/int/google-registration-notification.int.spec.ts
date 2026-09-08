import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  send: vi.fn(),
  getUser: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({ rpc: mocks.rpc, from: mocks.from }),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
}))
vi.mock('@/lib/email/student-registration-notification.server', () => ({
  sendStudentRegistrationNotification: mocks.send,
}))

import { notifyGoogleRegistration } from '@/lib/email/google-registration-notification.server'
import { POST } from '@/app/(frontend)/api/auth/registration-notification/route'

const event = {
  user_id: 'verified-user',
  student_name: 'Google Student',
  email: 'student@example.com',
  registered_at: '2026-09-08T02:00:00Z',
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  mocks.rpc.mockResolvedValue({ data: [event], error: null })
  mocks.send.mockResolvedValue({ status: 'sent' })
  mocks.from.mockReturnValue({ update: mocks.update })
  mocks.update.mockReturnValue({ eq: mocks.eq })
  mocks.eq.mockReturnValueOnce({ eq: mocks.eq }).mockResolvedValue({ error: null })
  mocks.getUser.mockResolvedValue({ data: { user: { id: event.user_id } }, error: null })
})

afterEach(() => vi.restoreAllMocks())

describe('Google registration notification', () => {
  it('claims the verified user and sends the database registration snapshot', async () => {
    await notifyGoogleRegistration(event.user_id)
    expect(mocks.rpc).toHaveBeenCalledWith('claim_google_registration_notification', {
      student_id: event.user_id,
    })
    expect(mocks.send).toHaveBeenCalledExactlyOnceWith({
      studentName: event.student_name,
      email: event.email,
      registeredAt: event.registered_at,
      studentPhone: null,
      guardianName: null,
      guardianPhone: null,
    })
    expect(mocks.from).toHaveBeenCalledWith('app_google_registration_notifications')
    expect(mocks.update).toHaveBeenCalledWith({
      status: 'sent',
      completed_at: expect.any(String),
    })
    expect(mocks.eq.mock.calls).toEqual([
      ['user_id', event.user_id],
      ['status', 'sending'],
    ])
  })

  it('does not send without a pending first-registration event', async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null })
    await notifyGoogleRegistration(event.user_id)
    expect(mocks.send).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('sends only once when the atomic claim returns no event on a duplicate callback', async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: [event], error: null })
      .mockResolvedValue({ data: [], error: null })
    await Promise.all([
      notifyGoogleRegistration(event.user_id),
      notifyGoogleRegistration(event.user_id),
    ])
    expect(mocks.send).toHaveBeenCalledOnce()
  })

  it.each(['failed', 'skipped'])('records %s delivery without blocking login', async (status) => {
    mocks.send.mockResolvedValue({ status })
    await expect(notifyGoogleRegistration(event.user_id)).resolves.toBeUndefined()
    expect(mocks.update).toHaveBeenCalledWith({ status, completed_at: expect.any(String) })
  })

  it('does not send when the claim fails or the migration is missing', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'private DB detail' } })
    await expect(notifyGoogleRegistration(event.user_id)).resolves.toBeUndefined()
    expect(mocks.send).not.toHaveBeenCalled()
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('private DB detail')
  })

  it('contains unexpected delivery and completion failures without retrying', async () => {
    mocks.send.mockRejectedValueOnce(new Error('private provider detail'))
    await expect(notifyGoogleRegistration(event.user_id)).resolves.toBeUndefined()
    expect(mocks.update).not.toHaveBeenCalled()
    mocks.eq
      .mockReset()
      .mockReturnValueOnce({ eq: mocks.eq })
      .mockResolvedValue({ error: { message: 'private DB detail' } })
    await expect(notifyGoogleRegistration(event.user_id)).resolves.toBeUndefined()
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(
      /private|student@example/,
    )
  })
})

describe('Registration notification endpoint', () => {
  function request(origin: string | null = 'https://academy.example') {
    return new Request('https://academy.example/api/auth/registration-notification', {
      method: 'POST',
      headers: origin ? { origin } : {},
      body: JSON.stringify({ userId: 'another-user', email: 'untrusted@example.com' }),
    })
  }

  it.each([null, 'https://untrusted.example'])(
    'rejects requests with origin %s',
    async (origin) => {
      expect((await POST(request(origin))).status).toBe(403)
      expect(mocks.getUser).not.toHaveBeenCalled()
      expect(mocks.rpc).not.toHaveBeenCalled()
    },
  )

  it('rejects unauthenticated requests', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })
    expect((await POST(request())).status).toBe(401)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('rejects an authentication error even if a user is returned', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user' } }, error: new Error('invalid') })
    expect((await POST(request())).status).toBe(401)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('ignores browser-supplied identity and uses only the verified cookie identity', async () => {
    expect((await POST(request())).status).toBe(204)
    expect(mocks.rpc).toHaveBeenCalledWith('claim_google_registration_notification', {
      student_id: event.user_id,
    })
    expect(JSON.stringify(mocks.send.mock.calls)).not.toContain('untrusted@example.com')
  })

  it('contains authentication service outages without exposing details', async () => {
    mocks.getUser.mockRejectedValue(new Error('private auth detail'))
    expect((await POST(request())).status).toBe(204)
    expect(mocks.rpc).not.toHaveBeenCalled()
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('private auth detail')
  })
})
