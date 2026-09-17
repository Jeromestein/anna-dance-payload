'use server'
import { revalidatePath } from 'next/cache'
import { requirePayloadAdministrator } from '@/lib/staff/auth'
import { createClient } from '@/lib/supabase/server'
import { stripeContext } from '@/lib/stripe/config'
import {
  refreshBill,
  requestFullRefund,
  startCheckout,
  stripeBillRPC,
  synchronizePayment,
  uuidPattern,
} from '@/lib/stripe/billing'
import { randomUUID } from 'node:crypto'

export type StripeActionState = { error?: string; success?: string; url?: string }
function values(form: FormData) {
  const owner = String(form.get('owner') ?? '')
  const id = String(form.get('id') ?? '')
  if (!uuidPattern.test(owner) || !uuidPattern.test(id))
    throw new Error('Invalid billing reference.')
  return { owner, id }
}
function refresh(owner: string) {
  revalidatePath('/account')
  revalidatePath(`/admin/students/${owner}`)
}
function safeError(error: unknown) {
  // Stripe/DB errors may contain payment data. Only expose our application errors.
  if (error instanceof Error && error.constructor === Error) return error.message
  return 'Stripe could not confirm the result. Refresh the payment status before trying again.'
}
export async function refundStripeBill(
  _previous: StripeActionState,
  form: FormData,
): Promise<StripeActionState> {
  const staff = await requirePayloadAdministrator()
  let owner = ''
  let id = ''
  try {
    ;({ owner, id } = values(form))
    const reason = String(form.get('reason') ?? '').trim()
    if (form.get('confirmed') !== 'yes' || !reason || reason.length > 500)
      return { error: 'Confirm the full refund and enter a reason.' }
    const result = await requestFullRefund(owner, id, String(staff.id), reason)
    refresh(owner)
    return { success: result.message }
  } catch (error) {
    if (owner && id) {
      await stripeBillRPC('sync_error', owner, id, {}).catch(() => {})
      refresh(owner)
    }
    return { error: safeError(error) }
  }
}
export async function reconcileStripeBill(
  _previous: StripeActionState,
  form: FormData,
): Promise<StripeActionState> {
  const staff = await requirePayloadAdministrator()
  try {
    const { owner, id } = values(form)
    await refreshBill(owner, id, String(staff.id))
    refresh(owner)
    return { success: 'Payment and refund status refreshed from Stripe.' }
  } catch (error) {
    return { error: safeError(error) }
  }
}
export async function importStripePayment(
  _previous: StripeActionState,
  form: FormData,
): Promise<StripeActionState> {
  const staff = await requirePayloadAdministrator()
  try {
    const owner = String(form.get('owner') ?? '')
    const pi = String(form.get('reference') ?? '').trim()
    const description = String(form.get('description') ?? '').trim()
    if (
      !uuidPattern.test(owner) ||
      form.get('confirmed') !== 'yes' ||
      !description ||
      description.length > 200
    )
      return { error: 'Confirm the student and enter an item description.' }
    const ctx = await stripeContext()
    await synchronizePayment(ctx, pi, { importOwner: owner, actor: String(staff.id), description })
    refresh(owner)
    return { success: 'Verified Stripe payment imported. No new charge was made.' }
  } catch (error) {
    return { error: safeError(error) }
  }
}
export async function createStripeTestBill(
  _previous: StripeActionState,
  form: FormData,
): Promise<StripeActionState> {
  const staff = await requirePayloadAdministrator()
  try {
    const owner = String(form.get('owner') ?? '')
    if (!uuidPattern.test(owner) || form.get('confirmed') !== 'yes')
      return { error: 'Confirm creation of a test bill.' }
    const ctx = await stripeContext()
    if (ctx.livemode) return { error: 'Test payments require Stripe test credentials.' }
    // The UI supplies one per-form UUID to make duplicate test-bill submissions
    // idempotent. It has no authority over owner, amount or environment.
    const supplied = String(form.get('id') ?? '')
    const id = uuidPattern.test(supplied) ? supplied : randomUUID()
    await stripeBillRPC('create_test', owner, id, {
      account: ctx.account,
      livemode: false,
      actor: String(staff.id),
    })
    refresh(owner)
    return { success: '$0.50 test bill created. Open it and choose Pay test bill.' }
  } catch (error) {
    return { error: safeError(error) }
  }
}
export async function checkoutStripeBill(
  _previous: StripeActionState,
  form: FormData,
): Promise<StripeActionState> {
  try {
    const id = String(form.get('id') ?? '')
    if (!uuidPattern.test(id)) return { error: 'Invalid bill.' }
    // Student checkout never accepts a browser-supplied owner. Staff may open a
    // test checkout on a selected student's behalf, never a live one.
    let owner: string
    if (form.get('staffTest') === 'yes') {
      await requirePayloadAdministrator()
      owner = String(form.get('owner') ?? '')
      const ctx = await stripeContext()
      if (ctx.livemode || !uuidPattern.test(owner))
        return { error: 'Staff checkout is only available in test mode.' }
    } else {
      const client = await createClient()
      const auth = await client.auth.getClaims()
      if (auth.error || !auth.data?.claims.sub) return { error: 'Sign in to pay your bill.' }
      owner = auth.data.claims.sub
    }
    const url = await startCheckout(owner, id)
    refresh(owner)
    return { url }
  } catch (error) {
    return { error: safeError(error) }
  }
}
