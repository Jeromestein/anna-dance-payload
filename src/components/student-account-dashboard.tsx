import type { EditableStudentProfile } from '@/components/student-profile-form'
import { MobileAccountTabs } from '@/components/mobile-account-tabs'
import { StudentScheduleCalendar } from '@/components/student-schedule-calendar'
import { StudentProfileForm } from '@/components/student-profile-form'
import { BillingRecords } from '@/components/billing-records'
import { billingSummary, type Bill } from '@/lib/billing/model'
import { type AccountScheduleEntry, formatScheduleEntry } from '@/lib/account/schedule'

import styles from './student-account-dashboard.module.css'

type StudentAccountDashboardProps = {
  bills: Bill[]
  billingUnavailable: boolean
  profile: EditableStudentProfile
  scheduleEntries: AccountScheduleEntry[]
  scheduleLoadError?: boolean
  error?: string
  message?: string
  profileLoadError?: boolean
}

export function StudentAccountDashboard({
  bills,
  billingUnavailable,
  profile,
  scheduleEntries,
  scheduleLoadError = false,
  error,
  message,
  profileLoadError = false,
}: StudentAccountDashboardProps) {
  const nextEntry = scheduleEntries.find((entry) => entry.status !== 'cancelled')
  const nextEntryDisplay = nextEntry ? formatScheduleEntry(nextEntry) : null

  return (
    <section className={`${styles.section} account-page`}>
      <div className={styles.layout}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Student</p>
            <h1>My Account</h1>
            <p className={styles.headerCopy}>
              Welcome back, {profile.name}. Review your billing, schedule, and profile.
            </p>
          </div>
        </header>

        <nav className={styles.sectionNav} aria-label="My Account sections">
          <a href="#overview">Overview</a>
          <a href="#payments">Billing</a>
          <a href="#schedule">Schedule</a>
          <a href="#profile">Profile</a>
        </nav>

        <MobileAccountTabs>
          <div className={styles.summaryGrid} id="overview" data-account-tab="overview">
            <article className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Next appointment</span>
              <strong>{nextEntry?.title ?? 'No upcoming appointment'}</strong>
              <p>
                {nextEntryDisplay
                  ? `${nextEntryDisplay.date} · ${nextEntryDisplay.time}`
                  : 'Book a consultation when you are ready.'}
              </p>
            </article>
            <article className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Billing</span>
              <strong>{billingSummary(bills, billingUnavailable)}</strong>
              <p>View itemized charges and verified payment records.</p>
            </article>
          </div>

          <div className={styles.contentGrid}>
            <article
              className={`${styles.panel} ${styles.paymentPanel}`}
              id="payments"
              data-account-tab="payments"
            >
              <header className={styles.panelHeader}>
                <div>
                  <h2>Billing</h2>
                  <p>Your charges, payments, and full refunds.</p>
                </div>
              </header>
              <BillingRecords bills={bills} unavailable={billingUnavailable} />
            </article>

            <article className={styles.panel} id="schedule" data-account-tab="schedule">
              <header className={styles.panelHeader}>
                <div>
                  <h2>My schedule</h2>
                  <p>Academy classes and linked Cal.com appointments.</p>
                </div>
              </header>

              <StudentScheduleCalendar entries={scheduleEntries} loadError={scheduleLoadError} />
            </article>

            <div className={styles.profilePanel} data-account-tab="profile">
              <StudentProfileForm
                profile={profile}
                error={error}
                message={message}
                profileLoadError={profileLoadError}
                embedded
              />
            </div>
          </div>
        </MobileAccountTabs>
      </div>
    </section>
  )
}
