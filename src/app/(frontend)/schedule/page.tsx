import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowIcon } from '@/components/arrow-icon'
import { CalBooking } from '@/components/cal-booking'
import { ScheduleBookingOptions } from '@/components/schedule-booking-options'
import { getStudentAccountAccess } from '@/lib/auth/student-access'
import { getScheduleBooking } from '@/lib/cal/booking-options'
import { schedule } from '@/lib/site-data'

export const metadata: Metadata = { title: 'Schedule' }

export const dynamic = 'force-dynamic'

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string | string[] }>
}) {
  const [isAuthenticated, params] = await Promise.all([getStudentAccountAccess(), searchParams])
  const booking = getScheduleBooking(isAuthenticated, params.class)
  const title = isAuthenticated ? 'Book a class' : 'Book a free consultation'

  return (
    <>
      <section className="schedule-booking-page" id="book" aria-labelledby="schedule-booking-title">
        <div className="page-shell schedule-booking-heading">
          <div>
            <p className="eyebrow">{isAuthenticated ? "Student booking" : "Let’s meet"}</p>
            <h1 id="schedule-booking-title">{title}</h1>
          </div>
          <p className="schedule-booking-copy">
            {isAuthenticated
              ? 'Choose your class and an available time, then complete payment to reserve your place. The final price is shown before payment.'
              : 'Book a complimentary 30-minute in-studio consultation. We’ll discuss your dancer’s age, experience, goals, and class placement. No account is needed.'}
          </p>
        </div>
        {isAuthenticated ? (
          <div className="page-shell">
            <ScheduleBookingOptions active={booking.slug} />
          </div>
        ) : null}
        <div className="page-shell booking-frame schedule-booking-frame">
          <CalBooking
            key={booking.slug}
            calLink={`anna-dance/${booking.slug}`}
            namespace={booking.slug}
            loginNext={`/schedule?class=${booking.slug}#book`}
            allowGuest={!isAuthenticated}
          />
        </div>
      </section>
      {isAuthenticated ? <section className="schedule-section section-space">
        <div className="page-shell schedule-layout">
          <aside className="schedule-note">
            <p className="eyebrow">Program rhythm</p>
            <h2>Current training format</h2>
            <p>
              Exact class times, term dates, lesson counts, and availability are shared for each
              registration period after placement. Level-Based Group Classes generally meet once
              each week for 60 minutes.
            </p>
            <Link href="#book" className="text-link">
              {title} <ArrowIcon />
            </Link>
          </aside>
          <div
            className="schedule-table"
            role="region"
            aria-label="Program training format"
            tabIndex={0}
          >
            <div className="schedule-head">
              <span>Timing</span>
              <span>Program</span>
              <span>Session</span>
            </div>
            {schedule.map((item) => (
              <div className="schedule-row" key={item.program}>
                <strong>{item.timing}</strong>
                <div>
                  <b>{item.program}</b>
                  <small>{item.note}</small>
                </div>
                <span>{item.duration}</span>
              </div>
            ))}
          </div>
        </div>
      </section> : null}
    </>
  )
}
