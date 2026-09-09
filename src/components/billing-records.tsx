import type { ReactNode } from 'react'
import { balanceDue, money, statusLabels, type Bill } from '@/lib/billing/model'
import styles from './billing.module.css'

function date(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeZone: 'America/New_York',
  }).format(new Date(value.length === 10 ? `${value}T12:00:00Z` : value))
}
export function BillDetails({
  bill,
  bills,
  children,
}: {
  bill: Bill
  bills: Bill[]
  children?: ReactNode
}) {
  const replaced = bills.find((b) => b.id === bill.replaces_payment_id)
  const replacements = bills.filter((b) => b.replaces_payment_id === bill.id)
  return (
    <details className={styles.bill} id={`bill-${bill.id}`}>
      <summary>
        <span>
          <strong>{bill.app_payment_items[0]?.description || 'Billing record'}</strong>
          <small>{date(bill.created_at)}</small>
        </span>
        <span>
          <strong>{money(bill.amount_cents, bill.currency)}</strong>
          <small>{statusLabels[bill.status] ?? 'Verification needed'}</small>
        </span>
      </summary>
      <div className={styles.body}>
        <p className={styles.reference}>Bill {bill.bill_number}</p>
        {replaced && (
          <p>
            Replaces <a href={`#bill-${replaced.id}`}>{replaced.bill_number}</a>. This is a separate
            payment; any refund on the original may arrive later.
          </p>
        )}
        {replacements.map((replacement) => (
          <p key={replacement.id}>
            Replacement bill: <a href={`#bill-${replacement.id}`}>{replacement.bill_number}</a>
          </p>
        ))}
        <ul className={styles.items}>
          {[...bill.app_payment_items]
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
            .map((item, index) => (
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
        {!bill.app_payment_items.length && (
          <p>Historical item details are unavailable. Contact the academy for details.</p>
        )}
        <dl className={styles.totals}>
          <div>
            <dt>Total</dt>
            <dd>{money(bill.amount_cents, bill.currency)}</dd>
          </div>
          <div>
            <dt>Paid</dt>
            <dd>
              {bill.paid_amount_cents === null
                ? 'Awaiting verification'
                : money(bill.paid_amount_cents, bill.currency)}
            </dd>
          </div>
          {bill.status === 'refunded' && (
            <div>
              <dt>Fully refunded</dt>
              <dd>{money(bill.amount_cents, bill.currency)}</dd>
            </div>
          )}
          <div>
            <dt>Amount due</dt>
            <dd>
              {['pending_verification', 'partially_refunded'].includes(bill.status)
                ? 'Awaiting verification'
                : money(balanceDue(bill), bill.currency)}
            </dd>
          </div>
          {bill.due_date && (
            <div>
              <dt>Due date</dt>
              <dd>{date(bill.due_date)}</dd>
            </div>
          )}
          {bill.paid_at && (
            <div>
              <dt>Payment recorded</dt>
              <dd>{date(bill.paid_at)}</dd>
            </div>
          )}
          {bill.payment_channel && (
            <div>
              <dt>Payment method</dt>
              <dd>{bill.payment_channel.replace('_', ' ')}</dd>
            </div>
          )}
          {bill.transaction_reference && (
            <div>
              <dt>Transaction reference</dt>
              <dd>{bill.transaction_reference}</dd>
            </div>
          )}
          {bill.refunded_at && (
            <div>
              <dt>Refund recorded</dt>
              <dd>{date(bill.refunded_at)}</dd>
            </div>
          )}
          {bill.refund_reference && (
            <div>
              <dt>Refund reference</dt>
              <dd>{bill.refund_reference}</dd>
            </div>
          )}
          {bill.refund_reason && (
            <div>
              <dt>Refund reason</dt>
              <dd>{bill.refund_reason}</dd>
            </div>
          )}
        </dl>
        {bill.status === 'payment_due' && (
          <p>
            Please contact the academy to arrange payment. Online payment for this bill is not
            available yet.
          </p>
        )}
        {bill.status === 'pending_verification' && (
          <p>
            Payment is being checked. Please do not pay again until the academy confirms its status.
          </p>
        )}
        {bill.status === 'partially_refunded' && (
          <p>
            This historical partial refund requires reconciliation. New bills support full refunds
            only.
          </p>
        )}
        {children}
      </div>
    </details>
  )
}
export function BillingRecords({ bills, unavailable }: { bills: Bill[]; unavailable: boolean }) {
  if (unavailable)
    return <p role="alert">Billing records could not be loaded. Please try again later.</p>
  if (!bills.length)
    return <p>No billing activity yet. Verified charges and payments will appear here.</p>
  return (
    <div className={styles.records}>
      {bills.map((bill) => (
        <BillDetails key={bill.id} bill={bill} bills={bills} />
      ))}
    </div>
  )
}
