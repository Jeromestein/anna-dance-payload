import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowIcon } from '@/components/arrow-icon'
import { CalBooking } from '@/components/cal-booking'
import { ScheduleBookingOptions } from '@/components/schedule-booking-options'
import { getStudentAccountAccess } from '@/lib/auth/student-access'
import { consultationBooking, getScheduleBooking } from '@/lib/cal/booking-options'
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
  const isConsultation = booking.slug === consultationBooking.slug
  const title = isConsultation ? 'Book a free trial consultation' : 'Book a class'
  const bookingPath = `/schedule?class=${booking.slug}#book`
  const loginBookingPath = `/schedule?class=${getScheduleBooking(true).slug}#book`

  if (isAuthenticated && params.class !== booking.slug) redirect(bookingPath)

  return (
    <>
      <section className="schedule-booking-page" id="book" aria-labelledby="schedule-booking-title">
        <div className="page-shell schedule-booking-heading">
          <div>
            <p className="eyebrow">{isAuthenticated ? "Student booking" : "Let’s meet"}</p>
            <h1 id="schedule-booking-title">{title}</h1>
          </div>
          <p className="schedule-booking-copy">
            {!isConsultation
              ? 'Choose your class and an available time, then complete payment to reserve your place. The final price is shown before payment.'
              : isAuthenticated
                ? 'Choose an available time for your complimentary 30-minute in-studio consultation. We’ll discuss your dancer’s age, experience, goals, and class placement.'
                : 'Book a complimentary 30-minute in-studio consultation. We’ll discuss your dancer’s age, experience, goals, and class placement. Log in to book online, or call us to arrange your consultation.'}
          </p>
        </div>
        {isAuthenticated ? (
          <div className="page-shell">
            <ScheduleBookingOptions active={booking.slug} />
          </div>
        ) : null}
        <div className="page-shell booking-frame schedule-booking-frame">
          {isAuthenticated ? <CalBooking
            key={booking.slug}
            calLink={`anna-dance/${booking.slug}`}
            namespace={booking.slug}
            loginNext={bookingPath}
          /> : (
            <div className="consultation-login-panel">
              <p className="eyebrow">30 minutes · Complimentary</p>
              <h2>Log in to book your free trial</h2>
              <p>Choose an available time after logging in, or call us to arrange your free consultation.</p>
              <div className="consultation-login-actions">
                <Link className="button" href={`/login?next=${encodeURIComponent(loginBookingPath)}`}>
                  Log in to book <ArrowIcon />
                </Link>
                <a className="text-link" href="tel:+17014009213">Call 701-400-9213</a>
              </div>
              <p className="consultation-location">Tampa / Lutz Area</p>
            </div>
          )}
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
