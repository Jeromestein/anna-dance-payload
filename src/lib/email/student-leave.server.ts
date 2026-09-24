import 'server-only'
import { leaveDateLabel } from '@/lib/leave/model'
import type { LeaveEmailPayload, LeaveReceipt } from '@/lib/leave/receipt.server'

export function leaveEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESEND_FROM_EMAIL?.trim()
  const admin =
    process.env.LEAVE_NOTIFICATION_TO?.trim() ||
    process.env.STUDENT_REGISTRATION_NOTIFICATION_TO?.trim() ||
    process.env.CONTACT_TO_EMAIL?.trim() ||
    'annadanceacademy@gmail.com'
  if (!apiKey || !from || !process.env.PAYLOAD_SECRET)
    throw new Error('Leave notifications are not configured.')
  return { apiKey, from, admin }
}
function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  )
}
export function leaveEmailPayloads(input: {
  name: string
  email: string
  reason: string
  submittedAt: string
  remaining: number
}): [LeaveEmailPayload, LeaveEmailPayload] {
  const config = leaveEmailConfig()
  const studentName = input.name.replace(/\s+/g, ' ').trim()
  return [input.email, config.admin].map((to, index) => {
    const text = [
      'Anna Dance Academy',
      index ? 'A student has submitted a leave request.' : 'Your leave request has been recorded.',
      `Student: ${input.name}`,
      `Account: ${input.email}`,
      `Submitted: ${leaveDateLabel(input.submittedAt)}`,
      `Requests remaining this period: ${input.remaining} of 2`,
      'Leave request:',
      input.reason,
      'Please coordinate any schedule or makeup arrangements with the Academy.',
    ].join('\n\n')
    return {
      from: config.from,
      to: [to],
      subject: index
        ? `Student Leave Request — ${studentName} · Anna Dance Academy`
        : `Leave Request Recorded — ${studentName} · Anna Dance Academy`,
      text,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:28px;color:#063b4a"><h1 style="font-size:24px">Anna Dance Academy</h1><div style="white-space:pre-wrap;line-height:1.7">${escapeHtml(text)}</div></div>`,
    }
  }) as [LeaveEmailPayload, LeaveEmailPayload]
}

// The signed receipt keeps the exact payload in the user's current form state.
// Retries reuse Resend's idempotency key without storing request text in our database.
export async function sendLeaveEmails(receipt: LeaveReceipt): Promise<boolean> {
  const { apiKey } = leaveEmailConfig()
  const results = await Promise.all(
    receipt.emails.map(async (payload, index) => {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          signal: AbortSignal.timeout(8000),
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': `leave-${receipt.owner}-${receipt.submittedAt}-${index}`,
          },
          body: JSON.stringify(payload),
        })
        if (!response.ok) return false
        const result = await response.json()
        return typeof result.id === 'string'
      } catch {
        return false
      }
    }),
  )
  return results.every(Boolean)
}
