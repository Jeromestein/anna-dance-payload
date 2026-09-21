'use server'

import { revalidatePath } from 'next/cache'
import { requirePayloadAdministrator } from '@/lib/staff/auth'
import { loadBill } from '@/lib/billing/load'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { billingNotices } from '@/lib/email/billing-notifications.server'
import { uuidPattern } from '@/lib/stripe/billing'

export type BillingEmailState = { error?: string; success?: string }

export async function sendBillingEmail(
  _previous: BillingEmailState,
  form: FormData,
): Promise<BillingEmailState> {
  await requirePayloadAdministrator()
  const owner = String(form.get('owner') ?? '')
  const id = String(form.get('id') ?? '')
  if (!uuidPattern.test(owner) || !uuidPattern.test(id))
    return { error: 'Invalid billing reference.' }
  try {
    const { bill } = await loadBill(createSupabaseAdminClient(), owner, id)
    if (!bill) return { error: 'Bill not found.' }
    if (bill.status === 'payment_due' && !bill.checkout_available)
      return { error: 'Enable online payment for this bill before sending a payment request.' }
    const result = await billingNotices(owner, id, bill.status === 'payment_due')
    revalidatePath(`/admin/students/${owner}`)
    return {
      success: result.sent
        ? 'Email accepted by the provider. Previously sent notices were not duplicated.'
        : 'No pending billing emails for this bill.',
    }
  } catch (error) {
    revalidatePath(`/admin/students/${owner}`)
    return {
      error:
        error instanceof Error && error.constructor === Error
          ? error.message
          : 'Email could not be sent. The bill is saved; try again after checking email setup.',
    }
  }
}
