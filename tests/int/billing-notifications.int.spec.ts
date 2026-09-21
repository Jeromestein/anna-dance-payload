// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), getUser: vi.fn(), fetch: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: m.from,
    rpc: m.rpc,
    auth: { admin: { getUserById: m.getUser } },
  }),
}))
import { billingNotices } from '@/lib/email/billing-notifications.server'

let bill: Record<string, unknown>
let notices: Array<{ id: string; kind: string; status: string }>
let writes: Array<Record<string, unknown>>
let billError: boolean
let claimStatus: string
let storedPayload: Record<string, unknown> | undefined
function query(result: () => unknown) {
  const q = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(async () => result()),
    maybeSingle: vi.fn(async () => result()),
    then: (resolve: (value: unknown) => void) => Promise.resolve(result()).then(resolve),
    update: vi.fn((data) => {
      writes.push(data)
      return query(() => ({ data: [{ id: 'notice' }] }))
    }),
  }
  return q
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://academy.example')
  vi.stubEnv('RESEND_API_KEY', 'test')
  vi.stubEnv('RESEND_FROM_EMAIL', 'Academy <billing@example.com>')
  vi.stubEnv('BILLING_NOTIFICATION_TO', 'staff@example.com')
  vi.stubEnv('BILLING_EMAIL_TEST_TO', '')
  vi.stubEnv('BILLING_EMAIL_TEST_ADMIN_TO', '')
  vi.stubGlobal('fetch', m.fetch)
  m.fetch.mockResolvedValue(new Response(JSON.stringify({ id: 'email_1' })))
  bill = {
    id: 'bill',
    bill_number: 'ADA-123',
    amount_cents: 10001,
    currency: 'usd',
    status: 'paid',
    paid_at: '2026-09-21T12:00:00Z',
    transaction_reference: 'pi_test',
    stripe_livemode: true,
    app_payment_items: [
      {
        description: 'Ballet (3 lessons) — Dec 5–19, after credit',
        quantity: 1,
        unit_amount_cents: 10001,
      },
    ],
  }
  notices = [{ id: 'notice', kind: 'paid_customer', status: 'pending' }]
  writes = []
  billError = false
  claimStatus = 'sending'
  storedPayload = undefined
  m.getUser.mockResolvedValue({
    data: { user: { email: 'parent@example.com', email_confirmed_at: '2026-09-21' } },
  })
  m.from.mockImplementation((table) =>
    query(() => {
      if (table === 'app_payments') return { data: billError ? null : bill, error: billError }
      if (table === 'app_user_profiles') return { data: { name: 'Student A' } }
      if (table === 'app_bill_acknowledgements') return { data: { note: 'Saturday please' } }
      return { data: notices }
    }),
  )
  m.rpc.mockImplementation(async (name, args) =>
    name === 'app_claim_billing_notice'
      ? {
          data: {
            id: args.p_id,
            status: claimStatus,
            claim_token: 'claim',
            payload: storedPayload ?? args.p_payload,
          },
        }
      : { data: null, error: null },
  )
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})
describe('billing email delivery', () => {
  it('sends only to the verified account and uses the stable protected website URL', async () => {
    await billingNotices('owner', 'bill')
    const options = m.fetch.mock.calls[0][1]
    const payload = JSON.parse(options.body)
    expect(payload.to).toEqual(['parent@example.com'])
    expect(payload.text).toContain('https://academy.example/account/billing/bill')
    expect(payload.text).toContain('$100.01')
    expect(payload.text).toContain('3 lessons')
    expect(payload.html).toContain('Anna Dance Academy dancer logo')
    expect(payload.html).toContain('https://academy.example/account/billing/bill')
    expect(payload.html).not.toContain('/admin/students/')
    expect(payload.html).not.toContain('Saturday please')
    expect(options.headers['Idempotency-Key']).toBe('billing-notice')
    expect(writes[0]).toMatchObject({ status: 'sent', provider_id: 'email_1' })
  })
  it('sends separate school confirmation with the student identity and teacher message', async () => {
    notices[0].kind = 'paid_admin'
    await billingNotices('owner', 'bill')
    const payload = JSON.parse(m.fetch.mock.calls[0][1].body)
    expect(payload.to).toEqual(['staff@example.com'])
    expect(payload.text).toContain('Student A')
    expect(payload.text).toContain('Saturday please')
    expect(payload.text).toContain('/admin/students/owner')
    expect(payload.html).toContain('Saturday please')
    expect(payload.html).toContain('https://academy.example/admin/students/owner')
  })
  it('does not resend already accepted notices, including concurrent claim results', async () => {
    notices[0].status = 'sent'
    await billingNotices('owner', 'bill')
    expect(m.fetch).not.toHaveBeenCalled()
    notices[0].status = 'pending'
    claimStatus = 'sent'
    await billingNotices('owner', 'bill')
    expect(m.fetch).not.toHaveBeenCalled()
  })
  it.each(['busy', 'review'])('does not send when claim is %s', async (status) => {
    claimStatus = status
    await expect(billingNotices('owner', 'bill')).rejects.toThrow('delivery review')
    expect(m.fetch).not.toHaveBeenCalled()
  })
  it('reuses the stored body on retry, preserving provider idempotency', async () => {
    storedPayload = {
      from: 'original@example.com',
      to: ['original-parent@example.com'],
      subject: 'Original',
      text: 'Original',
      html: '<p>Original HTML must remain unchanged on retry.</p>',
    }
    await billingNotices('owner', 'bill')
    expect(JSON.parse(m.fetch.mock.calls[0][1].body)).toEqual(storedPayload)
  })
  it('persists failure without touching payment state when the provider is unavailable', async () => {
    m.fetch.mockRejectedValue(new Error('timeout'))
    await expect(billingNotices('owner', 'bill')).rejects.toThrow('payment status are saved')
    expect(writes).toEqual([
      expect.objectContaining({ status: 'failed', error_code: 'provider_error' }),
    ])
  })
  it('rejects a missing or foreign bill before attempting email', async () => {
    billError = true
    await expect(billingNotices('owner', 'bill', true)).rejects.toThrow('Bill not found')
    expect(m.rpc).not.toHaveBeenCalled()
    expect(m.fetch).not.toHaveBeenCalled()
  })
  it('requires a verified account email', async () => {
    m.getUser.mockResolvedValue({ data: { user: { email: 'parent@example.com' } } })
    await expect(billingNotices('owner', 'bill')).rejects.toThrow('verify their email')
    expect(m.fetch).not.toHaveBeenCalled()
  })
  it('routes sandbox notices only to the explicitly configured test inbox', async () => {
    bill.stripe_livemode = false
    await expect(billingNotices('owner', 'bill')).rejects.toThrow('sandbox email recipient')
    expect(m.fetch).not.toHaveBeenCalled()
    vi.stubEnv('BILLING_EMAIL_TEST_TO', 'sandbox@example.com')
    await billingNotices('owner', 'bill')
    const payload = JSON.parse(m.fetch.mock.calls[0][1].body)
    expect(payload.to).toEqual(['sandbox@example.com'])
    expect(payload.subject).toContain('[SANDBOX]')
  })
  it('queues payment requests only for unpaid bills and uses no browser recipient', async () => {
    await expect(billingNotices('owner', 'bill', true)).rejects.toThrow(
      'no longer awaiting payment',
    )
    bill.status = 'payment_due'
    notices[0].kind = 'request'
    await billingNotices('owner', 'bill', true)
    expect(m.rpc).toHaveBeenCalledWith('app_queue_bill_request', { p_owner: 'owner', p_id: 'bill' })
    expect(JSON.parse(m.fetch.mock.calls[0][1].body).subject).toContain('Payment Requested')
  })
  it('isolates sandbox school notices from the live recipient by default', async () => {
    bill.stripe_livemode = false
    notices[0].kind = 'paid_admin'
    vi.stubEnv('BILLING_EMAIL_TEST_TO', 'sandbox@example.com')
    await billingNotices('owner', 'bill')
    expect(JSON.parse(m.fetch.mock.calls[0][1].body).to).toEqual(['sandbox@example.com'])
  })
  it.each(['request', 'paid_customer', 'paid_admin', 'refunded_customer', 'refunded_admin'])(
    'routes sandbox %s to its explicitly authorized recipient',
    async (kind) => {
      bill.stripe_livemode = false
      bill.status =
        kind === 'request' ? 'payment_due' : kind.startsWith('refunded_') ? 'refunded' : 'paid'
      notices[0].kind = kind
      vi.stubEnv('BILLING_EMAIL_TEST_TO', 'sandbox@example.com')
      vi.stubEnv('BILLING_EMAIL_TEST_ADMIN_TO', 'school-test@example.com')
      await billingNotices('owner', 'bill', kind === 'request')
      const payload = JSON.parse(m.fetch.mock.calls[0][1].body)
      expect(payload.to).toEqual([
        kind.endsWith('_admin') ? 'school-test@example.com' : 'sandbox@example.com',
      ])
      expect(payload.subject).toContain('[SANDBOX]')
      expect(payload.html).toContain('SANDBOX')
    },
  )
  it('does not let sandbox overrides change the live school recipient', async () => {
    notices[0].kind = 'paid_admin'
    vi.stubEnv('BILLING_EMAIL_TEST_TO', 'sandbox@example.com')
    vi.stubEnv('BILLING_EMAIL_TEST_ADMIN_TO', 'school-test@example.com')
    await billingNotices('owner', 'bill')
    expect(JSON.parse(m.fetch.mock.calls[0][1].body).to).toEqual(['staff@example.com'])
  })
  it.each(['refunded_customer', 'refunded_admin'])(
    'sends itemized full refund evidence for %s',
    async (kind) => {
      Object.assign(bill, {
        status: 'refunded',
        refund_state: 'succeeded',
        refunded_at: '2026-09-21T13:00:00Z',
        refund_reference: 're_full',
        refund_reason: 'Private staff note',
      })
      notices[0].kind = kind
      await billingNotices('owner', 'bill')
      const payload = JSON.parse(m.fetch.mock.calls[0][1].body)
      expect(payload.to).toEqual([
        kind === 'refunded_admin' ? 'staff@example.com' : 'parent@example.com',
      ])
      expect(payload.subject).toBe('Full Refund Confirmed · ADA-123')
      expect(payload.text).toContain('Refund amount: $100.01')
      expect(payload.text).toContain('3 lessons')
      expect(payload.text).toContain('Refund reference: re_full')
      expect(payload.text).toContain('Refund confirmed: 2026-09-21T13:00:00Z')
      expect(payload.text).toContain('Original payment method')
      expect(payload.text).not.toContain('pi_test')
      expect(payload.text).not.toContain('Private staff note')
      expect(payload.text).not.toContain('Saturday please')
      expect(payload.html).toContain('Original payment method')
      expect(payload.html).toContain('re_full')
      expect(payload.html).not.toContain('pi_test')
      expect(payload.html).not.toContain('Private staff note')
      expect(payload.html).not.toContain('Saturday please')
      if (kind === 'refunded_admin') expect(payload.text).toContain('/admin/students/owner')
    },
  )
  it('does not deliver a refund notice cancelled by current financial evidence', async () => {
    notices[0].kind = 'refunded_customer'
    claimStatus = 'cancelled'
    await billingNotices('owner', 'bill')
    expect(m.fetch).not.toHaveBeenCalled()
  })
})
