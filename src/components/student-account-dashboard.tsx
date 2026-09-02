import type { EditableStudentProfile } from '@/components/student-profile-form'
import { MobileAccountTabs } from '@/components/mobile-account-tabs'
import { StudentProfileForm } from '@/components/student-profile-form'
import type { MockStudentAccount } from '@/lib/account/mock-student-account'

import styles from './student-account-dashboard.module.css'

type StudentAccountDashboardProps = {
  account: MockStudentAccount
  profile: EditableStudentProfile
  error?: string
  message?: string
  profileLoadError?: boolean
}

const september2026 = Array.from({ length: 30 }, (_, index) => index + 1)

export function StudentAccountDashboard({
  account,
  profile,
  error,
  message,
  profileLoadError = false,
}: StudentAccountDashboardProps) {
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
          Payments and schedule are a front-end preview while the live records and integrations are
          being prepared.
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
              <span className={styles.summaryLabel}>Next class</span>
              <strong>{account.nextClass.title}</strong>
              <p>
                {account.nextClass.time} · {account.nextClass.location}
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
                  <p>{account.term.dateRange}</p>
                </div>
                <span className={styles.sampleTag}>Sample</span>
              </header>

              <div className={styles.scheduleBody}>
                <div className={styles.calendar} aria-label="September 2026 calendar preview">
                  <div className={styles.calendarTitle}>
                    <strong>September 2026</strong>
                    <span>5 scheduled dates</span>
                  </div>
                  <div className={styles.weekdays} aria-hidden="true">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <span key={day}>{day}</span>
                    ))}
                  </div>
                  <div className={styles.days}>
                    {[0, 1].map((day) => (
                      <span className={styles.emptyDay} key={`empty-${day}`} aria-hidden="true" />
                    ))}
                    {september2026.map((day) => {
                      const hasEvent = account.calendarDays.includes(day)
                      const isCalEvent = day === 12
                      return (
                        <span
                          className={`${styles.day} ${hasEvent ? styles.eventDay : ''} ${isCalEvent ? styles.calDay : ''}`}
                          key={day}
                          aria-label={hasEvent ? `September ${day}, scheduled` : `September ${day}`}
                        >
                          {day}
                        </span>
                      )
                    })}
                  </div>
                  <div className={styles.calendarLegend}>
                    <span>
                      <i /> Semester class
                    </span>
                    <span>
                      <i /> Cal.com appointment
                    </span>
                  </div>
                </div>

                <div className={styles.eventList} aria-label="Upcoming schedule">
                  {account.events.map((event) => (
                    <article className={styles.event} key={`${event.date}-${event.title}`}>
                      <time className={styles.eventDate} dateTime={event.date}>
                        <span>{event.month}</span>
                        <strong>{event.day}</strong>
                      </time>
                      <div className={styles.eventInfo}>
                        <strong>{event.title}</strong>
                        <span>
                          {event.time} · {event.location}
                        </span>
                      </div>
                      <span
                        className={`${styles.sourceTag} ${event.source === 'Cal.com preview' ? styles.sourceCal : ''}`}
                      >
                        {event.source}
                      </span>
                    </article>
                  ))}
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
