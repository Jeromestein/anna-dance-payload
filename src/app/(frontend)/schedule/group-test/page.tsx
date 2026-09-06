import type { Metadata } from 'next'
import Link from 'next/link'

import { CalBooking } from '@/components/cal-booking'

export const metadata: Metadata = {
  title: 'Group Class Test',
  robots: { index: false, follow: false },
}

export default function GroupClassTestPage() {
  return (
    <section className="schedule-booking-page" id="book" aria-labelledby="group-class-test-title">
      <div className="page-shell schedule-booking-heading">
        <div>
          <p className="eyebrow">Internal booking test</p>
          <h1 id="group-class-test-title">Group Class Sync Test</h1>
        </div>
        <p className="schedule-booking-copy">
          Reserve a free test seat. This page is not linked from the public website.{' '}
          <Link href="/schedule">Return to Schedule</Link>.
        </p>
      </div>
      <div className="page-shell booking-frame schedule-booking-frame">
        <CalBooking
          calLink="anna-dance/group-class-sync-test"
          namespace="group-class-sync-test"
          loginNext="/schedule/group-test#book"
        />
      </div>
    </section>
  )
}
