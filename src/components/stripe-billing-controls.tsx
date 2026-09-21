'use client'
import { useActionState } from 'react'
import {
  checkoutStripeBill,
  createStripeTestBill,
  importStripePayment,
  reconcileStripeBill,
} from '@/actions/stripe-billing'
import styles from './billing.module.css'

export function StripeCheckout({
  id,
  owner,
  staffTest = false,
  test = false,
  amountLabel,
  acknowledgement,
}: {
  id: string
  owner?: string
  staffTest?: boolean
  test?: boolean
  amountLabel?: string
  acknowledgement?: { note: string; accepted_at: string } | null
}) {
  const [state, action, pending] = useActionState(checkoutStripeBill, {})
  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="id" value={id} />
      {staffTest && (
        <>
          <input type="hidden" name="owner" value={owner} />
          <input type="hidden" name="staffTest" value="yes" />
        </>
      )}
      {test && <p>Test payment only. Use a Stripe test card; no real money moves.</p>}
      {!staffTest && (
        <>
          <label>
            Message for the teacher (optional)
            <textarea
              name="note"
              maxLength={500}
              defaultValue={acknowledgement?.note ?? ''}
              readOnly={Boolean(acknowledgement)}
            />
          </label>
          <p>
            {acknowledgement
              ? 'Your message has been saved. Contact the academy if you need to change it.'
              : 'Your message will be saved when you open checkout.'}
          </p>
          <label className={styles.confirm}>
            <input type="checkbox" required name="termsAccepted" value="yes" />
            <span>
              I have reviewed the course details and total and agree to the{' '}
              <a href="/terms" target="_blank" rel="noreferrer">
                Website Terms of Use
              </a>
              .
            </span>
          </label>
          <p>
            The full enrollment agreement and liability waiver must be signed separately before
            participation.
          </p>
        </>
      )}
      <button disabled={pending}>
        {pending
          ? 'Opening checkout…'
          : test
            ? `Pay test bill${amountLabel ? ` — ${amountLabel}` : ''}`
            : amountLabel
              ? `Pay ${amountLabel}`
              : 'Pay bill'}
      </button>
      {state.error && <p role="alert">{state.error}</p>}
    </form>
  )
}
export function StripeStatusRefresh({ owner, id }: { owner: string; id: string }) {
  const [state, action, pending] = useActionState(reconcileStripeBill, {})
  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="owner" value={owner} />
      <button disabled={pending}>{pending ? 'Checking Stripe…' : 'Refresh Stripe status'}</button>
      {state.success && <p role="status">{state.success}</p>}
      {state.error && <p role="alert">{state.error}</p>}
    </form>
  )
}
export function StripeAdminTools({
  owner,
  enabled,
  mode,
  testId,
}: {
  owner: string
  enabled: boolean
  mode: 'test' | 'live' | null
  testId: string
}) {
  const [testState, testAction, testPending] = useActionState(createStripeTestBill, {})
  const [importState, importAction, importPending] = useActionState(importStripePayment, {})
  return (
    <details className={styles.bill}>
      <summary>{mode === 'test' ? 'Stripe sandbox tools' : 'Stripe payment tools'}</summary>
      <div className={styles.body}>
        <p>
          {mode === 'test'
            ? 'Stripe test environment — no real charges.'
            : mode === 'live'
              ? 'Stripe live environment.'
              : 'Stripe connection is not configured yet.'}
        </p>
        {mode === 'test' && (
          <form action={testAction} className={styles.form}>
            <input type="hidden" name="owner" value={owner} />
            <input type="hidden" name="id" value={testId} />
            <label>
              Test amount (USD)
              <input
                name="price"
                type="number"
                min="0.50"
                max="100000"
                step="0.01"
                defaultValue="0.50"
                required
              />
            </label>
            <label className={styles.confirm}>
              <input type="checkbox" required name="confirmed" value="yes" />
              Create a separate test bill for this student. No real money moves.
            </label>
            <button disabled={!enabled || testPending || Boolean(testState.success)}>
              Create test bill
            </button>
            {testState.success && <p role="status">{testState.success}</p>}
            {testState.error && <p role="alert">{testState.error}</p>}
          </form>
        )}
        <form action={importAction} className={styles.form}>
          <h3>Import an existing Stripe payment</h3>
          <p>
            Verify an existing payment against Stripe and this student’s email. This does not charge
            again. Refund history is imported too.
          </p>
          <input type="hidden" name="owner" value={owner} />
          <label>
            Stripe PaymentIntent ID
            <input
              name="reference"
              required
              pattern="pi_[A-Za-z0-9]+"
              placeholder="pi_…"
              maxLength={200}
            />
          </label>
          <label>
            Charge description
            <input name="description" required maxLength={200} />
          </label>
          <label className={styles.confirm}>
            <input type="checkbox" required name="confirmed" value="yes" />I verified that this
            payment belongs to this student and the description is accurate.
          </label>
          <button disabled={!mode || importPending}>
            {importPending ? 'Verifying…' : 'Verify and import payment'}
          </button>
          {importState.success && <p role="status">{importState.success}</p>}
          {importState.error && <p role="alert">{importState.error}</p>}
        </form>
      </div>
    </details>
  )
}
