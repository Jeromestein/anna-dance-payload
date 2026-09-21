'use client'

import { useActionState } from 'react'
import { IssueBill } from './billing-issue'
import { BillShareTools } from './billing-share-tools'
import { manageBill } from '@/actions/billing'
import { money, type Bill } from '@/lib/billing/model'
import { BillDetails } from './billing-records'
import { StripeAdminTools, StripeCheckout, StripeStatusRefresh } from './stripe-billing-controls'
import { BillingRefund, RefundLauncher } from './billing-refund'
import styles from './billing.module.css'

function BillAction({
  owner,
  bill,
  operation,
}: {
  owner: string
  bill: Bill
  operation: 'paid' | 'cancelled'
}) {
  const [state, action, pending] = useActionState(manageBill, {})
  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="owner" value={owner} />
      <input type="hidden" name="id" value={bill.id} />
      <input type="hidden" name="operation" value={operation} />
      <h4>{operation === 'paid' ? 'Record verified full payment' : 'Cancel unpaid bill'}</h4>
      {operation === 'paid' && (
        <label>
          Payment method
          <select name="channel" required>
            <option value="stripe">Stripe</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="other">Other</option>
          </select>
        </label>
      )}
      {operation !== 'cancelled' && (
        <label>
          Payment reference (Stripe: use PaymentIntent ID)
          <input name="reference" required maxLength={200} />
        </label>
      )}
      <label className={styles.confirm}>
        <input type="checkbox" name="confirmed" value="yes" required />
        {operation === 'paid'
          ? `I verified receipt of the full ${money(bill.amount_cents, bill.currency)}.`
          : 'I verified that no payment has been collected for this bill.'}
      </label>
      <button disabled={pending || Boolean(state.success)}>
        {pending ? 'Saving…' : 'Save record'}
      </button>
      {state.error && <p role="alert">{state.error}</p>}
      {state.success && <p role="status">{state.success}</p>}
    </form>
  )
}
export function BillingAdmin({
  owner,
  bills,
  unavailable,
  newBillId,
  ownerName,
  stripeConfig = { enabled: false, mode: null },
  testBillId = newBillId,
  paymentOrigin,
}: {
  owner: string
  bills: Bill[]
  unavailable: boolean
  newBillId: string
  testBillId?: string
  paymentOrigin?: string
  ownerName: string
  stripeConfig?: { enabled: boolean; mode: 'test' | 'live' | null }
}) {
  if (unavailable)
    return (
      <div className={styles.records}>
        <RefundLauncher
          owner={owner}
          ownerName={ownerName}
          bills={[]}
          unavailable
          allowDemo={stripeConfig.mode === 'test'}
        />
        <p role="alert">
          Billing is unavailable. Check the database migration and connection before issuing bills.
        </p>
      </div>
    )
  return (
    <div className={styles.records}>
      <RefundLauncher
        owner={owner}
        ownerName={ownerName}
        bills={bills}
        allowDemo={stripeConfig.mode === 'test'}
      />
      <StripeAdminTools owner={owner} testId={testBillId} {...stripeConfig} />
      {bills.length === 0 && <p>No billing activity yet.</p>}
      {bills.map((bill) => (
        <BillDetails key={bill.id} bill={bill} bills={bills}>
          {['payment_due', 'pending_verification'].includes(bill.status) &&
            bill.stripe_livemode == null && (
              <BillAction owner={owner} bill={bill} operation="paid" />
            )}
          {bill.status === 'payment_due' && bill.stripe_livemode == null && (
            <BillAction owner={owner} bill={bill} operation="cancelled" />
          )}
          {bill.stripe_livemode === false && bill.checkout_available && (
            <StripeCheckout id={bill.id} owner={owner} test staffTest />
          )}
          {(bill.payment_channel === 'stripe' || bill.stripe_livemode != null) && (
            <StripeStatusRefresh owner={owner} id={bill.id} />
          )}
          <BillShareTools
            bill={bill}
            owner={owner}
            ownerName={ownerName}
            paymentOrigin={paymentOrigin}
          />
          <BillingRefund owner={owner} ownerName={ownerName} bill={bill} />
        </BillDetails>
      ))}
      <details className={styles.bill}>
        <summary>Create bill</summary>
        <div className={styles.body}>
          <IssueBill
            owner={owner}
            ownerName={ownerName}
            bills={bills}
            id={newBillId}
            test={stripeConfig.mode === 'test'}
            paymentOrigin={paymentOrigin}
          />
        </div>
      </details>
    </div>
  )
}
