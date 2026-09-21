import { createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
vi.mock('@/actions/billing', () => ({ manageBill: vi.fn() }))
vi.mock('@/actions/billing-notifications', () => ({ sendBillingEmail: vi.fn() }))
vi.mock('@/actions/stripe-billing', () => ({
  checkoutStripeBill: vi.fn(),
  refundStripeBill: vi.fn(),
  reconcileStripeBill: vi.fn(),
}))
vi.mock('@/actions/course-schedule', () => ({ manageCourseSchedule: vi.fn() }))
import { readItems, readAgreedTotal, type Bill } from '@/lib/billing/model'
import { checkoutItems } from '@/lib/billing/checkout-items'
import { lessonDates, newYorkInstant } from '@/lib/account/course-credits'
import { IssueBill } from '@/components/billing-issue'
import { CourseCredits } from '@/components/course-credits'
import { renderBillingEmail } from '@/lib/email/templates'
afterEach(cleanup)
function courseForm() {
  const form = new FormData()
  form.set('bill_kind', 'courses')
  form.set('total_price', '173.29')
  form.append('course_key', 'solo30')
  form.append('credit_count', '3')
  form.append('course_key', 'group')
  form.append('credit_count', '6')
  return form
}
describe('negotiated total and included course credits', () => {
  it('keeps one exact total independent of several unpriced course counts', () => {
    const form = courseForm()
    expect(readAgreedTotal(form)).toBe(17329)
    expect(readItems(form).map((i) => [i.course_key, i.credit_count, i.unit_amount_cents])).toEqual(
      [
        ['solo30', 3, null],
        ['group', 6, null],
      ],
    )
    form.set('total_price', '721.11')
    expect(readItems(form)[0].credit_count).toBe(3)
    expect(readAgreedTotal(form)).toBe(72111)
  })
  it('rejects repeated courses, fractional credits, and unsupported courses', () => {
    const form = courseForm()
    form.append('course_key', 'group')
    form.append('credit_count', '2')
    expect(() => readItems(form)).toThrow()
    form.delete('course_key')
    form.delete('credit_count')
    form.append('course_key', 'solo30')
    form.append('credit_count', '1.5')
    expect(() => readItems(form)).toThrow()
    form.set('course_key', 'unknown')
    form.set('credit_count', '3')
    expect(() => readItems(form)).toThrow()
  })
  it('charges a bundle once without inventing course prices or using a constituent product', () => {
    const items = readItems(courseForm())
    const lines = checkoutItems(
      { pricing_mode: 'agreed_total', amount_cents: 17329, currency: 'usd' },
      items,
    )
    expect(lines).toHaveLength(1)
    expect(lines[0].quantity).toBe(1)
    expect(lines[0].price_data?.unit_amount).toBe(17329)
    expect(lines[0].price_data?.product).toBeUndefined()
    expect(lines[0].price_data?.product_data?.description).toContain('3 lessons included')
    expect(lines[0].price_data?.product_data?.description).toContain('6 lessons included')
    const single = checkoutItems(
      { pricing_mode: 'agreed_total', amount_cents: 10001, currency: 'usd' },
      [items[0]],
    )[0]
    expect(single.price_data?.product).toBeUndefined()
    expect(single.price_data?.product_data?.name).toBe('Solo Class · 30 minutes')
    expect(single.price_data?.product_data?.description).toContain('3 lessons included')
    expect(single.price_data?.unit_amount).toBe(10001)
    expect(
      checkoutItems({ pricing_mode: 'agreed_total', amount_cents: 10001, currency: 'usd' }, [
        { ...items[0], stripe_product_id: 'prod_history' },
      ])[0].price_data?.product,
    ).toBe('prod_history')
  })
  it('keeps historical itemized charges and rejects ambiguous null amounts', () => {
    expect(
      checkoutItems({ amount_cents: 6000, currency: 'usd' }, [
        { description: 'Old package', quantity: 2, unit_amount_cents: 3000 },
      ])[0].quantity,
    ).toBe(2)
    expect(() =>
      checkoutItems({ amount_cents: 1, currency: 'usd' }, readItems(courseForm())),
    ).toThrow()
  })
  it('reviews one total and course counts without per-course price inputs', () => {
    render(
      createElement(IssueBill, {
        owner: 'owner',
        ownerName: 'Student',
        bills: [],
        id: 'id',
        test: true,
      }),
    )
    fireEvent.change(screen.getByLabelText('Total to collect (USD)'), {
      target: { value: '173.29' },
    })
    expect(
      (screen.getByRole('button', { name: 'Review payment details' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    expect(screen.queryByRole('button', { name: 'Add course' })).toBeNull()
    for (const label of [
      'Group Class · 60 minutes',
      'Duet Class · 60 minutes',
      'Solo Class · 30 minutes',
      'Solo Class · 60 minutes',
    ]) {
      expect((screen.getByLabelText(label) as HTMLInputElement).value).toBe('0')
    }
    fireEvent.change(screen.getByLabelText('Solo Class · 30 minutes'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Group Class · 60 minutes'), { target: { value: '6' } })
    fireEvent.click(screen.getByRole('button', { name: 'Review payment details' }))
    expect(screen.getByText('$173.29 USD')).toBeDefined()
    expect(screen.getByText('3 lessons included')).toBeDefined()
    expect(screen.getByText('6 lessons included')).toBeDefined()
    expect(screen.queryByLabelText('Unit price (USD)')).toBeNull()
    expect(screen.queryByText('$0.00')).toBeNull()
  })
  it('omits zero-count courses and rejects empty or invalid credit requests', () => {
    const form = courseForm()
    form.append('course_key', 'duet')
    form.append('credit_count', '0')
    form.append('course_key', 'solo60')
    form.append('credit_count', '0')
    expect(readItems(form).map((item) => item.course_key)).toEqual(['solo30', 'group'])
    for (const invalid of ['0', '-1', '1.5', '', '101']) {
      form.delete('credit_count')
      for (const count of [invalid, '0', '0', '0']) form.append('credit_count', count)
      expect(() => readItems(form)).toThrow()
    }
  })
  it.each([
    'request',
    'paid_customer',
    'paid_admin',
    'refunded_customer',
    'refunded_admin',
  ] as const)('shows the saved amount and appropriate details in %s email', async (kind) => {
    const bill = {
      id: 'id',
      bill_number: 'ADA-COURSES',
      amount_cents: 17329,
      currency: 'usd',
      pricing_mode: 'agreed_total',
      status: 'paid',
      app_payment_items: readItems(courseForm()),
    } as Bill
    const html = await renderBillingEmail({
      kind,
      bill,
      studentName: 'Student',
      accountEmail: 'student@example.invalid',
      origin: 'https://example.invalid',
      owner: 'owner',
    })
    expect(html).toContain('$173.29')
    if (kind.startsWith('refunded')) {
      expect(html).toContain('Refund Amount')
      expect(html).not.toContain('Course Details')
      expect(html).not.toContain('lessons included')
      expect(html).not.toContain('Solo Class')
      expect(html).not.toContain('Group Class')
    } else {
      expect(html).toContain('3 lessons included')
      expect(html).toContain('6 lessons included')
    }
    expect(html).not.toContain('$0.00')
    expect(html).not.toContain('×')
  })
  it('shows independent available credits and keeps controls staff-only', () => {
    const data = {
      unavailable: false,
      lessons: [],
      balances: [
        {
          item_id: 'item',
          payment_id: 'bill',
          bill_number: 'ADA',
          description: 'Solo · 30 minutes',
          course_key: 'solo30',
          credit_count: 3,
          lesson_duration_minutes: 30,
          reserved: 1,
          completed: 1,
          available: 1,
          allocatable: true,
          bill_status: 'paid',
        },
      ],
    }
    render(createElement(CourseCredits, { data }))
    expect(screen.getByText('1 available to schedule')).toBeDefined()
    expect(screen.queryByText('Schedule lessons')).toBeNull()
  })
})
describe('New York scheduling', () => {
  it('keeps weekly local times through DST without shifting the class hour', () => {
    const dates = lessonDates('2026-10-25T10:00', 2, '')
    expect(dates.map((d) => d.instant)).toEqual([
      '2026-10-25T14:00:00.000Z',
      '2026-11-01T15:00:00.000Z',
    ])
  })
  it('rejects nonexistent and ambiguous local times', () => {
    expect(() => newYorkInstant('2026-03-08T02:30')).toThrow('daylight')
    expect(() => newYorkInstant('2026-11-01T01:30')).toThrow('daylight')
    expect(() => newYorkInstant('2026-02-30T10:00')).toThrow()
  })
  it('previews skipped dates and rejects dates outside the series', () => {
    expect(lessonDates('2026-10-25T10:00', 3, '2026-11-01')).toHaveLength(2)
    expect(() => lessonDates('2026-10-25T10:00', 3, '2027-01-01')).toThrow('outside')
  })
})
