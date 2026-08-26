import React from 'react'
import { Poppins } from 'next/font/google'
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

  return (
    <html lang="en">
      <body className={poppins.variable}>
        <main>{children}</main>
      </body>
    </html>
  )
}
