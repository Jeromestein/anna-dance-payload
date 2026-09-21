'use client'

import { startTransition, useActionState, useState } from 'react'
import { sendBillingEmail } from '@/actions/billing-notifications'
import { billPath, type Bill } from '@/lib/billing/model'
import { BillDetails } from './billing-records'
import styles from './billing.module.css'

const noticeLabels: Record<string, string> = {
  request: 'Payment request',
  paid_customer: 'Account holder payment confirmation',
  paid_admin: 'Academy payment confirmation',
  refunded_customer: 'Account holder refund confirmation',
  refunded_admin: 'Academy refund confirmation',
}

export function BillShareTools({
  bill,
  ownerName,
  paymentOrigin,
  owner,
}: {
  bill: Bill
  ownerName: string
  paymentOrigin?: string
  owner?: string
}) {
  const [emailState, emailAction, sending] = useActionState(sendBillingEmail, {})
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const url = paymentOrigin ? `${paymentOrigin}${billPath(bill.id)}` : ''
  const canShare = Boolean(bill.checkout_available && url)
  return (
    <section className={styles.shareTools} aria-label="Bill preview and payment link">
      {owner && ['payment_due', 'paid', 'refunded'].includes(bill.status) && (
        <div>
          {bill.email_notices ? (
            bill.email_notices.length ? (
              <ul>
                {bill.email_notices.map((notice) => (
                  <li key={notice.kind}>
                    {noticeLabels[notice.kind] ?? notice.kind}:{' '}
                    {notice.status === 'sent'
                      ? 'Accepted by email provider'
                      : notice.status === 'review'
                        ? 'Needs delivery review before retrying'
                        : notice.status === 'failed'
                          ? 'Not confirmed — retry available'
                          : notice.status}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No billing emails have been sent for this bill.</p>
            )
          ) : (
            <p>Email delivery history is unavailable until notification setup is complete.</p>
          )}
          <button
            type="button"
            disabled={sending || (bill.status === 'payment_due' && !canShare)}
            onClick={() => {
              const form = new FormData()
              form.set('owner', owner)
              form.set('id', bill.id)
              startTransition(() => emailAction(form))
            }}
          >
            {sending
              ? 'Sending…'
              : bill.status !== 'payment_due'
                ? 'Retry pending confirmation emails'
                : 'Send payment email'}
          </button>
          <p>
            {bill.status === 'payment_due'
              ? 'Send this bill to the verified account email. Repeated clicks do not send duplicate notices.'
              : 'Retry any unsent confirmations for the account holder and academy.'}
          </p>
          {emailState.success && <p role="status">{emailState.success}</p>}
          {emailState.error && <p role="alert">{emailState.error}</p>}
        </div>
      )}
      {owner && bill.teacher_note && <p>Message for the teacher: {bill.teacher_note}</p>}
      <details>
        <summary>Preview bill</summary>
        <div className={styles.previewCard}>
          <h3>Bill for {ownerName}</h3>
          <p>Customer preview · no payment is started here.</p>
          <BillDetails bill={bill} bills={[bill]} expanded>
            <p>The account holder signs in to pay this bill.</p>
          </BillDetails>
        </div>
      </details>
      {canShare ? (
        <>
          <button
            type="button"
            onClick={async () => {
              setCopied(false)
              setCopyError(false)
              try {
                await navigator.clipboard.writeText(url)
                setCopied(true)
              } catch {
                setCopyError(true)
              }
            }}
          >
            Copy payment link
          </button>
          <label>
            Payment link
            <input readOnly value={url} onFocus={(event) => event.currentTarget.select()} />
          </label>
          <p>The account holder must sign in with the account that owns this bill.</p>
          {copied && (
            <p role="status">Link copied. You can now share it with the account holder.</p>
          )}
          {copyError && (
            <p role="alert">Could not copy automatically. Select and copy the link above.</p>
          )}
        </>
      ) : bill.status === 'payment_due' ? (
        <p>Online payment is not available yet.</p>
      ) : null}
    </section>
  )
}
