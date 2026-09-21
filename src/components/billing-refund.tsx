'use client'

import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { refundStripeBill } from '@/actions/stripe-billing'
import { StripeStatusRefresh } from './stripe-billing-controls'
import { manageBill } from '@/actions/billing'
import { money, itemDetail, itemAmount, type Bill } from '@/lib/billing/model'
import styles from './billing.module.css'

// Only verified provider data may present a completed real refund.
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
  const [refundResult, refundAction, refundPending] = useActionState(refundStripeBill, {})
  const [step, setStep] = useState<'closed' | 'details' | 'review'>('closed')
  const [reason, setReason] = useState('')
  const [demoComplete, setDemoComplete] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const panelId = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const fullPayment = bill.paid_amount_cents === bill.amount_cents && bill.amount_cents > 0
  const stripePayment =
    bill.payment_channel === 'stripe' && /^pi_[A-Za-z0-9_]+$/.test(bill.transaction_reference ?? '')
  const canReview = bill.status === 'paid' && fullPayment && stripePayment
  const unavailableMessage = bill.website_refunds_disabled
    ? 'Refunds from this website are currently disabled. An administrator can refund this payment in Stripe, then refresh its status here.'
    : 'Connect Stripe and refresh this payment’s status before requesting a website refund.'

  useEffect(() => {
    if (step !== 'closed' && dialog.current && !dialog.current.open) {
      dialog.current.showModal()
      heading.current?.focus({ preventScroll: true })
    }
  }, [step])

  function moveTo(next: 'closed' | 'details' | 'review') {
    if (next === 'closed') dialog.current?.close()
    setStep(next)
    setConfirmed(false)
    if (next === 'closed') setReason('')
    requestAnimationFrame(() => {
      if (next === 'closed') trigger.current?.focus()
      else {
        heading.current?.focus({ preventScroll: true })
        if (dialog.current) dialog.current.scrollTop = 0
      }
    })
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
  if (
    !demo &&
    bill.refund_state &&
    ['requested', 'pending', 'failed', 'requires_review'].includes(bill.refund_state)
  )
    return (
      <section className={styles.refundSection}>
        <RefundProgress
          state={['requested', 'pending'].includes(bill.refund_state) ? 'pending' : 'failed'}
        />
        <StripeStatusRefresh owner={owner} id={bill.id} />
      </section>
    )
  if (bill.status !== 'paid') return null

  return (
    <section
      className={styles.refundSection}
      aria-label="Full refund"
      data-demo={demo || bill.stripe_livemode === false}
    >
      <div className={styles.refundHeader}>
        <div>
          <h3>Full refund</h3>
          <p>Return the entire original payment.</p>
        </div>
        <strong>{money(bill.amount_cents, bill.currency)}</strong>
      </div>
      <div
        className={styles.refundNotice}
        data-state={
          demo || bill.stripe_livemode === false
            ? 'demo'
            : bill.refund_available
              ? 'warning'
              : undefined
        }
      >
        <strong>
          {demo
            ? 'DEMO — sample payment, no money moves'
            : bill.refund_available
              ? bill.stripe_livemode === false
                ? 'Stripe test refund — no real money moves'
                : 'Refund to the original payment method'
              : bill.website_refunds_disabled
                ? 'Website refunds are currently disabled'
                : 'Website refunds are not available for this payment'}
        </strong>
        <p>
          {demo
            ? 'Try the full review and confirmation flow using a $10 sample payment. Nothing is saved or sent to Stripe.'
            : bill.refund_available
              ? 'Check the student and amount before continuing. The entire payment will be returned.'
              : unavailableMessage}
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
        createPortal(
          <dialog
            ref={dialog}
            id={panelId}
            className={styles.refundReview}
            data-demo={demo || bill.stripe_livemode === false}
            aria-labelledby={`${panelId}-heading`}
            onCancel={(event) => {
              event.preventDefault()
              if (!refundPending) moveTo('closed')
            }}
          >
            <div className={styles.refundDialogHeader}>
              <span className={styles.refundBadge}>
                {demo
                  ? 'DEMO · NO MONEY MOVES'
                  : bill.stripe_livemode === false
                    ? 'TEST PAYMENT'
                    : 'PAYMENT REFUND'}
              </span>
              <button
                type="button"
                className={styles.refundDismiss}
                aria-label="Close refund dialog"
                disabled={refundPending}
                onClick={() => moveTo('closed')}
              >
                ×
              </button>
            </div>
            <ol className={styles.refundSteps} aria-label="Refund steps">
              <li aria-current={step === 'details' ? 'step' : undefined}>
                <span>1</span> Review details
              </li>
              <li aria-current={step === 'review' ? 'step' : undefined}>
                <span>2</span> Confirm refund
              </li>
            </ol>
            <h4 id={`${panelId}-heading`} ref={heading} tabIndex={-1}>
              {step === 'details' ? '1. Refund details' : '2. Confirm full refund'}
            </h4>
            <div className={styles.refundAmount}>
              <div>
                <span>Full refund to {ownerName}</span>
                <strong>{money(bill.amount_cents, bill.currency)}</strong>
              </div>
              <span>Original payment method</span>
            </div>
            <div className={styles.refundCaution}>
              <strong>
                {demo || bill.stripe_livemode === false
                  ? 'No real money will move'
                  : 'This sends money back'}
              </strong>
              <p>
                {step === 'details'
                  ? 'Review the payment and enter a reason. No refund is sent at this step.'
                  : demo || bill.stripe_livemode === false
                    ? 'This is a test flow. Review the details before confirming.'
                    : 'Confirm only if you intend to return the full amount. A replacement bill would require a separate payment.'}
              </p>
            </div>
            <details className={styles.refundReferences}>
              <summary>Payment references</summary>
              <dl className={styles.totals}>
                <div>
                  <dt>Bill</dt>
                  <dd>{bill.bill_number}</dd>
                </div>
                <div>
                  <dt>Original payment</dt>
                  <dd>{bill.transaction_reference}</dd>
                </div>
              </dl>
            </details>
            <ul className={styles.items}>
              {bill.app_payment_items.map((item, index) => (
                <li key={index}>
                  <span>
                    {item.description}
                    <small>{itemDetail(item, bill.currency)}</small>
                  </span>
                  <strong>{itemAmount(item, bill.currency)}</strong>
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
                  <button type="button" disabled={refundPending} onClick={() => moveTo('closed')}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.refundContinue} disabled={!reason.trim()}>
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
                <label className={`${styles.confirm} ${styles.refundConsent}`}>
                  <input
                    type="checkbox"
                    checked={confirmed}
                    disabled={refundPending || Boolean(refundResult.success)}
                    onChange={(event) => setConfirmed(event.target.checked)}
                  />
                  <span>
                    I confirm the full <strong>{money(bill.amount_cents, bill.currency)}</strong>{' '}
                    refund to the original payment method for <strong>{ownerName}</strong>.
                  </span>
                </label>
                <p id={`${panelId}-unavailable`}>
                  {demo
                    ? 'This demo does not contact Stripe or update any account. Confirm below to finish the preview.'
                    : bill.refund_available
                      ? 'Confirming will request the full refund through Stripe. Completion is shown only after Stripe verifies it.'
                      : `No refund request has been sent. ${unavailableMessage}`}
                </p>
                <div className={styles.refundActions}>
                  <button type="button" disabled={refundPending} onClick={() => moveTo('details')}>
                    Back
                  </button>
                  <button type="button" disabled={refundPending} onClick={() => moveTo('closed')}>
                    Close
                  </button>
                </div>
                <button
                  type="button"
                  className={styles.refundSubmit}
                  disabled={
                    !confirmed ||
                    refundPending ||
                    Boolean(refundResult.success) ||
                    (!demo && !bill.refund_available)
                  }
                  aria-describedby={`${panelId}-unavailable`}
                  onClick={() => {
                    if (!confirmed) return
                    if (demo) setDemoComplete(true)
                    else if (bill.refund_available) {
                      const form = new FormData()
                      form.set('owner', owner)
                      form.set('id', bill.id)
                      form.set('reason', reason.trim())
                      form.set('confirmed', 'yes')
                      startTransition(() => refundAction(form))
                    }
                  }}
                >
                  {demo
                    ? 'Finish demo — no money moves'
                    : refundPending
                      ? 'Requesting refund…'
                      : `Refund ${money(bill.amount_cents, bill.currency)}${bill.refund_available ? '' : ' — unavailable'}`}
                </button>
              </div>
            )}
            {refundResult.error && (
              <div className={styles.refundNotice} data-state="failed" role="alert">
                {refundResult.error}
              </div>
            )}
            {refundResult.success && (
              <div className={styles.refundNotice} data-state="succeeded" role="status">
                {refundResult.success}
              </div>
            )}
          </dialog>,
          document.body,
        )
      )}
      {!demo && !bill.stripe_synced_at && !bill.refund_state?.match(/requested|pending/) && (
        <RecordExternalRefund owner={owner} bill={bill} />
      )}
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
  allowDemo = false,
  primaryAction,
}: {
  owner: string
  ownerName: string
  bills: Bill[]
  unavailable?: boolean
  allowDemo?: boolean
  primaryAction?: ReactNode
}) {
  const [mode, setMode] = useState<'closed' | 'real' | 'demo'>('closed')
  const [selectedId, setSelectedId] = useState('')
  const panelId = useId()
  const paidBills = bills.filter((bill) => bill.status === 'paid')
  const selectedBill = paidBills.find((bill) => bill.id === selectedId) ?? paidBills[0]
  return (
    <section className={styles.refundLauncher} aria-label="Payment actions">
      <div className={styles.refundActions}>
        {primaryAction}
        <button
          type="button"
          className={`${styles.refundButton} ${styles.refundEntry}`}
          aria-expanded={mode === 'real'}
          aria-controls={panelId}
          onClick={() => setMode(mode === 'real' ? 'closed' : 'real')}
        >
          Refund payment
        </button>
        {allowDemo && (
          <button
            type="button"
            className={styles.refundButton}
            aria-expanded={mode === 'demo'}
            aria-controls={panelId}
            onClick={() => setMode(mode === 'demo' ? 'closed' : 'demo')}
          >
            Try refund demo
          </button>
        )}
      </div>
      <div id={panelId} className={styles.refundPanel} hidden={mode === 'closed'}>
        {mode === 'real' &&
          (unavailable ? (
            <p role="alert">
              Payment records could not be loaded. Reload before reviewing a payment.
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
              No payments available for refund. Completed payments will appear here for review.
            </p>
          ))}
        {allowDemo && mode === 'demo' && (
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
