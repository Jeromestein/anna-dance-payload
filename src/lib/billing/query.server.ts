import 'server-only'
import { billSelect } from './model'

// During rollout, keep historical billing readable until the additive package
// migration is applied. Never fall back on permission, connection or other errors.
export async function queryBilling<T extends { error: { code?: string; message?: string } | null }>(
  query: (columns: string) => PromiseLike<T>,
): Promise<T> {
  let columns = billSelect
  let result = await query(columns)
  for (let attempt = 0; attempt < 2 && result.error?.code === '42703'; attempt++) {
    const missing = result.error.message ?? ''
    if (/card_surcharge_cents|card_payment_kind/.test(missing))
      columns = columns.replace('card_surcharge_cents,card_payment_kind,', '')
    else if (/package_id|package_catalog|payment_preference/.test(missing))
      columns = columns.replace('package_id,package_catalog,payment_preference,', '')
    else break
    result = await query(columns)
  }
  return result
}
