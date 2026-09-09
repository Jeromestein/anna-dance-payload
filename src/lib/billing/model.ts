export type BillItem = {
  description: string
  quantity: number
  unit_amount_cents: number
  position?: number
}
export type Bill = {
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
  app_payment_items: BillItem[]
}
export const billSelect =
  'id,bill_number,amount_cents,currency,status,paid_amount_cents,due_date,created_at,paid_at,refunded_at,refund_reference,refund_reason,payment_channel,transaction_reference,replaces_payment_id,app_payment_items(description,quantity,unit_amount_cents,position)'
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
  if (!bills.length) return 'No billing activity'
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
    return { description: description.trim(), quantity, unit_amount_cents }
  })
  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_amount_cents, 0)
  if (total < 1 || total > 10000000)
    throw new Error('The bill total must be between $0.01 and $100,000.')
  return items
}
