'use server'

import { revalidatePath } from 'next/cache'
import { requirePayloadAdministrator } from '@/lib/staff/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { billPath, readItems } from '@/lib/billing/model'
import { stripeSettings } from '@/lib/stripe/config'

export type BillingActionState = { error?: string; success?: string; billId?: string }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function manageBill(
  _previous: BillingActionState,
  form: FormData,
): Promise<BillingActionState> {
  const staff = await requirePayloadAdministrator()
  const owner = String(form.get('owner') ?? '')
  const id = String(form.get('id') ?? '')
  const operation = String(form.get('operation') ?? '')
  if (!uuid.test(owner) || !uuid.test(id)) return { error: 'Invalid billing reference.' }
  if (!['issue', 'paid', 'refunded', 'cancelled'].includes(operation))
    return { error: 'Invalid operation.' }
  if (form.get('confirmed') !== 'yes')
    return { error: 'Confirm the billing details before saving.' }
  try {
    const items = operation === 'issue' ? readItems(form) : []
    const replaces = String(form.get('replaces') ?? '')
    if (replaces && (!uuid.test(replaces) || replaces === id))
      return { error: 'Invalid replacement bill.' }
    const due = String(form.get('due') ?? '')
    if (
      due &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(due) ||
        !Number.isFinite(Date.parse(due)) ||
        new Date(due).toISOString().slice(0, 10) !== due)
    )
      return { error: 'Enter a valid due date.' }
    const reference = String(form.get('reference') ?? '').trim()
    const reason = String(form.get('reason') ?? '').trim()
    if (['paid', 'refunded'].includes(operation) && (!reference || reference.length > 200))
      return { error: 'Enter the verified transaction reference.' }
    if (operation === 'refunded' && (!reason || reason.length > 500))
      return { error: 'Enter the refund reason.' }
    const args = {
      p_owner: owner,
      p_id: id,
      p_actor: String(staff.id),
      p_operation: operation,
      p_items: items,
      p_due: due || null,
      p_replaces: replaces || null,
      p_channel: String(form.get('channel') ?? '') || null,
      p_reference: reference || null,
      p_reason: reason || null,
    }
    const { error, data } =
      operation === 'issue'
        ? await createSupabaseAdminClient().rpc('app_issue_bill', {
            p_owner: owner,
            p_id: id,
            p_actor: String(staff.id),
            p_items: items,
            p_due: due || null,
            p_replaces: replaces || null,
            p_test_account: process.env.STRIPE_MODE === 'test' ? stripeSettings().account : null,
          })
        : await createSupabaseAdminClient().rpc('app_manage_bill', args)
    if (error || (operation === 'issue' && data !== id))
      return {
        error:
          'Could not save. Refresh to check whether this bill changed or the transaction was already recorded. Billing setup may be incomplete.',
      }
    revalidatePath('/account')
    revalidatePath(billPath(id))
    revalidatePath(`/admin/students/${owner}`)
    return {
      billId: operation === 'issue' ? id : undefined,
      success:
        operation === 'issue'
          ? 'Bill issued. Its charges are now locked.'
          : 'Verified billing record saved.',
    }
  } catch (error) {
    return {
      error:
        error instanceof Error &&
        operation === 'issue' &&
        /^(The bill total|Enter a course name|Enter a valid price|Check the item|Use a shorter|Add between)/.test(
          error.message,
        )
          ? error.message
          : 'Check your entries and try again. Billing may be unavailable.',
    }
  }
}
