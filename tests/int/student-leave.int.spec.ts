import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), single: vi.fn(), send: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
}))
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    rpc: mocks.rpc,
    from: () => ({ select: () => ({ eq: () => ({ single: mocks.single }) }) }),
  }),
}))
vi.mock('@/lib/email/student-leave.server', async (original) => ({
  ...(await original<typeof import('@/lib/email/student-leave.server')>()),
  sendLeaveEmails: mocks.send,
}))
import { submitStudentLeave } from '@/actions/student-leave'
import { readLeaveReceipt, signLeaveReceipt } from '@/lib/leave/receipt.server'
import { currentLeaveTimes } from '@/lib/leave/model'

const owner = '00000000-0000-4000-8000-000000000001'
function form(reason = 'Please excuse the class on October 1.') {
  const f = new FormData()
  f.set('reason', reason)
  return f
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('PAYLOAD_SECRET', 'test-secret-only')
  vi.stubEnv('RESEND_API_KEY', 'test-key-only')
  vi.stubEnv('RESEND_FROM_EMAIL', 'test@example.invalid')
  mocks.getUser.mockResolvedValue({
    data: {
      user: { id: owner, email: 'student@example.invalid', email_confirmed_at: '2026-01-01' },
    },
  })
  mocks.single.mockResolvedValue({ data: { name: 'Test Student' }, error: null })
  mocks.rpc.mockResolvedValue({
    data: { submitted_at: new Date().toISOString(), remaining: 1 },
    error: null,
  })
  mocks.send.mockResolvedValue(true)
})

describe('Simple two-timestamp student leave', () => {
  it('saves once and emails the text without passing text to the database', async () => {
    const result = await submitStudentLeave({}, form())
    expect(result.success).toBeTruthy()
    expect(mocks.rpc).toHaveBeenCalledWith('app_record_student_leave', {
      p_owner: owner,
      p_expected_first: null,
      p_expected_second: null,
    })
    expect(mocks.send.mock.calls[0][0].emails[0].text).toContain('October 1')
    expect(mocks.send.mock.calls[0][0].emails).toHaveLength(2)
  })
  it('requires a verified session', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    expect((await submitStudentLeave({}, form())).error).toBeTruthy()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it.each(['', ' \n\t ', 'a'.repeat(1001)])(
    'rejects an invalid message before saving',
    async (reason) => {
      expect((await submitStudentLeave({}, form(reason))).error).toBeTruthy()
      expect(mocks.rpc).not.toHaveBeenCalled()
    },
  )
  it('checks email setup before consuming a request', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    expect((await submitStudentLeave({}, form())).error).toContain('No request was recorded')
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('does not send emails for a stale double submission', async () => {
    mocks.rpc.mockResolvedValue({
      error: { message: 'Leave balance changed; refresh before submitting' },
    })
    expect((await submitStudentLeave({}, form())).error).toContain('already recorded')
    expect(mocks.send).not.toHaveBeenCalled()
  })
  it('retries identical email payloads without consuming another request', async () => {
    mocks.send.mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    const result = await submitStudentLeave({}, form())
    expect(result.warning).toBeTruthy()
    const retry = new FormData()
    retry.set('retry_token', result.retryToken!)
    expect((await submitStudentLeave({}, retry)).success).toBeTruthy()
    expect(mocks.rpc).toHaveBeenCalledTimes(1)
    expect(mocks.send.mock.calls[1][0]).toEqual(mocks.send.mock.calls[0][0])
  })
  it('rejects tampered receipts and cross-account retries', async () => {
    mocks.send.mockResolvedValue(false)
    const result = await submitStudentLeave({}, form())
    expect(readLeaveReceipt(result.retryToken! + 'x', owner)).toBeNull()
    expect(readLeaveReceipt(result.retryToken!, 'another-user')).toBeNull()
    const receipt = readLeaveReceipt(result.retryToken!, owner)!
    expect(
      readLeaveReceipt(signLeaveReceipt({ ...receipt, expiresAt: Date.now() - 1 }), owner),
    ).toBeNull()
  })
  it('treats old timestamps as unused after each reset without deleting them', () => {
    const times = {
      first_leave_at: '2026-01-02T12:00:00Z',
      second_leave_at: '2026-04-01T12:00:00Z',
    }
    expect(currentLeaveTimes(times, '2026-05-31T12:00:00Z')).toHaveLength(2)
    expect(currentLeaveTimes(times, '2026-06-01T04:00:00Z')).toHaveLength(0)
  })
})
