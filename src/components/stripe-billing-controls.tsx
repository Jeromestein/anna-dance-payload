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
}: {
  id: string
  owner?: string
  staffTest?: boolean
  test?: boolean
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
      <button disabled={pending}>
        {pending ? 'Opening checkout…' : test ? 'Pay test bill' : 'Pay bill'}
      </button>
      {state.url && <a href={state.url}>Continue to secure Stripe checkout ↗</a>}
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
      <summary>Stripe payments & testing</summary>
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
            <label className={styles.confirm}>
              <input type="checkbox" required name="confirmed" value="yes" />
              Create a separate $0.50 test bill for this student.
            </label>
            <button disabled={!enabled || testPending || Boolean(testState.success)}>
              Create $0.50 test bill
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
