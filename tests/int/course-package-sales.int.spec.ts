import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { coursePackages, packageItem } from '@/lib/billing/packages'
import { checkoutItems } from '@/lib/billing/checkout-items'
import { IssueBill } from '@/components/billing-issue'
import { PackagePurchase, PackagePaymentMethod } from '@/components/package-purchase'
import { readItems } from '@/lib/billing/model'
vi.mock('@/actions/billing', () => ({ manageBill: vi.fn().mockResolvedValue({}) }))
vi.mock('@/actions/billing-notifications', () => ({ sendBillingEmail: vi.fn() }))
vi.mock('@/actions/course-package', () => ({
  purchasePackage: vi.fn(),
  changePackagePaymentMethod: vi.fn(),
}))
vi.mock('@/actions/stripe-billing', () => ({
  checkoutStripeBill: vi.fn(),
  reconcileStripeBill: vi.fn(),
}))
afterEach(cleanup)
beforeEach(() => vi.clearAllMocks())

describe('Full-term packages', () => {
  it('matches all nine rows of the approved CSV including the $40 half-hour lesson', () => {
    const csv = readFileSync('舞蹈课程与费用汇总_2026-09-24.csv', 'utf8')
      .trim()
      .split(/\r?\n/)
      .slice(1)
    expect(coursePackages).toHaveLength(9)
    expect(csv).toHaveLength(9)
    for (const line of csv) {
      const [id, , , day, start, end, minutes, unit, lessons, total] = line.split(',')
      const item = coursePackages.find((p) => p.id === id)
      expect(item).toMatchObject({
        day: ({ 周一: 'Monday', 周五: 'Friday', 周六: 'Saturday' } as Record<string, string>)[day],
        start,
        end,
        minutes: Number(minutes),
        lessons: Number(lessons),
        unitPrice: Number(unit) * 100,
        price: Number(total) * 100,
      })
      expect(item!.unitPrice * item!.lessons).toBe(item!.price)
    }
  })
  it('uses the saved negotiated total without reducing credits or requiring a Stripe product', () => {
    const item = packageItem(coursePackages[0])
    const checkout = checkoutItems(
      { pricing_mode: 'agreed_total', amount_cents: 28000, currency: 'usd' },
      [item],
    )
    expect(checkout[0].price_data?.unit_amount).toBe(28000)
    expect(checkout[0].price_data?.product_data?.description).toContain('10 lessons included')
    expect(checkout[0].price_data?.product).toBeUndefined()
  })
  it('autofills package totals and reviews discounts with the same lesson count', () => {
    render(
      createElement(IssueBill, {
        owner: 'student',
        ownerName: 'Student',
        bills: [],
        id: 'request',
        test: false,
      }),
    )
    expect((screen.getByLabelText('Total to collect (USD)') as HTMLInputElement).value).toBe(
      '310.00',
    )
    fireEvent.change(screen.getByLabelText('Course package'), { target: { value: 'SOLO-01' } })
    expect((screen.getByLabelText('Total to collect (USD)') as HTMLInputElement).value).toBe(
      '360.00',
    )
    fireEvent.change(screen.getByLabelText('Total to collect (USD)'), { target: { value: '280' } })
    fireEvent.click(screen.getByRole('button', { name: 'Review payment details' }))
    expect(screen.getByText('$280.00 USD')).toBeDefined()
    expect(screen.getByText('9 lessons included')).toBeDefined()
    const form = new FormData(
      screen.getByRole('button', { name: 'Create payment link' }).closest('form')!,
    )
    form.set('credit_count', '100')
    expect(readItems(form)[0].credit_count).toBe(9)
  })
  it('keeps cash available without Stripe and has no amount input in student checkout', () => {
    render(createElement(PackagePurchase, { packageId: 'level-1', online: false }))
    expect((screen.getByRole('button', { name: 'Pay Online' }) as HTMLButtonElement).disabled).toBe(
      true,
    )
    expect(
      (screen.getByRole('button', { name: 'Pay in Cash' }) as HTMLButtonElement).disabled,
    ).toBe(false)
    expect(screen.queryByRole('spinbutton')).toBeNull()
    expect(screen.getByRole('checkbox')).toBeDefined()
  })
  it('explains cash settlement and offers an explicit switch before checkout starts', () => {
    render(createElement(PackagePaymentMethod, { id: 'bill', cash: true }))
    expect(screen.getByRole('status').textContent).toContain('after staff confirms receipt')
    expect(screen.getByRole('button', { name: 'Switch to Online Payment' })).toBeDefined()
  })
})
