'use client'
import Link from 'next/link'
import { useActionState } from 'react'
import { purchasePackage, changePackagePaymentMethod } from '@/actions/course-package'
import styles from './billing.module.css'

export function PackagePurchase({ packageId, online }: { packageId: string; online: boolean }) {
  const [state, action, pending] = useActionState(purchasePackage, {})
  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="package_id" value={packageId} />
      <label className={styles.confirm}>
        <input type="checkbox" name="confirmed" value="yes" required />I confirm this full-term
        package is for my student account and agree to the <Link href="/terms">website terms</Link>.
      </label>
      <button name="method" value="online" disabled={pending || !online}>
        {pending ? 'Preparing…' : 'Pay Online'}
      </button>
      <button name="method" value="cash" disabled={pending}>
        Pay in Cash
      </button>
      {!online && (
        <p>
          Online payment is currently unavailable. You can arrange cash payment with the academy.
        </p>
      )}
      <p>Cash is settled at the academy. Lessons become available after payment is confirmed.</p>
      {state.error && <p role="alert">{state.error}</p>}
    </form>
  )
}

export function PackagePaymentMethod({ id, cash }: { id: string; cash: boolean }) {
  const [state, action, pending] = useActionState(changePackagePaymentMethod, {})
  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="method" value={cash ? 'online' : 'cash'} />
      {cash && (
        <p role="status">
          Cash payment selected. Please pay at the academy and provide your bill number. Your
          lessons will be available after staff confirms receipt.
        </p>
      )}
      <button disabled={pending}>
        {pending ? 'Saving…' : cash ? 'Switch to Online Payment' : 'Pay in Cash'}
      </button>
      {state.error && <p role="alert">{state.error}</p>}
    </form>
  )
}
