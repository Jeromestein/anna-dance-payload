import { coursePackage, packageItem } from './packages'
import { courseOption } from './courses'

export type BillItem = {
  id?: string
  course_key?: string | null
  stripe_product_id?: string | null
  credit_count?: number | null
  lesson_duration_minutes?: number | null
  description: string
  quantity: number
  unit_amount_cents: number | null
  position?: number
}
export type Bill = {
  package_id?: string | null
  package_catalog?: string | null
  payment_preference?: 'cash' | null

  pricing_mode?: 'itemized' | 'agreed_total'
  id: string
  bill_number: string
  amount_cents: number
  currency: string
  status:
    | 'payment_due'
    | 'pending_verification'
    | 'paid'
    | 'refunded'
    | 'cancelled'
    | 'partially_refunded'
  paid_amount_cents: number | null
  due_date: string | null
  created_at: string
  paid_at: string | null
  refunded_at: string | null
  refund_reference: string | null
  refund_reason: string | null
  payment_channel: string | null
  transaction_reference: string | null
  replaces_payment_id: string | null
  stripe_livemode?: boolean | null
  refund_state?: 'none' | 'requested' | 'pending' | 'succeeded' | 'failed' | 'requires_review'
  stripe_refunded_amount_cents?: number
  refund_requested_at?: string | null
  stripe_synced_at?: string | null
  checkout_available?: boolean
  refund_available?: boolean
  website_refunds_disabled?: boolean
  email_notices?: Array<{ kind: string; status: string; sent_at: string | null }>
  teacher_note?: string
  app_bill_acknowledgements?: { note: string; accepted_at: string } | null
  app_payment_items: BillItem[]
}
export const billSelect =
  'id,package_id,package_catalog,payment_preference,pricing_mode,bill_number,amount_cents,currency,status,paid_amount_cents,due_date,created_at,paid_at,refunded_at,refund_reference,refund_reason,payment_channel,transaction_reference,replaces_payment_id,stripe_livemode,refund_state,stripe_refunded_amount_cents,refund_requested_at,stripe_synced_at,app_payment_items(id,description,quantity,unit_amount_cents,position,course_key,stripe_product_id,credit_count,lesson_duration_minutes),app_bill_acknowledgements(note,accepted_at)'
