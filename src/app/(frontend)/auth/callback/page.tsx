'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSafeNextPath } from '@/lib/auth/redirects'

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null)
  const [nextPath, setNextPath] = useState('/account')

  useEffect(() => {
    let active = true

    async function finishConfirmation() {
      const currentUrl = new URL(window.location.href)
      const hashParams = new URLSearchParams(currentUrl.hash.slice(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      const code = currentUrl.searchParams.get('code')
      const providerError = currentUrl.searchParams.get('error_description')
      const safeNextPath = getSafeNextPath(currentUrl.searchParams.get('next'))
      setNextPath(safeNextPath)
      const supabase = createClient({ detectSessionInUrl: false })

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (!sessionError) {
          window.location.replace(safeNextPath)
          return
        }
      } else if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (!exchangeError) {
          window.location.replace(safeNextPath)
          return
        }
      } else {
        const { data } = await supabase.auth.getSession()

        if (data.session) {
          window.location.replace(safeNextPath)
          return
        }
      }

      if (active) {
        setError(
          providerError
            ? decodeURIComponent(providerError.replace(/\+/g, ' '))
            : 'We could not finish signing you in. Your email may already be confirmed, so try logging in with your email and password.',
        )
      }
    }

    void finishConfirmation()

    return () => {
      active = false
    }
  }, [])

  return (
    <section className="auth-section auth-callback-section section-space">
      <div className="page-shell auth-callback-layout">
        <article className="auth-card auth-callback-card" aria-live="polite">
          <p className="eyebrow">Student</p>
          <h1>{error ? 'We couldn’t finish signing you in.' : 'Signing you in…'}</h1>
          {error ? (
            <>
              <p className="auth-alert auth-alert-error" role="alert">
                {error}
              </p>
              <Link
                className="button auth-submit"
                href={`/login?next=${encodeURIComponent(nextPath)}`}
              >
                Go to login
              </Link>
            </>
          ) : (
            <p className="auth-card-copy">Please wait while we securely complete your sign-in.</p>
          )}
        </article>
      </div>
    </section>
  )
}
