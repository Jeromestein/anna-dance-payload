'use server'
import { randomUUID } from 'node:crypto'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { releasePackageCheckout } from '@/lib/billing/package-payment.server'
import { issuePackage } from '@/lib/billing/package-sales.server'
import { billPath } from '@/lib/billing/model'
import { uuidPattern } from '@/lib/stripe/billing'

export type PackageActionState = { error?: string }
export async function cancelPackagePurchase(
  _previous: PackageActionState,
  form: FormData,
): Promise<PackageActionState> {
  const client = await createClient()
  const auth = await client.auth.getClaims()
  const owner = auth.data?.claims.sub
  if (auth.error || !owner) return { error: 'Please sign in.' }
  const id = String(form.get('id') ?? '')
  if (!uuidPattern.test(id) || form.get('confirmed') !== 'yes')
    return { error: 'Confirm the order you want to cancel.' }
  try {
    // Reconcile/expire Checkout before the locked database cancellation. A paid
    // or concurrently reserved order must never be cancelled from this form.
    await releasePackageCheckout(owner, id)
    const { error } = await createSupabaseAdminClient().rpc('app_cancel_package', {
      p_owner: owner,
      p_id: id,
      p_actor: owner,
    })
    if (error) throw new Error('Cancellation rejected')
  } catch {
    revalidatePath(billPath(id))
    revalidatePath('/account')
    return {
      error:
        'This order could not be cancelled. Payment may already be processing or confirmed. Check its status or contact the academy.',
    }
  }
  revalidatePath(billPath(id))
  revalidatePath('/account')
  revalidatePath('/classes/[packageId]', 'page')
  revalidatePath(`/admin/students/${owner}`)
  return {}
}

export async function purchasePackage(
  _previous: PackageActionState,
  form: FormData,
): Promise<PackageActionState> {
  const client = await createClient()
  const auth = await client.auth.getClaims()
  const owner = auth.data?.claims.sub
  if (auth.error || !owner) return { error: 'Please sign in before choosing a course.' }
  const method = form.get('method')
  if (!['online', 'cash'].includes(String(method)) || form.get('confirmed') !== 'yes')
    return { error: 'Confirm the course and payment details.' }
  let id: string
  try {
    id = await issuePackage({
      owner,
      id: randomUUID(),
      actor: owner,
      packageId: String(form.get('package_id') ?? ''),
      cash: method === 'cash',
    })
  } catch {
    return { error: 'We could not prepare your bill. Please try again or contact the academy.' }
  }
  revalidatePath('/account')
  redirect(billPath(id))
}
export async function changePackagePaymentMethod(
  _previous: PackageActionState,
  form: FormData,
): Promise<PackageActionState> {
  const client = await createClient()
  const auth = await client.auth.getClaims()
  const owner = auth.data?.claims.sub
  if (auth.error || !owner) return { error: 'Please sign in.' }
  const id = String(form.get('id') ?? '')
  if (!uuidPattern.test(id) || !['online', 'cash'].includes(String(form.get('method'))))
    return { error: 'Invalid payment choice.' }
  try {
    await releasePackageCheckout(owner, id)
  } catch {
    return {
      error:
        'We could not close the existing online payment. Refresh the bill or contact the academy before paying again.',
    }
  }
  const { error } = await createSupabaseAdminClient().rpc('app_package_payment_method', {
    p_owner: owner,
    p_id: id,
    p_cash: form.get('method') === 'cash',
  })
  if (error)
    return {
      error:
        'An online payment may already be underway. Contact the academy to change the payment method; please do not pay twice.',
    }
  revalidatePath(billPath(id))
  revalidatePath('/account')
  return {}
}
