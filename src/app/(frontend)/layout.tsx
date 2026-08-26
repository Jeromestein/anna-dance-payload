import React from 'react'
import './styles.css'

export const metadata = {
  description: 'Isolated Payload CMS proof of concept for Anna Dance Academy.',
  title: 'Anna Dance CMS POC',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
