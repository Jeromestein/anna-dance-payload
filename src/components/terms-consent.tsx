'use client'

import Link from 'next/link'
import styles from './terms-consent.module.css'

type TermsConsentProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  form?: string
}

export function TermsConsent({ checked, onChange, form }: TermsConsentProps) {
  return (
    <label className={styles.consent}>
      <input
        type="checkbox"
        name="termsAccepted"
        value="yes"
        form={form}
        required
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        I have read and agree to the{' '}
        <Link href="/terms" target="_blank" rel="noopener noreferrer">
          Website Terms of Use
        </Link>{' '}
        (required). <span className={styles.hint}>Opens in a new tab.</span>
      </span>
    </label>
  )
}
