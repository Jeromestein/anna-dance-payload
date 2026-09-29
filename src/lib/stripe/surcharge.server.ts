import 'server-only'

// Enable only after the merchant has completed Stripe/network notice requirements
// and confirmed the rate is permitted for its actual processing cost and location.
export function cardSurchargeEnabled() {
  return process.env.STRIPE_CARD_SURCHARGE_ENABLED === 'true'
}
