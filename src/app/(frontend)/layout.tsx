import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import { FloatingBookingButton } from '@/components/floating-booking-button'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { isSupabaseConfigured } from '@/lib/supabase/config'
import { createClient } from '@/lib/supabase/server'
import { getSocialProfiles } from '@/lib/social'
import { isPayloadAdministrator } from '@/lib/staff/auth'

import './globals.css'
import './footer.css'
import './styles.css'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: { default: 'Anna Dance Academy', template: '%s | Anna Dance Academy' },
  description:
    'Personalized, bilingual Chinese dance training for young dancers ages 2½ and up in Lutz, Florida.',
  icons: {
    icon: '/images/branding/anna-dance-academy-mark.png',
    apple: '/images/branding/anna-dance-academy-mark.png',
  },
}

async function getStudentAccountAccess() {
  if (!isSupabaseConfigured()) return false

  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()

    return Boolean(data?.claims?.sub)
  } catch {
    return false
  }
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [isAuthenticated, isAdmin, socialProfiles] = await Promise.all([
    getStudentAccountAccess(),
    isPayloadAdministrator(),
    getSocialProfiles(),
  ])

  return (
    <html lang="en">
      <body className={poppins.variable}>
        <SiteHeader isAdmin={isAdmin} isAuthenticated={isAuthenticated} />
        <main>{children}</main>
        <SiteFooter socialProfiles={socialProfiles?.showInFooter ? socialProfiles : null} />
        <FloatingBookingButton />
      </body>
    </html>
  )
}
