'use client'

import { useActionState, useId, useRef, useState } from 'react'
import { manageBill } from '@/actions/billing'
import { money, type Bill } from '@/lib/billing/model'
import styles from './billing.module.css'

// TODO(billing-refunds): Populate this presentation state from verified provider
// data after adding refund persistence and webhook reconciliation. Never simulate
// a successful refund in response to a browser click.
export type RefundProgressState = 'pending' | 'succeeded' | 'failed'
export function RefundProgress({ state }: { state: RefundProgressState }) {
  const copy = {
    pending: [
      'Refund processing',
      'The refund is awaiting completion. Do not submit another refund.',
    ],
    succeeded: [
      'Full refund completed',
      'The full payment has been recorded as refunded. Bank posting times may vary.',
    ],
    failed: [
      'Refund needs attention',
      'The refund did not complete. Check the original transaction in Stripe before trying again.',
    ],
  }[state]
  return (
    <div
      className={styles.refundNotice}
      data-state={state}
      role={state === 'failed' ? 'alert' : 'status'}
    >
      <strong>{copy[0]}</strong>
      <p>{copy[1]}</p>
    </div>
  )
}

function RecordExternalRefund({ owner, bill }: { owner: string; bill: Bill }) {
  const [state, action, pending] = useActionState(manageBill, {})
  return (
    <details className={styles.manualRefund}>
      <summary>Already refunded outside this website?</summary>
      <form action={action} className={styles.form}>
        <input type="hidden" name="owner" value={owner} />
        <input type="hidden" name="id" value={bill.id} />
        <input type="hidden" name="operation" value="refunded" />
        <p>
          Record a full refund that has already completed. This action updates the billing record
          only; it does not send money.
        </p>
        <label>
          Completed refund reference
          <input name="reference" required maxLength={200} />
        </label>
        <label>
          Refund reason
          <textarea name="reason" required maxLength={500} rows={3} />
        </label>
        <label className={styles.confirm}>
          <input type="checkbox" name="confirmed" value="yes" required />I verified the full{' '}
          {money(bill.amount_cents, bill.currency)} refund has completed.
        </label>
        <button disabled={pending || Boolean(state.success)}>
          {pending ? 'Saving record…' : 'Record completed refund'}
        </button>
        {state.error && <p role="alert">{state.error}</p>}
        {state.success && <p role="status">Refund recorded. No money was sent by this action.</p>}
      </form>
    </details>
  )
}

