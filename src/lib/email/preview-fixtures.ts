import type { Bill } from '@/lib/billing/model'
import { renderBillingEmail, renderContactEmail, renderRegistrationEmail } from './templates'

// Fictional data only. These previews never read accounts or send messages.
export const emailPreviewNames = [
  'contact',
  'registration',
  'request',
  'paid_customer',
  'paid_admin',
  'refunded_customer',
  'refunded_admin',
] as const
export type EmailPreviewName = (typeof emailPreviewNames)[number]

export async function renderEmailPreview(name: EmailPreviewName) {
  const origin = 'https://www.annadanceacademy.com'
  if (name === 'contact')
    return renderContactEmail({
      name: 'Sophie Chen',
      email: 'sophie@example.com',
      age: '8',
      interest: 'Ballet',
      message:
        'Hello! My daughter Emma would love to try ballet.\nCould you share the available class times and help us find the right class for her?\n\nThank you,\nSophie',
    })
  if (name === 'registration')
    return renderRegistrationEmail({
      studentName: 'Emma Chen',
      email: 'sophie@example.com',
      studentPhone: 'Not provided',
      guardianName: 'Sophie Chen',
      guardianPhone: '(813) 555-0100',
      registeredAt: '2026-09-21T16:30:00Z',
      adminLink: `${origin}/admin/students/preview-student`,
    })
  const bill: Bill = {
    id: 'preview-bill',
    bill_number: 'ADA-2026-0108',
    amount_cents: 24000,
    currency: 'usd',
    status: name === 'request' ? 'payment_due' : name.startsWith('refunded') ? 'refunded' : 'paid',
    paid_amount_cents: name === 'request' ? null : 24000,
    due_date: '2026-10-01',
    created_at: '2026-09-21T16:30:00Z',
    paid_at: '2026-09-21T17:00:00Z',
    refunded_at: '2026-09-21T18:00:00Z',
    refund_reference: 're_preview_refund',
    refund_reason: null,
    payment_channel: 'stripe',
    transaction_reference: 'pi_preview_payment',
    replaces_payment_id: null,
    stripe_livemode: true,
    app_payment_items: [
      {
        description: 'Ballet Foundations · October classes',
        quantity: 4,
        unit_amount_cents: 4500,
        position: 0,
      },
      {
        description: 'Private coaching session',
        quantity: 1,
        unit_amount_cents: 6000,
        position: 1,
      },
    ],
  }
  return renderBillingEmail({
    kind: name,
    bill,
    studentName: 'Emma Chen',
    accountEmail: 'sophie@example.com',
    origin,
    owner: 'preview-student',
    teacherNote: 'Emma is looking forward to her Saturday classes. Thank you!',
  })
}
