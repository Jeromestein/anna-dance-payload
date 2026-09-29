export type CardPaymentKind = 'stripe'

export const cardSurchargeLabel = 'Stripe processing fee (3%)'
export const cardSurchargeDisclosure =
  'A 3% processing fee applies to all payments made through Stripe.'

export function cardSurchargeCents(subtotal: number) {
  if (!Number.isSafeInteger(subtotal) || subtotal < 50 || subtotal > 10000000)
    throw new Error('Invalid payment subtotal.')
  // Round down to the cent so a fractional cent never exceeds the 3% cap.
  return Math.floor((subtotal * 3) / 100)
}

export function billSubtotal(bill: { amount_cents: number; card_surcharge_cents?: number }) {
  return bill.amount_cents - (bill.card_surcharge_cents ?? 0)
}

// Preview the same quote reserved by checkout without changing the original bill.
// Settled records always keep their saved amounts.
export function billPaymentQuote(bill: {
  amount_cents: number
  card_surcharge_cents?: number
  surcharge_available?: boolean
  status: string
  currency: string
  payment_preference?: string | null
}) {
  const subtotal = billSubtotal(bill)
  const fee =
    bill.card_surcharge_cents ||
    (bill.status === 'payment_due' &&
    bill.surcharge_available &&
    bill.payment_preference !== 'cash' &&
    bill.currency === 'usd' &&
    subtotal >= 50
      ? cardSurchargeCents(subtotal)
      : 0)
  return { subtotal, fee, total: subtotal + fee }
}
