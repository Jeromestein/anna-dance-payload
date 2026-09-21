import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
const m = vi.hoisted(() => ({ issue: vi.fn(), availability: vi.fn() }))
vi.mock('@/actions/billing', () => ({ manageBill: m.issue }))
vi.mock('@/actions/billing-notifications', () => ({ sendBillingEmail: vi.fn() }))
vi.mock('@/actions/stripe-billing', () => ({
  refundStripeBill: vi.fn(),
  reconcileStripeBill: vi.fn(),
  checkoutStripeBill: vi.fn(),
  createStripeTestBill: vi.fn(),
  importStripePayment: vi.fn(),
}))
vi.mock('@/lib/stripe/config', () => ({ stripeAvailability: m.availability }))
import { BillingAdmin } from '@/components/billing-admin'
import { IssueBill } from '@/components/billing-issue'
import { BillShareTools } from '@/components/billing-share-tools'
import { readItems, type Bill } from '@/lib/billing/model'
import { loadBill } from '@/lib/billing/load'
const id = '20000000-0000-4000-8000-000000000001'
const bill: Bill = {
  id,
  bill_number: 'ADA-PACKAGE',
  amount_cents: 30000,
  currency: 'usd',
  status: 'payment_due',
  paid_amount_cents: 0,
  due_date: null,
  created_at: '2026-09-17T12:00:00Z',
  paid_at: null,
  refunded_at: null,
  refund_reference: null,
  refund_reason: null,
  payment_channel: null,
  transaction_reference: null,
  replaces_payment_id: null,
  checkout_available: true,
  app_payment_items: [
    { description: 'Ballet (10 lessons)', quantity: 10, unit_amount_cents: 3000 },
  ],
}
beforeEach(() => {
  vi.clearAllMocks()
  m.issue.mockResolvedValue({ billId: id, success: 'Created' })
  m.availability.mockReturnValue({ enabled: true, mode: 'live', refundEnabled: true })
})
afterEach(cleanup)
describe('lesson package and test visibility', () => {
  it('preserves a negotiated total that does not divide by the number of lessons', () => {
    const form = new FormData()
    Object.entries({
      bill_kind: 'fixed',
      package_name: 'Ballet',
      course_count: '3',
      course_unit: 'lessons',
      coverage: 'Dec 5–19, after credit',
      total_price: '100.01',
    }).forEach(([key, value]) => form.set(key, value))
    expect(readItems(form)).toEqual([
      {
        description: 'Ballet (3 lessons) — Dec 5–19, after credit',
        quantity: 1,
        unit_amount_cents: 10001,
      },
    ])
    form.set('coverage', '')
    expect(() => readItems(form)).toThrow()
    form.set('coverage', 'Camp dates')
    form.set('course_count', '1.5')
    expect(() => readItems(form)).toThrow()
    form.set('course_count', '2')
    form.set('course_unit', 'days')
    expect(readItems(form)[0].description).toContain('2 days')
    form.set('total_price', '0.49')
    expect(() => readItems(form)).toThrow()
  })
  it('reviews the custom amount and coverage before creating a bill', async () => {
    render(
      createElement(IssueBill, { owner: 'owner', ownerName: 'Jason', bills: [], id, test: true }),
    )
    fireEvent.change(screen.getByLabelText('Payment type'), { target: { value: 'fixed' } })
    fireEvent.change(screen.getByLabelText('Course / camp name'), {
      target: { value: 'Winter Camp' },
    })
    fireEvent.change(screen.getByLabelText('Number of lessons / days'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Unit'), { target: { value: 'days' } })
    fireEvent.change(screen.getByLabelText('Total to collect (USD)'), {
      target: { value: '100.01' },
    })
    fireEvent.change(screen.getByLabelText('Dates and fee explanation'), {
      target: { value: 'Dec 21–23, after credit' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Review payment details' }))
    expect(screen.getByText('Winter Camp (3 days) — Dec 21–23, after credit')).toBeDefined()
    expect(screen.getByText('$100.01 USD')).toBeDefined()
    expect(m.issue).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Create payment link' }))
    await waitFor(() => expect(m.issue).toHaveBeenCalledTimes(1))
    expect(readItems(m.issue.mock.calls[0][1])[0].unit_amount_cents).toBe(10001)
  })
  it.each(['live', null])(
    'hides demos/test actions in %s, including failed billing loads',
    (mode) => {
      const props = {
        owner: 'owner',
        ownerName: 'Jason',
        bills: [],
        unavailable: false,
        newBillId: id,
        stripeConfig: { enabled: false, mode: mode as 'live' | null },
      }
      const view = render(createElement(BillingAdmin, props))
      expect(screen.queryByRole('button', { name: 'Try refund demo' })).toBeNull()
      expect(screen.queryByText('Create test bill')).toBeNull()
      expect(screen.queryByText('Stripe payment tools')).toBeNull()
      expect(screen.queryByText('Verify and import payment')).toBeNull()
      view.rerender(createElement(BillingAdmin, { ...props, unavailable: true }))
      expect(screen.queryByRole('button', { name: 'Try refund demo' })).toBeNull()
    },
  )
  it('retains refund demo but hides Stripe tools in sandbox Admin', () => {
    render(
      createElement(BillingAdmin, {
        owner: 'owner',
        ownerName: 'Student',
        bills: [],
        unavailable: false,
        newBillId: id,
        stripeConfig: { enabled: true, mode: 'test' },
      }),
    )
    expect(screen.getByRole('button', { name: 'Try refund demo' })).toBeDefined()
    expect(screen.queryByText('Stripe sandbox tools')).toBeNull()
    expect(screen.queryByLabelText('Test amount (USD)')).toBeNull()
    expect(screen.getByRole('button', { name: 'Create payment link' })).toBeDefined()
  })
  it('reviews lesson counts and totals before issuing, preserves the request id on a retry', async () => {
    m.issue.mockResolvedValue({ error: 'Please retry after checking.' })
    render(
      createElement(IssueBill, { owner: 'owner', ownerName: 'Jason', bills: [], id, test: true }),
    )
    fireEvent.change(screen.getByLabelText('Course 1'), { target: { value: 'group' } })
    fireEvent.change(screen.getByLabelText('Number of lessons'), { target: { value: '10' } })
    fireEvent.change(screen.getByLabelText('Total to collect (USD)'), { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: 'Review payment details' }))
    expect(screen.getByText('10 lessons included')).toBeDefined()
    expect(screen.getByText('$300.00 USD')).toBeDefined()
    expect(m.issue).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Create payment link' }))
    await waitFor(() => expect(m.issue).toHaveBeenCalledTimes(1))
    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: 'Create payment link' }))
    await waitFor(() => expect(m.issue).toHaveBeenCalledTimes(2))
    for (const call of m.issue.mock.calls) {
      expect(call[1].get('id')).toBe(id)
      expect(readItems(call[1])[0]).toMatchObject({
        course_key: 'group',
        credit_count: 10,
        unit_amount_cents: null,
      })
    }
  })
  it('computes immutable lesson descriptions and rejects fractional lessons, invalid prices and overlong names', () => {
    const form = new FormData()
    for (const [k, v] of Object.entries({
      bill_kind: 'lessons',
      description: 'Ballet',
      quantity: '10',
      price: '30',
    }))
      form.set(k, v)
    expect(readItems(form)).toEqual(bill.app_payment_items)
    form.set('quantity', '1.5')
    expect(() => readItems(form)).toThrow()
    form.set('quantity', '3')
    form.set('price', '33.333')
    expect(() => readItems(form)).toThrow()
    form.set('price', '0')
    expect(() => readItems(form)).toThrow()
    form.set('price', '30')
    form.set('description', 'x'.repeat(200))
    expect(() => readItems(form)).toThrow()
  })
  it('offers a stable URL with a usable fallback when clipboard access fails; hides copying after refund', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    const props = { bill, ownerName: 'Jason', paymentOrigin: 'https://www.annadanceacademy.com' }
    const view = render(createElement(BillShareTools, props))
    fireEvent.click(screen.getByRole('button', { name: 'Copy payment link' }))
    await screen.findByRole('alert')
    expect((screen.getByLabelText('Payment link') as HTMLInputElement).value).toBe(
      `https://www.annadanceacademy.com/account/billing/${id}`,
    )
    view.rerender(
      createElement(BillShareTools, {
        ...props,
        bill: { ...bill, status: 'refunded', checkout_available: false },
      }),
    )
    expect(screen.queryByRole('button', { name: 'Copy payment link' })).toBeNull()
  })
  it('loads a single bill using both authenticated owner and bill id', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    const result = await loadBill({ from: () => query } as never, 'authenticated-owner', id)
    expect(query.eq.mock.calls).toEqual([
      ['user_profile_id', 'authenticated-owner'],
      ['id', id],
    ])
    expect(result).toEqual({ bill: null, unavailable: false })
  })
})
