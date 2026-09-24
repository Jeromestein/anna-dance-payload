'use client'

import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function BillingPaymentStatus() {
  const router = useRouter()
  const [refreshing, startTransition] = useTransition()

  useEffect(() => {
    let attempts = 0
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return
      startTransition(() => router.refresh())
      if (++attempts >= 12) window.clearInterval(timer)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [router])

  return (
    <div>
      <p role="status">Payment is being verified. Please do not pay again.</p>
      <button
        type="button"
        disabled={refreshing}
        onClick={() => startTransition(() => router.refresh())}
      >
        {refreshing ? 'Checking…' : 'Check payment status'}
      </button>
    </div>
  )
}
