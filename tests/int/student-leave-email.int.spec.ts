import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { leaveEmailPayloads, sendLeaveEmails } from '@/lib/email/student-leave.server'
const send = vi.fn()
beforeEach(() => {
  vi.stubEnv('PAYLOAD_SECRET', 'test-only')
  vi.stubEnv('RESEND_API_KEY', 'test-only')
  vi.stubEnv('RESEND_FROM_EMAIL', 'academy@example.invalid')
  vi.stubEnv('LEAVE_NOTIFICATION_TO', 'admin@example.invalid')
  vi.stubGlobal('fetch', send)
  send.mockResolvedValue({ ok: true, json: async () => ({ id: 'test-message' }) })
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})
function receipt() {
  return {
    owner: 'test-student',
    submittedAt: '2026-09-24T19:00:00Z',
    remaining: 1,
    expiresAt: Date.now() + 10000,
    emails: leaveEmailPayloads({
      name: 'Test Student',
      email: 'student@example.invalid',
      reason: 'October 1: <script>alert(1)</script>',
      submittedAt: '2026-09-24T19:00:00Z',
      remaining: 1,
    }),
  }
}
describe('Leave email delivery', () => {
  it('sends separate emails to the account holder and admin with escaped text', async () => {
    const saved = receipt()
    expect(await sendLeaveEmails(saved)).toBe(true)
    expect(send).toHaveBeenCalledTimes(2)
    const bodies = send.mock.calls.map((call) => JSON.parse(call[1].body))
    expect(bodies[0].to).toEqual(['student@example.invalid'])
    expect(bodies[1].to).toEqual(['admin@example.invalid'])
    expect(bodies[0].subject).toBe('Leave Request Recorded — Test Student · Anna Dance Academy')
    expect(bodies[1].subject).toBe('Student Leave Request — Test Student · Anna Dance Academy')
    expect(bodies[0].html).not.toContain('<script>')
    expect(bodies[0].text).toContain('<script>')
  })
  it('reuses stable recipient-specific idempotency keys for retries', async () => {
    const saved = receipt()
    await sendLeaveEmails(saved)
    await sendLeaveEmails(saved)
    expect(send.mock.calls[0][1].body).toEqual(send.mock.calls[2][1].body)
    expect(send.mock.calls[0][1].headers).toEqual(send.mock.calls[2][1].headers)
    expect(send.mock.calls[0][1].headers['Idempotency-Key']).not.toEqual(
      send.mock.calls[1][1].headers['Idempotency-Key'],
    )
  })
  it('reports partial delivery as incomplete rather than claiming both emails were sent', async () => {
    send
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'message' }) })
    expect(await sendLeaveEmails(receipt())).toBe(false)
  })
})
