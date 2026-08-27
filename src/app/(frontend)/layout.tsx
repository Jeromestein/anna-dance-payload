import React from 'react'
import { Poppins } from 'next/font/google'

import { SocialFollow } from '@/components/SocialFollow'
import { getSocialProfiles } from '@/lib/social'

import './styles.css'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-sans',
})

export const metadata = {
  description: 'Isolated Payload CMS proof of concept for Anna Dance Academy.',
  title: 'Anna Dance CMS POC',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props
  const socialProfiles = await getSocialProfiles()

  return (
    <html lang="en">
      <body className={poppins.variable}>
        <main>{children}</main>
        {socialProfiles?.showInFooter ? (
          <footer className="siteFooter">
            <div className="siteFooterInner">
              <div className="footerIdentity">
                <p>Anna Dance Academy</p>
                <span>Teaching, performance, and community.</span>
              </div>
              <SocialFollow profiles={socialProfiles} variant="footer" />
            </div>
          </footer>
        ) : null}
      </body>
    </html>
  )
}
