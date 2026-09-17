import 'server-only'
import Stripe from 'stripe'

export function stripeSettings() {
  const mode = process.env.STRIPE_MODE
  const key = process.env.STRIPE_SECRET_KEY?.trim() ?? ''
  const account = process.env.STRIPE_ACCOUNT_ID?.trim() ?? ''
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? ''
  if (
    !['test', 'live'].includes(mode ?? '') ||
    !new RegExp(`^(sk|rk)_${mode}_`).test(key) ||
    !/^acct_[A-Za-z0-9]+$/.test(account) ||
    !secret.startsWith('whsec_')
  )
    throw new Error('Stripe is not configured for this environment.')
  // Live money remains opt-in even when live credentials have been supplied.
  const enabled = mode === 'test' || process.env.STRIPE_LIVE_PAYMENTS_ENABLED === 'true'
  return { mode: mode as 'test' | 'live', livemode: mode === 'live', key, account, secret, enabled }
}

export function stripeAvailability() {
  try {
    const settings = stripeSettings()
    return { enabled: settings.enabled, mode: settings.mode }
  } catch {
    return { enabled: false, mode: null }
  }
}

export async function stripeContext() {
  const settings = stripeSettings()
  const stripe = new Stripe(settings.key, { maxNetworkRetries: 2, timeout: 15000 })
  // Use the merchant's own API key. Never guess a Connect platform/account context.
  const account = await stripe.accounts.retrieve(null)
  if (account.id !== settings.account)
    throw new Error('Stripe account does not match configuration.')
  return { ...settings, stripe }
}

export function siteOrigin() {
  const url = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? '')
  if (
    url.protocol !== 'https:' &&
    !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))
  )
    throw new Error('A trusted site URL is required.')
  return url.origin
}
