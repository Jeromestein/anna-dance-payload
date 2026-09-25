'use client'

import { useActionState, useState } from 'react'
import { cancelPackagePurchase } from '@/actions/course-package'
import styles from './billing.module.css'

export function PackageCancel({ id }: { id: string }) {
  const [reviewing, setReviewing] = useState(false)
  const [state, action, pending] = useActionState(cancelPackagePurchase, {})

  if (!reviewing)
    return (
      <button
        type="button"
        className={`${styles.secondaryAction} ${styles.cancelAction}`}
        onClick={() => setReviewing(true)}
      >
        Cancel order
      </button>
    )

  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="confirmed" value="yes" />
      <p>
        Cancel this unpaid course order? Its payment link and any agreed price will no longer apply.
        You can choose a course again from Classes.
      </p>
      <button className={styles.cancelAction} disabled={pending}>
        {pending ? 'Cancelling…' : 'Confirm cancellation'}
      </button>
      <button type="button" disabled={pending} onClick={() => setReviewing(false)}>
        Keep order
      </button>
      {state.error && <p role="alert">{state.error}</p>}
    </form>
  )
}
