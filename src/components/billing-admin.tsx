'use client'

import { useActionState, useId, useState } from 'react'
import { IssueBill } from './billing-issue'
import { BillShareTools } from './billing-share-tools'
import { manageBill } from '@/actions/billing'
import { money, type Bill } from '@/lib/billing/model'
import { BillDetails } from './billing-records'
import { StripeCheckout, StripeStatusRefresh } from './stripe-billing-controls'
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
      {bill.package_id && <input type="hidden" name="package_bill" value="yes" />}
      <h4>{operation === 'paid' ? 'Record verified full payment' : 'Cancel unpaid bill'}</h4>
      {operation === 'paid' && (
        <label>
          Payment method
          <select name="channel" required defaultValue={bill.package_id ? 'cash' : 'stripe'}>
            {!bill.package_id && <option value="stripe">Stripe</option>}
            <option value="cash">Cash</option>
            {!bill.package_id && <option value="bank_transfer">Bank transfer</option>}
            {!bill.package_id && <option value="other">Other</option>}
          </select>
        </label>
      )}
      {operation !== 'cancelled' && (
        <label>
          {bill.package_id
            ? 'Cash receipt reference'
            : 'Payment reference (Stripe: use PaymentIntent ID)'}
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
  paymentOrigin,
}: {
  owner: string
  bills: Bill[]
  unavailable: boolean
  newBillId: string
  paymentOrigin?: string
  ownerName: string
  stripeConfig?: { enabled: boolean; mode: 'test' | 'live' | null }
}) {
  const [creating, setCreating] = useState(false)
  const createPanelId = useId()
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
        primaryAction={
          <button
            type="button"
            className={styles.createLinkButton}
            aria-expanded={creating}
            aria-controls={createPanelId}
            onClick={() => setCreating(!creating)}
          >
            {creating ? 'Close payment form' : 'Create payment link'}
          </button>
        }
      />
      <div id={createPanelId} hidden={!creating} className={styles.createPanel}>
        <IssueBill
          owner={owner}
          ownerName={ownerName}
          bills={bills}
          id={newBillId}
          test={stripeConfig.mode === 'test'}
          paymentOrigin={paymentOrigin}
        />
      </div>
      {bills.length === 0 && (
        <div className={styles.billingEmpty}>
          <p>No payment requests yet.</p>
          <p>Create a payment link to request this student’s course fees.</p>
        </div>
      )}
      {bills.map((bill) => (
        <BillDetails key={bill.id} bill={bill} bills={bills}>
          {['payment_due', 'pending_verification'].includes(bill.status) &&
            (bill.stripe_livemode == null || bill.payment_preference === 'cash') && (
              <BillAction owner={owner} bill={bill} operation="paid" />
            )}
          {bill.status === 'payment_due' &&
            (bill.stripe_livemode == null || Boolean(bill.package_id)) && (
              <BillAction owner={owner} bill={bill} operation="cancelled" />
            )}
          {bill.stripe_livemode === false && bill.checkout_available && (
            <StripeCheckout id={bill.id} owner={owner} test staffTest />
          )}
          {bill.payment_preference !== 'cash' &&
            (bill.payment_channel === 'stripe' || bill.stripe_livemode != null) && (
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
    </div>
  )
}
