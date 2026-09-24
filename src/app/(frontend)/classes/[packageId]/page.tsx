import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { coursePackage, packageCatalog } from '@/lib/billing/packages'
import { billPath, money } from '@/lib/billing/model'
import { stripeAvailability } from '@/lib/stripe/config'
import { PackagePurchase } from '@/components/package-purchase'
import styles from '@/components/billing.module.css'

export const metadata: Metadata = {
  title: 'Choose your course',
  robots: { index: false, follow: false },
}
export default async function PackagePage({ params }: { params: Promise<{ packageId: string }> }) {
  const { packageId } = await params
  const item = coursePackage(packageId)
  if (!item) notFound()
  const login = `/login?next=${encodeURIComponent(`/classes/${item.id}`)}`
  if (!isSupabaseConfigured()) redirect(login)
  const client = await createClient()
  const auth = await client.auth.getClaims()
  const owner = auth.data?.claims.sub
  if (auth.error || !owner) redirect(login)
  const availability = stripeAvailability()
  const [profile, existing] = await Promise.all([
    client.from('app_user_profiles').select('name').eq('id', owner).single(),
    client
      .from('app_payments')
      .select('id')
      .eq('user_profile_id', owner)
      .eq('package_id', item.id)
      .eq('package_catalog', packageCatalog)
      .eq('stripe_livemode', process.env.STRIPE_MODE !== 'test')
      .neq('status', 'cancelled')
      .maybeSingle(),
  ])
  // The saved quote, not today's list price, controls an existing purchase.
  if (!existing.error && existing.data) redirect(billPath(existing.data.id))
  return (
    <section className={styles.billPage}>
      <Link className={styles.billBack} href="/classes">
        ← Classes
      </Link>
      <article className={styles.billPageCard}>
        <header className={styles.billPageHeader}>
          <p className={styles.billEyebrow}>
            {process.env.STRIPE_MODE === 'test' ? 'SANDBOX · NO REAL MONEY' : 'FULL-TERM COURSE'}
          </p>
          <h1>{item.label}</h1>
          <p>
            For <strong>{profile.data?.name || 'your student account'}</strong>
          </p>
        </header>
        <div className={styles.body}>
          <p>
            {item.day} · {item.start}–{item.end}
          </p>
          <p>
            {item.lessons} lessons · {item.minutes} minutes each · One student
          </p>
          <p className={styles.issueTotal}>
            Full term <strong>{money(item.price, 'usd')}</strong>
          </p>
          <p>The academy will confirm the term dates and arrange your lessons.</p>
          {existing.error || profile.error ? (
            <p role="alert">
              Enrollment is temporarily unavailable. Please contact the academy or try again later.
            </p>
          ) : (
            <PackagePurchase packageId={item.id} online={availability.enabled} />
          )}
        </div>
      </article>
    </section>
  )
}
