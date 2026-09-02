'use client'

import { useRef, useState, type ReactNode } from 'react'

import styles from './student-account-dashboard.module.css'

type AccountTabId = 'overview' | 'payments' | 'schedule' | 'profile'

type MobileAccountTabsProps = {
  children: ReactNode
}

const tabs: Array<{ id: AccountTabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'payments', label: 'Payments' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'profile', label: 'Profile' },
]

function TabIcon({ tab }: { tab: AccountTabId }) {
  if (tab === 'overview') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </svg>
    )
  }

  if (tab === 'payments') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <rect x="2.5" y="5" width="19" height="14" rx="3" />
        <path d="M2.5 10h19" />
        <path d="M7 15h3" />
      </svg>
    )
  }

  if (tab === 'schedule') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M8 3v4M16 3v4M3 10h18" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </svg>
  )
}

export function MobileAccountTabs({ children }: MobileAccountTabsProps) {
  const [activeTab, setActiveTab] = useState<AccountTabId>('overview')
  const contentRef = useRef<HTMLDivElement>(null)

  function selectTab(tab: AccountTabId) {
    setActiveTab(tab)
    window.requestAnimationFrame(() => {
      contentRef.current?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      })
    })
  }

  return (
    <div className={styles.tabShell} data-active-tab={activeTab}>
      <div className={styles.tabContent} ref={contentRef}>
        {children}
      </div>

      <nav className={styles.mobileTabBar} aria-label="My Account sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? styles.mobileTabActive : undefined}
            aria-controls={tab.id}
            aria-pressed={activeTab === tab.id}
            onClick={() => selectTab(tab.id)}
          >
            <TabIcon tab={tab.id} />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
