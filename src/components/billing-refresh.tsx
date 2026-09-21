'use client'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import styles from './billing.module.css'

export function BillingRefresh() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <button
      className={styles.secondaryAction}
      disabled={pending}
      type="button"
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? 'Checking…' : 'Check payment status'}
    </button>
  )
}
