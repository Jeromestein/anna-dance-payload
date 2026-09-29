import 'server-only'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { coursePackage, packageCatalog, packageItem } from './packages'
import { websiteTermsVersion } from './terms'

export async function issuePackage(input: {
  owner: string
  id: string
  actor: string
  packageId: string
  cash?: boolean
  admin?: boolean
  acceptedTerms?: boolean
  amount?: number
  due?: string | null
}) {
  const item = coursePackage(input.packageId)
  if (!item) throw new Error('Choose a course package.')
  if (input.acceptedTerms && (input.admin || input.actor !== input.owner))
    throw new Error('Only a student can accept their own course terms.')
  const { data, error } = await createSupabaseAdminClient().rpc(
    input.acceptedTerms ? 'app_purchase_package_with_terms' : 'app_purchase_package',
    {
      p_owner: input.owner,
      p_id: input.id,
      p_actor: input.actor,
      p_package: item.id,
      p_catalog: packageCatalog,
      p_snapshot: item,
      p_item: packageItem(item),
      p_total: input.admin ? input.amount : item.price,
      p_live: process.env.STRIPE_MODE !== 'test',
      p_cash: Boolean(input.cash),
      ...(input.acceptedTerms
        ? { p_terms: websiteTermsVersion }
        : { p_admin: Boolean(input.admin), p_due: input.due ?? null }),
    },
  )
  if (error || typeof data !== 'string')
    throw new Error(
      'Could not create the package bill. Check existing bills before trying again. A different price requires cancelling the unpaid bill first.',
    )
  return data
}
