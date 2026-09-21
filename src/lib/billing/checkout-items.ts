import type Stripe from 'stripe'
import type { BillItem } from './model'
import { itemDetail } from './model'
import { courseOption } from './courses'

export function checkoutItems(
  bill: { pricing_mode?: string; amount_cents: number; currency: string },
  items: BillItem[],
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  if (!items.length) throw new Error('Bill item totals need review.')
  if (bill.pricing_mode === 'agreed_total') {
    if (
      bill.currency !== 'usd' ||
      !Number.isInteger(bill.amount_cents) ||
      bill.amount_cents < 50 ||
      items.some(
        (i) =>
          !courseOption(i.course_key ?? '') ||
          !Number.isInteger(i.credit_count) ||
          i.credit_count! < 1 ||
          i.credit_count! > 100 ||
          i.quantity !== 1 ||
          i.unit_amount_cents !== null,
      )
    )
      throw new Error('Course bill details need review.')
    return [
      {
        quantity: 1,
        price_data: {
          currency: bill.currency,
          unit_amount: bill.amount_cents,
          // Preserve historical single-course Checkout parameters for retries.
          ...(items.length === 1 && items[0].stripe_product_id
            ? { product: items[0].stripe_product_id! }
            : {
                product_data: {
                  name:
                    items.length === 1
                      ? items[0].description
                      : 'Anna Dance Academy · Course package',
                  description: items
                    .map((i) => `${i.description}: ${itemDetail(i, bill.currency)}`)
                    .join('; '),
                },
              }),
        },
      },
    ]
  }
  if (
    items.some((i) => i.unit_amount_cents == null) ||
    items.reduce((sum, i) => sum + i.quantity * (i.unit_amount_cents ?? 0), 0) !== bill.amount_cents
  )
    throw new Error('Bill item totals need review.')
  return items.map((i) => ({
    quantity: i.quantity,
    price_data: {
      currency: bill.currency,
      unit_amount: i.unit_amount_cents!,
      product_data: { name: i.description },
    },
  }))
}