export function BillingRefund({
  owner,
  ownerName,
  bill,
  progress,
  demo = false,
}: {
  owner: string
  ownerName: string
  bill: Bill
  progress?: RefundProgressState
  demo?: boolean
}) {
  const [step, setStep] = useState<'closed' | 'details' | 'review'>('closed')
  const [reason, setReason] = useState('')
  const [demoComplete, setDemoComplete] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const panelId = useId()
  const heading = useRef<HTMLHeadingElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const fullPayment = bill.paid_amount_cents === bill.amount_cents && bill.amount_cents > 0
  const stripePayment =
    bill.payment_channel === 'stripe' && /^pi_[A-Za-z0-9_]+$/.test(bill.transaction_reference ?? '')
  const canReview = bill.status === 'paid' && fullPayment && stripePayment

  function moveTo(next: 'closed' | 'details' | 'review') {
    setStep(next)
    setConfirmed(false)
    if (next === 'closed') setReason('')
    requestAnimationFrame(() =>
      next === 'closed' ? trigger.current?.focus() : heading.current?.focus(),
    )
  }
  if (demoComplete)
    return (
      <div className={styles.refundNotice} role="status">
        <strong>Demo complete — no refund sent</strong>
        <p>This was a sample transaction. No billing records or payment methods were changed.</p>
        <button
          type="button"
          className={styles.refundButton}
          onClick={() => {
            setDemoComplete(false)
            moveTo('closed')
          }}
        >
          Restart demo
        </button>
      </div>
    )
  if (bill.status === 'refunded') return <RefundProgress state="succeeded" />
  if (progress) return <RefundProgress state={progress} />
  if (bill.status !== 'paid') return null

  return (
    <section className={styles.refundSection} aria-label="Full refund">
      <div className={styles.refundHeader}>
        <div>
          <h3>Full refund</h3>
          <p>Return the entire original payment.</p>
        </div>
        <strong>{money(bill.amount_cents, bill.currency)}</strong>
      </div>
      <div className={styles.refundNotice}>
        <strong>
          {demo ? 'DEMO — sample payment, no money moves' : 'Website refunds are not available yet'}
        </strong>
        <p>
          {demo
            ? 'Try the full review and confirmation flow using a $10 sample payment. Nothing is saved or sent to Stripe.'
            : 'Complete the refund in Stripe for now. You can review the details here, then record a completed refund below.'}
        </p>
      </div>
      {!canReview && (
        <p>
          {!fullPayment
            ? 'The full paid amount must be verified before a refund can be reviewed.'
            : 'A verified Stripe payment reference is required for website refunds. For other payment methods, refund through the original payment channel.'}
        </p>
      )}
      {step === 'closed' ? (
        <button
          ref={trigger}
          type="button"
          className={styles.refundButton}
          disabled={!canReview}
          aria-expanded={false}
          aria-controls={panelId}
          onClick={() => moveTo('details')}
        >
          Review full refund
        </button>
      ) : (
        <div id={panelId} className={styles.refundReview}>
          <h4 ref={heading} tabIndex={-1}>
            {step === 'details' ? '1. Refund details' : '2. Confirm full refund'}
          </h4>
          <dl className={styles.totals}>
            <div>
              <dt>Student</dt>
              <dd>{ownerName}</dd>
            </div>
            <div>
              <dt>Bill</dt>
              <dd>{bill.bill_number}</dd>
            </div>
            <div>
              <dt>Original payment</dt>
              <dd>{bill.transaction_reference}</dd>
            </div>
            <div>
              <dt>Refund amount</dt>
              <dd>
                <strong>{money(bill.amount_cents, bill.currency)}</strong>
              </dd>
            </div>
            <div>
              <dt>Destination</dt>
              <dd>Original payment method</dd>
            </div>
          </dl>
          <ul className={styles.items}>
            {bill.app_payment_items.map((item, index) => (
              <li key={index}>
                <span>
                  {item.description}
                  <small>
                    {item.quantity} × {money(item.unit_amount_cents, bill.currency)}
                  </small>
                </span>
                <strong>{money(item.quantity * item.unit_amount_cents, bill.currency)}</strong>
              </li>
            ))}
          </ul>
          {step === 'details' ? (
            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault()
                if (reason.trim()) moveTo('review')
              }}
            >
              <label>
                Refund reason
                <textarea
                  required
                  maxLength={500}
                  rows={3}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
              <p>
                Only full refunds are supported. To change the amount, refund this payment in full
                and create a replacement bill for a separate payment.
              </p>
              <div className={styles.refundActions}>
                <button type="button" onClick={() => moveTo('closed')}>
                  Cancel
                </button>
                <button type="submit" disabled={!reason.trim()}>
                  Review confirmation
                </button>
              </div>
            </form>
          ) : (
            <div className={styles.form}>
              <div>
                <strong>Reason</strong>
                <p className={styles.refundReason}>{reason.trim()}</p>
              </div>
              <label className={styles.confirm}>
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                I confirm the full {money(bill.amount_cents, bill.currency)} refund to the original
                payment method.
              </label>
              <p id={`${panelId}-unavailable`}>
                {demo
                  ? 'This demo does not contact Stripe or update any account. Confirm below to finish the preview.'
                  : 'No refund request has been sent. Submission will be available after Stripe refunds are connected. This review is not saved.'}
              </p>
              <div className={styles.refundActions}>
                <button type="button" onClick={() => moveTo('details')}>
                  Back
                </button>
                <button type="button" onClick={() => moveTo('closed')}>
                  Close
                </button>
              </div>
              {/* TODO(billing-refunds): Wire only to an administrator-authorized,
            amount-verified, idempotent server refund endpoint. */}
              <button
                type="button"
                disabled={!demo || !confirmed}
                aria-describedby={`${panelId}-unavailable`}
                onClick={() => {
                  if (demo && confirmed) setDemoComplete(true)
                }}
              >
                {demo
                  ? 'Finish demo — no money moves'
                  : `Refund ${money(bill.amount_cents, bill.currency)} — unavailable`}
              </button>
            </div>
          )}
        </div>
      )}
      {!demo && <RecordExternalRefund owner={owner} bill={bill} />}
    </section>
  )
}

