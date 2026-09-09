'use client'

import { useActionState, useState } from 'react'
import { manageBill } from '@/actions/billing'
import { money, type Bill } from '@/lib/billing/model'
import { BillDetails } from './billing-records'
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
function IssueBill({ owner, bills, id }: { owner: string; bills: Bill[]; id: string }) {
  const [state, action, pending] = useActionState(manageBill, {})
  const [items, setItems] = useState([{ key: 0, description: '', quantity: '1', price: '' }])
  const total = items.reduce(
    (sum, item) => sum + Math.round(Number(item.price) * 100) * Number(item.quantity),
    0,
  )
  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="owner" value={owner} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="operation" value="issue" />
      <h3>Create an itemized bill</h3>
      <p>Review the charges before issuing. Issued amounts cannot be edited.</p>
      {items.map((item, index) => (
        <fieldset key={item.key}>
          <legend>Item {index + 1}</legend>
          <label>
            Description
            <input
              name="description"
              required
              maxLength={200}
              value={item.description}
              onChange={(e) =>
                setItems(
                  items.map((i) =>
                    i.key === item.key ? { ...i, description: e.target.value } : i,
                  ),
                )
              }
            />
          </label>
          <div className={styles.row}>
            <label>
              Quantity
              <input
                type="number"
                name="quantity"
                min="1"
                max="100"
                step="1"
                required
                value={item.quantity}
                onChange={(e) =>
                  setItems(
                    items.map((i) => (i.key === item.key ? { ...i, quantity: e.target.value } : i)),
                  )
                }
              />
            </label>
            <label>
              Unit price (USD)
              <input
                type="number"
                name="price"
                min="0"
                max="100000"
                step="0.01"
                required
                value={item.price}
                onChange={(e) =>
                  setItems(
                    items.map((i) => (i.key === item.key ? { ...i, price: e.target.value } : i)),
                  )
                }
              />
            </label>
          </div>
          {items.length > 1 && (
            <button type="button" onClick={() => setItems(items.filter((i) => i.key !== item.key))}>
              Remove item {index + 1}
            </button>
          )}
        </fieldset>
      ))}
      <button
        type="button"
        disabled={items.length >= 20}
        onClick={() =>
          setItems([
            ...items,
            {
              key: Math.max(...items.map((i) => i.key)) + 1,
              description: '',
              quantity: '1',
              price: '',
            },
          ])
        }
      >
        Add item
      </button>
      <strong>Total: {money(Number.isFinite(total) ? total : 0, 'usd')}</strong>
      <label>
        Due date (optional)
        <input type="date" name="due" />
      </label>
      <label>
        Replaces an earlier bill (optional)
        <select name="replaces">
          <option value="">None</option>
          {bills.map((bill) => (
            <option key={bill.id} value={bill.id}>
              {bill.bill_number} · {money(bill.amount_cents, bill.currency)}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.confirm}>
        <input type="checkbox" name="confirmed" value="yes" required />I checked the items and
        total. Issue this bill to the student.
      </label>
      <button disabled={pending || Boolean(state.success)}>
        {pending ? 'Issuing…' : 'Issue bill'}
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
}: {
  owner: string
  bills: Bill[]
  unavailable: boolean
  newBillId: string
  ownerName: string
}) {
  if (unavailable)
    return (
      <div className={styles.records}>
        <RefundLauncher owner={owner} ownerName={ownerName} bills={[]} unavailable />
        <p role="alert">
          Billing is unavailable. Check the database migration and connection before issuing bills.
        </p>
      </div>
    )
  return (
    <div className={styles.records}>
      <RefundLauncher owner={owner} ownerName={ownerName} bills={bills} />
      {bills.length === 0 && <p>No billing activity yet.</p>}
      {bills.map((bill) => (
        <BillDetails key={bill.id} bill={bill} bills={bills}>
          {['payment_due', 'pending_verification'].includes(bill.status) && (
            <BillAction owner={owner} bill={bill} operation="paid" />
          )}
          {bill.status === 'payment_due' && (
            <BillAction owner={owner} bill={bill} operation="cancelled" />
          )}
          <BillingRefund owner={owner} ownerName={ownerName} bill={bill} />
        </BillDetails>
      ))}
      <details className={styles.bill}>
        <summary>Create bill</summary>
        <div className={styles.body}>
          <IssueBill key={bills.length} owner={owner} bills={bills} id={newBillId} />
        </div>
      </details>
    </div>
  )
}
