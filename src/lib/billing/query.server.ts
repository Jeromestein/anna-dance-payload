import 'server-only'
import { billSelect } from './model'

// During rollout, keep historical billing readable until the additive package
// migration is applied. Never fall back on permission, connection or other errors.
export async function queryBilling<T extends { error: { code?: string; message?: string } | null }>(
  query: (columns: string) => PromiseLike<T>,
): Promise<T> {
  const result = await query(billSelect)
  if (
    result.error?.code === '42703' &&
    /package_id|package_catalog|payment_preference/.test(result.error.message ?? '')
  ) {
    return query(billSelect.replace('package_id,package_catalog,payment_preference,', ''))
  }
  return result
}
