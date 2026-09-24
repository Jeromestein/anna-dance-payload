import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { BillDetails } from '@/components/billing-records'
import { BillingPaymentStatus } from '@/components/billing-payment-status'
import { PackagePaymentMethod } from '@/components/package-purchase'
import { StripeCheckout } from '@/components/stripe-billing-controls'
import { billPath, money, statusLabels } from '@/lib/billing/model'
import { loadBill } from '@/lib/billing/load'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { checkoutReadiness, uuidPattern } from '@/lib/stripe/billing'
import styles from '@/components/billing.module.css'

export const metadata: Metadata = { title: 'Your bill', robots: { index: false, follow: false } }

export default async function BillPage({
  params,
  searchParams,
}: {
  params: Promise<{ billId: string }>
  searchParams: Promise<{ checkout?: string }>
}) {
  const { billId } = await params
  if (!uuidPattern.test(billId)) notFound()
  const loginPath = `/login?next=${encodeURIComponent(billPath(billId))}`
  if (!isSupabaseConfigured()) redirect(loginPath)
  const client = await createClient()
  const { data, error } = await client.auth.getClaims()
  const owner = data?.claims?.sub
  if (error || !owner) redirect(loginPath)
  const { bill, unavailable } = await loadBill(client, owner, billId)
  if (!bill && !unavailable) notFound()
  if (!bill)
    return (
      <section className={styles.billPage}>
        <h1>Bill unavailable</h1>
        <p role="alert">We could not load your bill. Please try again.</p>
        <Link href="/account">Back to My Account</Link>
      </section>
    )
  const { data: profile } = await client
    .from('app_user_profiles')
    .select('name')
    .eq('id', owner)
    .maybeSingle()
  const readiness = bill.checkout_available ? await checkoutReadiness(owner, billId) : 'unavailable'
  const returned = (await searchParams).checkout
  const pending = readiness === 'pending' || bill.status === 'pending_verification'
  const overdue =
    bill.status === 'payment_due' &&
    bill.due_date &&
    bill.due_date <
      new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
  return (
    <section className={styles.billPage}>
      <Link className={styles.billBack} href="/account">
        ← My Account
      </Link>
      <article className={styles.billPageCard}>
        <header className={styles.billPageHeader}>
          <p className={styles.billEyebrow}>
            {bill.stripe_livemode === false ? 'SANDBOX · NO REAL MONEY' : 'ANNA DANCE ACADEMY'}
          </p>
          <h1>Your bill</h1>
          <p>
            For <strong>{profile?.name || 'your account'}</strong>
          </p>
          <span className={styles.billStatus}>
            {bill.payment_preference === 'cash' && bill.status === 'payment_due'
              ? 'Awaiting cash payment'
              : pending
                ? 'Awaiting payment confirmation'
                : overdue
                  ? 'Unpaid · overdue'
                  : statusLabels[bill.status]}
          </span>
        </header>
        <BillDetails bill={bill} bills={[bill]} expanded>
          <div className={styles.billPayment}>
            {bill.package_id && bill.status === 'payment_due' && !pending && (
              <PackagePaymentMethod id={bill.id} cash={bill.payment_preference === 'cash'} />
            )}
            {pending ? (
              <BillingPaymentStatus />
            ) : bill.status === 'payment_due' && readiness === 'ready' ? (
              <>
                <p>Review the items and quantities above. One payment covers this entire bill.</p>
                {returned === 'closed' && (
                  <p>Checkout was closed. Your bill has not been cancelled.</p>
                )}
                {returned === 'submitted' && (
                  <p>
                    We are waiting for your payment confirmation. Please refresh the status before
                    trying to pay again.
                  </p>
                )}
                <StripeCheckout
                  acknowledgement={bill.app_bill_acknowledgements}
                  id={bill.id}
                  test={bill.stripe_livemode === false}
                  amountLabel={money(bill.amount_cents, bill.currency)}
                />
              </>
            ) : bill.status === 'payment_due' && bill.checkout_available ? (
              <p role="alert">
                Payment needs a status check before continuing. Please try again or contact the
                academy.
              </p>
            ) : null}
          </div>
        </BillDetails>
      </article>
    </section>
  )
}
