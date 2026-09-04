import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowIcon } from '@/components/arrow-icon'
import { CalBooking } from '@/components/cal-booking'
import { schedule } from '@/lib/site-data'

export const metadata: Metadata = { title: 'Schedule' }

export default function SchedulePage() {
  return (
    <>
      <section className="schedule-booking-page" id="book" aria-labelledby="schedule-booking-title">
        <div className="page-shell schedule-booking-heading">
          <div>
            <p className="eyebrow">Student booking</p>
            <h1 id="schedule-booking-title">Book a trial class</h1>
          </div>
          <p className="schedule-booking-copy">
            Log in to schedule a class appointment. For general questions or a consultation, call{' '}
            <a href="tel:+17014009213">701-400-9213</a>.
          </p>
        </div>
        <div className="page-shell booking-frame schedule-booking-frame">
          <CalBooking />
        </div>
      </section>
      <section className="schedule-section section-space">
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
              Book a trial class <ArrowIcon />
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
      </section>
    </>
  )
}
