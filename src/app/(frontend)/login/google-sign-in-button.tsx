'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function GoogleSignInButton({ nextPath = '/account' }: { nextPath?: string }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function signInWithGoogle() {
    setPending(true)
    setError(null)

    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    })

    if (oauthError) {
      setPending(false)
      setError('We could not start Google sign-in. Please try again.')
    }
  }

  return (
    <div className="auth-google-section">
      <button
        className="auth-google-button"
        type="button"
        onClick={signInWithGoogle}
        disabled={pending}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.02v2.53h3.24c1.9-1.75 2.98-4.33 2.98-7.39Z"
          />
          <path
            fill="#34A853"
            d="M12 22c2.7 0 4.98-.9 6.63-2.38l-3.25-2.53c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.61A10 10 0 0 0 12 22Z"
          />
          <path
            fill="#FBBC05"
            d="M6.39 13.92A6.02 6.02 0 0 1 6.07 12c0-.67.12-1.32.32-1.92V7.47H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.53l3.35-2.61Z"
          />
          <path
            fill="#EA4335"
            d="M12 5.95c1.47 0 2.78.5 3.82 1.49l2.88-2.88A9.66 9.66 0 0 0 12 2a10 10 0 0 0-8.96 5.47l3.35 2.61C7.18 7.71 9.39 5.95 12 5.95Z"
          />
        </svg>
        <span>{pending ? 'Opening Google…' : 'Continue with Google'}</span>
      </button>
      {error && (
        <p className="auth-google-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
