'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { BrandLogo } from '@/components/brand-logo'
import { navigation } from '@/lib/site-data'

type SiteHeaderProps = {
  isAuthenticated: boolean
}

export function SiteHeader({ isAuthenticated }: SiteHeaderProps) {
  const pathname = usePathname()

  return <SiteHeaderContent key={pathname} isAuthenticated={isAuthenticated} pathname={pathname} />
}

function SiteHeaderContent({ isAuthenticated, pathname }: SiteHeaderProps & { pathname: string }) {
  const [open, setOpen] = useState(false)

  return (
    <header className="site-header">
      <div className="nav-shell">
        <Link href="/" className="wordmark" aria-label="Anna Dance Academy home">
          <BrandLogo />
        </Link>

        <nav className="desktop-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? 'active' : ''}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <Link href={isAuthenticated ? '/account' : '/login'} className="header-account-link">
            {isAuthenticated ? 'My Account' : 'Log in'}
          </Link>
          <Link href="/schedule" className="button button-small desktop-cta">
            Schedule
          </Link>
        </div>

        <button
          className="menu-button"
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span />
          <span />
        </button>
      </div>

      {open && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {navigation.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          <Link href={isAuthenticated ? '/account' : '/login'}>
            {isAuthenticated ? 'My Account' : 'Log in'}
          </Link>
          <Link href="/schedule" className="button">
            Schedule
          </Link>
        </nav>
      )}
    </header>
  )
}
