import 'server-only'
import { courseOptions } from './courses'
import type { BillItem } from './model'
import { stripeContext } from '@/lib/stripe/config'

export async function resolveCourseProducts(items: BillItem[]) {
  const ctx = await stripeContext()
  const resolved = await Promise.all(
    items.map(async (item) => {
      const course = courseOptions.find((c) => c.key === item.course_key)
      const id =
        course &&
        process.env[`STRIPE_${ctx.mode.toUpperCase()}_PRODUCT_${course.key.toUpperCase()}`]?.trim()
      if (!id || !/^prod_[A-Za-z0-9]+$/.test(id))
        throw new Error('Course products are not configured for this payment environment.')
      const product = await ctx.stripe.products.retrieve(id)
      if ('deleted' in product || !product.active || product.livemode !== ctx.livemode)
        throw new Error('The selected course product is unavailable in this payment environment.')
      return { ...item, stripe_product_id: id }
    }),
  )
  if (new Set(resolved.map((i) => i.stripe_product_id)).size !== resolved.length)
    throw new Error('Each course must have its own Stripe product.')
  return { items: resolved, account: ctx.account, live: ctx.livemode }
}