export const statusLabels: Record<Bill['status'], string> = {
  payment_due: 'Unpaid',
  pending_verification: 'Pending verification',
  paid: 'Paid',
  refunded: 'Fully refunded',
  cancelled: 'Cancelled',
  partially_refunded: 'Historical partial refund',
}
export function money(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency.toUpperCase()}`
  }
}
export function balanceDue(bill: Bill) {
  return bill.status === 'payment_due'
    ? Math.max(0, bill.amount_cents - (bill.paid_amount_cents ?? 0))
    : 0
}
export function billingSummary(bills: Bill[], unavailable = false) {
  if (unavailable) return 'Billing unavailable'
  const hasTestPayments = bills.some((b) => b.stripe_livemode === false)
  bills = bills.filter((b) => b.stripe_livemode !== false)
  if (!bills.length) return hasTestPayments ? 'Test payments only' : 'No billing activity'
  const totals = new Map<string, number>()
  for (const bill of bills) {
    const due = balanceDue(bill)
    if (due) totals.set(bill.currency, (totals.get(bill.currency) ?? 0) + due)
  }
  if (totals.size)
    return Array.from(totals, ([currency, cents]) => `${money(cents, currency)} due`).join(' · ')
  if (bills.some((b) => b.status === 'pending_verification' || b.status === 'partially_refunded'))
    return 'Verification needed'
  if (bills.every((b) => b.status === 'paid')) return 'All paid'
  return 'No payment due'
}
export function parseCents(value: string) {
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(value))
    throw new Error('Enter a valid price with up to two decimal places.')
  const [whole, fraction = ''] = value.split('.')
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
}
export function readItems(form: FormData): BillItem[] {
  if (form.get('bill_kind') === 'package') {
    const item = coursePackage(String(form.get('package_id') ?? ''))
    if (!item) throw new Error('Choose a course package.')
    readAgreedTotal(form)
    return [packageItem(item)]
  }
  if (form.get('bill_kind') === 'other') {
    const name = String(form.get('fee_name') ?? '').trim()
    const note = String(form.get('fee_note') ?? '').trim()
    if (!name || name.length > 100 || note.length > 90)
      throw new Error(
        'Enter a fee name up to 100 characters and an optional note up to 90 characters.',
      )
    return [
      {
        description: note ? `${name} — ${note}` : name,
        quantity: 1,
        unit_amount_cents: readAgreedTotal(form),
      },
    ]
  }
  if (form.get('bill_kind') === 'courses') {
    const keys = form.getAll('course_key').map(String)
    const counts = form.getAll('credit_count').map(String)
    readAgreedTotal(form)
    if (
      !keys.length ||
      keys.length > 4 ||
      keys.length !== counts.length ||
      new Set(keys).size !== keys.length
    )
      throw new Error('Choose each included course once, with its number of lessons.')
    const items = keys
      .map((key, index) => {
        const course = courseOption(key)
        const count = Number(counts[index])
        if (
          !course ||
          !/^\d+$/.test(counts[index]) ||
          !Number.isInteger(count) ||
          count < 0 ||
          count > 100
        )
          throw new Error('Enter a whole number from 0 to 100 for each course.')
        return {
          course_key: key,
          description: `${course.name} · ${course.minutes} minutes`,
          credit_count: count,
          lesson_duration_minutes: course.minutes,
          quantity: 1,
          unit_amount_cents: null,
        }
      })
      .filter((item) => item.credit_count > 0)
    if (!items.length) throw new Error('Enter at least one lesson before continuing.')
    return items
  }
  if (form.get('bill_kind') === 'fixed') {
    const name = String(form.get('package_name') ?? '').trim()
    const coverage = String(form.get('coverage') ?? '').trim()
    const count = Number(form.get('course_count'))
    const unit = String(form.get('course_unit'))
    const amount = parseCents(String(form.get('total_price') ?? ''))
    if (
      !name ||
      name.length > 60 ||
      !coverage ||
      coverage.length > 100 ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > 100 ||
      !['lessons', 'days'].includes(unit)
    )
      throw new Error('Enter a course name, 1–100 lessons or days, and a coverage description.')
    if (amount < 50 || amount > 10000000)
      throw new Error('The bill total must be between $0.50 and $100,000.')
    // Quantity stays one: a negotiated total need not divide evenly by lesson count.
    return [
      {
        description: `${name} (${count} ${count === 1 ? unit.slice(0, -1) : unit}) — ${coverage}`,
        quantity: 1,
        unit_amount_cents: amount,
      },
    ]
  }
  const packageBill = form.get('bill_kind') === 'lessons'
  const descriptions = form.getAll('description').map(String)
  const quantities = form.getAll('quantity').map(String)
  const prices = form.getAll('price').map(String)
  if (
    !descriptions.length ||
    descriptions.length > 20 ||
    quantities.length !== descriptions.length ||
    prices.length !== descriptions.length
  )
    throw new Error('Add between 1 and 20 items.')
  const items = descriptions.map((description, i) => {
    const quantity = Number(quantities[i])
    const unit_amount_cents = parseCents(prices[i])
    if (
      !description.trim() ||
      description.trim().length > 200 ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 100 ||
      unit_amount_cents > 10000000
    )
      throw new Error('Check the item description, quantity, and price.')
    const label = packageBill
      ? `${description.trim()} (${quantity} ${quantity === 1 ? 'lesson' : 'lessons'})`
      : description.trim()
    if (label.length > 200 || (packageBill && unit_amount_cents < 1))
      throw new Error('Use a shorter course name and a positive price per lesson.')
    return { description: label, quantity, unit_amount_cents }
  })
  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_amount_cents, 0)
  if (total < 1 || total > 10000000)
    throw new Error('The bill total must be between $0.01 and $100,000.')
  return items
}

export function billPath(id: string) {
  return `/account/billing/${encodeURIComponent(id)}`
}

export function readAgreedTotal(form: FormData) {
  const amount = parseCents(String(form.get('total_price') ?? ''))
  if (amount < 50 || amount > 10000000)
    throw new Error('The bill total must be between $0.50 and $100,000.')
  return amount
}

export function itemDetail(item: BillItem, currency: string) {
  return item.credit_count != null
    ? `${item.credit_count} ${item.credit_count === 1 ? 'lesson' : 'lessons'} included`
    : item.unit_amount_cents != null
      ? `${item.quantity} × ${money(item.unit_amount_cents, currency)}`
      : ''
}
export function itemAmount(item: BillItem, currency: string) {
  return item.unit_amount_cents == null
    ? ''
    : money(item.quantity * item.unit_amount_cents, currency)
}
