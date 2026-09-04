import Link from 'next/link'

import type { EditableStudentProfile } from '@/components/student-profile-form'
import { MobileAccountTabs } from '@/components/mobile-account-tabs'
import { StudentProfileForm } from '@/components/student-profile-form'
import type { MockStudentAccount } from '@/lib/account/mock-student-account'
import {
  type AccountScheduleEntry,
  formatScheduleEntry,
  getScheduleSourceLabel,
  getScheduleStatusLabel,
} from '@/lib/account/schedule'

import styles from './student-account-dashboard.module.css'

type StudentAccountDashboardProps = {
  account: MockStudentAccount
  profile: EditableStudentProfile
  scheduleEntries: AccountScheduleEntry[]
  scheduleLoadError?: boolean
  error?: string
  message?: string
  profileLoadError?: boolean
}

export function StudentAccountDashboard({
  account,
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
              Welcome back, {profile.name}. Review your semester, payments, schedule, and profile.
            </p>
          </div>
          <span className={styles.termPill}>{account.term.name}</span>
        </header>

        <p className={styles.previewNotice} role="status">
          <strong>Sample data</strong>
          Semester and payment details are still a preview. Appointments below use synchronized
          schedule records.
        </p>

        <nav className={styles.sectionNav} aria-label="My Account sections">
          <a href="#overview">Overview</a>
          <a href="#payments">Payments</a>
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
              <span className={styles.summaryLabel}>Payment</span>
              <strong className={styles.paymentStatus}>{account.payment.status}</strong>
              <p>{account.payment.amount} sample tuition</p>
            </article>
            <article className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Current term</span>
              <strong>{account.term.program}</strong>
              <p>{account.term.lessonCount} scheduled lessons</p>
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
                  <h2>Payment</h2>
                  <p>One full-semester payment.</p>
                </div>
                <span className={styles.sampleTag}>Sample</span>
              </header>
              <div className={styles.paymentAmount}>
                <span>Amount due</span>
                <strong>{account.payment.amount}</strong>
              </div>
              <dl className={styles.detailList}>
                <div>
                  <dt>Status</dt>
                  <dd className={styles.paymentStatus}>{account.payment.status}</dd>
                </div>
                <div>
                  <dt>Due date</dt>
                  <dd>{account.payment.dueDate}</dd>
                </div>
                <div>
                  <dt>Paid</dt>
                  <dd>{account.payment.paidAmount}</dd>
                </div>
              </dl>
              <button className={styles.disabledButton} type="button" disabled>
                Pay with Stripe — preview only
              </button>
              <p className={styles.buttonNote}>This preview cannot collect a payment.</p>
            </article>

            <article className={styles.panel} id="schedule" data-account-tab="schedule">
              <header className={styles.panelHeader}>
                <div>
                  <h2>My schedule</h2>
                  <p>Academy classes and linked Cal.com appointments.</p>
                </div>
              </header>

              <div className={styles.scheduleBody}>
                <div className={styles.eventList} aria-label="Upcoming schedule">
                  {scheduleLoadError && (
                    <p className={styles.scheduleMessage} role="alert">
                      We could not refresh your appointments. Please try again shortly.
                    </p>
                  )}
                  {!scheduleLoadError && scheduleEntries.length === 0 && (
                    <div className={styles.emptySchedule}>
                      <strong>No upcoming appointments</strong>
                      <p>Your linked consultations and lessons will appear here.</p>
                      <Link className="button button-secondary" href="/schedule#book">
                        Book a consultation
                      </Link>
                    </div>
                  )}
                  {scheduleEntries.map((entry) => {
                    const display = formatScheduleEntry(entry)

                    return (
                      <article className={styles.event} key={entry.id}>
                        <time className={styles.eventDate} dateTime={entry.startsAt}>
                          <span>{display.month}</span>
                          <strong>{display.day}</strong>
                        </time>
                        <div className={styles.eventInfo}>
                          <strong>{entry.title}</strong>
                          <span>
                            {display.time} · {entry.location || 'Location to be confirmed'}
                          </span>
                          <small>{getScheduleStatusLabel(entry)}</small>
                        </div>
                        <span
                          className={`${styles.sourceTag} ${entry.source === 'cal_com' ? styles.sourceCal : ''}`}
                        >
                          {getScheduleSourceLabel(entry)}
                        </span>
                      </article>
                    )
                  })}
                </div>
              </div>
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
