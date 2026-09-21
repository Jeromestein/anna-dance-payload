import 'server-only'

import { billPath, billSelect, money, itemDetail, type Bill } from '@/lib/billing/model'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { siteOrigin } from '@/lib/stripe/config'
import { renderBillingEmail } from './templates'

type Notice = {
  id: string
  kind: 'request' | 'paid_customer' | 'paid_admin' | 'refunded_customer' | 'refunded_admin'
  status: string
  claim_token?: string
  payload?: Record<string, unknown>
}

export async function billingNotices(owner: string, id: string, requestPayment = false) {
  const db = createSupabaseAdminClient()
  const billResult = await db
    .from('app_payments')
    .select(billSelect)
    .eq('user_profile_id', owner)
    .eq('id', id)
    .single()
  if (billResult.error || !billResult.data) throw new Error('Bill not found.')
  const bill = billResult.data as unknown as Bill
  if (requestPayment) {
    if (bill.status !== 'payment_due') throw new Error('This bill is no longer awaiting payment.')
    const queued = await db.rpc('app_queue_bill_request', { p_owner: owner, p_id: id })
    if (queued.error) throw new Error('Payment email setup is incomplete. The bill is saved.')
  }
  const notices = await db
    .from('app_billing_notifications')
    .select('id,kind,status')
    .eq('payment_id', id)
    .order('created_at')
  if (notices.error) throw new Error('Email status could not be loaded. Check notification setup.')
  const rows = (notices.data ?? []) as Notice[]
  const pending = rows.filter((n) => !['sent', 'cancelled'].includes(n.status))
  if (!pending.length) return { sent: rows.filter((n) => n.status === 'sent').length }

  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESEND_FROM_EMAIL?.trim()
  if (!apiKey || !from)
    throw new Error('Email is not configured. The bill and payment status are saved.')
  const origin = siteOrigin()
  const [profile, auth, acknowledgement] = await Promise.all([
    db.from('app_user_profiles').select('name').eq('id', owner).single(),
    db.auth.admin.getUserById(owner),
    db.from('app_bill_acknowledgements').select('note').eq('payment_id', id).maybeSingle(),
  ])
  const user = auth.data?.user
  if (profile.error || auth.error || !user?.email || !user.email_confirmed_at)
    throw new Error('The account holder must verify their email before billing emails can be sent.')
  if (acknowledgement.error) throw new Error('Payment details could not be loaded for the email.')
  const test = bill.stripe_livemode === false
  const testTo = process.env.BILLING_EMAIL_TEST_TO?.trim()
  if (test && !testTo) throw new Error('Set a sandbox email recipient before sending test notices.')
  const testAdminTo = process.env.BILLING_EMAIL_TEST_ADMIN_TO?.trim() || testTo
  const adminTo =
    process.env.BILLING_NOTIFICATION_TO?.trim() ||
    process.env.STUDENT_REGISTRATION_NOTIFICATION_TO?.trim() ||
    process.env.CONTACT_TO_EMAIL?.trim() ||
    'annadanceacademy@gmail.com'
  const summary = [...bill.app_payment_items]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((item) => `${item.description} — ${itemDetail(item, bill.currency)}`)
    .join('\n')
  const label = `${test ? '[SANDBOX] ' : ''}${bill.bill_number}`
  let failed = false
  let sent = rows.filter((notice) => notice.status === 'sent').length
  for (const notice of pending) {
    const request = notice.kind === 'request'
    const refund = notice.kind === 'refunded_customer' || notice.kind === 'refunded_admin'
    const admin = notice.kind === 'paid_admin' || notice.kind === 'refunded_admin'
    const payload = {
      from,
      to: [test ? (admin ? testAdminTo! : testTo!) : admin ? adminTo : user.email],
      subject: `${request ? 'Payment Requested' : refund ? 'Full Refund Confirmed' : 'Payment Confirmed'} · ${label}`,
      html: await renderBillingEmail({
        kind: notice.kind,
        bill,
        studentName: profile.data?.name ?? '',
        accountEmail: user.email,
        origin,
        owner,
        teacherNote: acknowledgement.data?.note,
      }),
      text: [
        'Anna Dance Academy',
        test ? 'SANDBOX — no real money. This notice is routed to the test inbox.' : '',
        request
          ? 'Your course bill is ready. Sign in with your registered account to review and pay.'
          : refund
            ? admin
              ? 'A student’s full refund has been confirmed by Stripe.'
              : 'Your full refund has been confirmed by Stripe.'
            : admin
              ? 'A student payment has been confirmed.'
              : 'Your payment has been confirmed.',
        `Student: ${profile.data?.name ?? ''}`,
        admin ? `Account email: ${user.email}` : '',
        `Bill: ${bill.bill_number}`,
        refund ? '' : summary,
        `${refund ? 'Refund amount' : 'Total'}: ${money(bill.amount_cents, bill.currency)}`,
        refund ? 'Destination: Original payment method.' : '',
        refund
          ? 'Your bank or payment provider may need additional time to show the refund. This confirmation does not mean it has already appeared on your statement.'
          : '',
        request && bill.due_date ? `Due date: ${bill.due_date}` : '',
        admin && !refund && acknowledgement.data?.note
          ? `Message for the teacher: ${acknowledgement.data.note}`
          : '',
        `${request ? 'Review and Pay' : 'View Payment Record'}: ${origin}${billPath(id)}`,
        admin ? `Admin record: ${origin}/admin/students/${owner}` : '',
        'For questions, call us at 701-400-9213.',
      ]
        .filter(Boolean)
        .join('\n\n'),
    }
    const claimed = await db.rpc('app_claim_billing_notice', {
      p_id: notice.id,
      p_payload: payload,
    })
    if (claimed.error || !claimed.data) {
      failed = true
      continue
    }
    const claim = claimed.data as Notice
    if (claim.status === 'sent') {
      sent++
      continue
    }
    if (claim.status === 'cancelled') continue
    if (claim.status !== 'sending' || !claim.claim_token || !claim.payload) {
      failed = true
      continue
    }
    let providerId: string | null = null
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        signal: AbortSignal.timeout(8000),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `billing-${notice.id}`,
        },
        body: JSON.stringify(claim.payload),
      })
      if (response.ok) {
        const result = await response.json()
        if (typeof result.id === 'string') providerId = result.id
      }
    } catch {
      /* Retry the same stored payload and idempotency key after an ambiguous response. */
    }
    const completion = await db
      .from('app_billing_notifications')
      .update({
        status: providerId ? 'sent' : 'failed',
        provider_id: providerId,
        sent_at: providerId ? new Date().toISOString() : null,
        error_code: providerId ? null : 'provider_error',
      })
      .eq('id', notice.id)
      .eq('claim_token', claim.claim_token)
      .select('id')
    if (!providerId || completion.error || !completion.data?.length) failed = true
    else sent++
  }
  if (failed)
    throw new Error(
      'Some emails are pending or need delivery review. The bill and payment status are saved. Retry from Admin; older attempts require provider review.',
    )
  return { sent }
}