const demoBill: Bill = {
  id: 'refund-demo',
  bill_number: 'DEMO-ONLY',
  amount_cents: 1000,
  currency: 'usd',
  status: 'paid',
  paid_amount_cents: 1000,
  created_at: '2026-09-09T12:00:00Z',
  paid_at: '2026-09-09T12:00:00Z',
  due_date: null,
  refunded_at: null,
  refund_reference: null,
  refund_reason: null,
  payment_channel: 'stripe',
  transaction_reference: 'pi_DEMO_NOT_A_REAL_PAYMENT',
  replaces_payment_id: null,
  app_payment_items: [
    { description: 'Sample lesson — demo only', quantity: 1, unit_amount_cents: 1000 },
  ],
}

export function RefundLauncher({
  owner,
  ownerName,
  bills,
  unavailable = false,
}: {
  owner: string
  ownerName: string
  bills: Bill[]
  unavailable?: boolean
}) {
  const [mode, setMode] = useState<'closed' | 'real' | 'demo'>('closed')
  const [selectedId, setSelectedId] = useState('')
  const panelId = useId()
  const paidBills = bills.filter((bill) => bill.status === 'paid')
  const selectedBill = paidBills.find((bill) => bill.id === selectedId) ?? paidBills[0]
  return (
    <section className={styles.refundLauncher} aria-label="Refund actions">
      <div className={styles.refundHeader}>
        <div>
          <h3>Refunds</h3>
          <p>Review a payment or try the demo.</p>
        </div>
      </div>
      <div className={styles.refundActions}>
        <button
          type="button"
          className={styles.refundButton}
          aria-expanded={mode === 'real'}
          aria-controls={panelId}
          onClick={() => setMode(mode === 'real' ? 'closed' : 'real')}
        >
          Refund payment
        </button>
        <button
          type="button"
          className={styles.refundButton}
          aria-expanded={mode === 'demo'}
          aria-controls={panelId}
          onClick={() => setMode(mode === 'demo' ? 'closed' : 'demo')}
        >
          Try refund demo
        </button>
      </div>
      <div id={panelId} hidden={mode === 'closed'}>
        {mode === 'real' &&
          (unavailable ? (
            <p role="alert">
              Payment records could not be loaded. Try the demo, or reload before reviewing a real
              payment.
            </p>
          ) : selectedBill ? (
            <>
              <label className={styles.refundSelect}>
                Select a paid bill
                <select
                  value={selectedBill.id}
                  onChange={(event) => setSelectedId(event.target.value)}
                >
                  {paidBills.map((bill) => (
                    <option key={bill.id} value={bill.id}>
                      {bill.bill_number} · {money(bill.amount_cents, bill.currency)}
                    </option>
                  ))}
                </select>
              </label>
              <BillingRefund
                key={selectedBill.id}
                owner={owner}
                ownerName={ownerName}
                bill={selectedBill}
              />
            </>
          ) : (
            <p role="status">
              No paid bills are recorded for this student yet. Historical payments must be imported
              before they can be refunded here. You can still try the refund demo.
            </p>
          ))}
        {mode === 'demo' && (
          <BillingRefund
            key="demo"
            owner="demo"
            ownerName="Demo customer (not this student)"
            bill={demoBill}
            demo
          />
        )}
        {mode !== 'closed' && (
          <button type="button" className={styles.refundButton} onClick={() => setMode('closed')}>
            Close refund panel
          </button>
        )}
      </div>
    </section>
  )
}
