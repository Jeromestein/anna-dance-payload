'use server'

import { releasePackageCheckout } from '@/lib/billing/package-payment.server'
import { issuePackage } from '@/lib/billing/package-sales.server'
import { revalidatePath } from 'next/cache'
import { requirePayloadAdministrator } from '@/lib/staff/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { billPath, readItems, readAgreedTotal } from '@/lib/billing/model'
import { stripeContext, stripeSettings } from '@/lib/stripe/config'

export type BillingActionState = {
  error?: string
  success?: string
  billId?: string
  requestId?: string
}
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
    if (operation === 'issue' && form.get('bill_kind') === 'package') {
      const billId = await issuePackage({
        owner,
        id,
        actor: String(staff.id),
        packageId: String(form.get('package_id') ?? ''),
        admin: true,
        amount: readAgreedTotal(form),
        due: due || null,
      })
      revalidatePath('/account')
      revalidatePath(billPath(billId))
      revalidatePath(`/admin/students/${owner}`)
      return { billId, requestId: id, success: 'Package payment request saved.' }
    }
    if (operation === 'cancelled' && form.get('package_bill') === 'yes') {
      await releasePackageCheckout(owner, id)
      const result = await createSupabaseAdminClient().rpc('app_cancel_package', {
        p_owner: owner,
        p_id: id,
        p_actor: String(staff.id),
      })
      if (result.error)
        return {
          error: 'This bill may have an active online payment. Reconcile it before cancellation.',
        }
      revalidatePath('/account')
      revalidatePath(billPath(id))
      revalidatePath(`/admin/students/${owner}`)
      return { success: 'Unpaid package bill cancelled.' }
    }
    const courses =
      operation === 'issue' && form.get('bill_kind') === 'courses' ? await stripeContext() : null
    const { error, data } = courses
      ? await createSupabaseAdminClient().rpc('app_issue_course_bill', {
          p_owner: owner,
          p_id: id,
          p_actor: String(staff.id),
          p_items: items.map((item) => ({ ...item, stripe_product_id: null })),
          p_total: readAgreedTotal(form),
          p_due: due || null,
          p_replaces: replaces || null,
          p_account: courses.account,
          p_live: courses.livemode,
        })
      : operation === 'issue'
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
      requestId: id,
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
        /^(Could not create the package bill|The bill total|Enter a whole number|Enter at least one lesson|Enter a fee name|Enter a course name|Enter a valid price|Check the item|Use a shorter|Add between|Choose )/.test(
          error.message,
        )
          ? error.message
          : 'Check your entries and try again. Billing may be unavailable.',
    }
  }
}
