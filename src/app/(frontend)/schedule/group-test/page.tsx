import type { Metadata } from 'next'
import Link from 'next/link'

import { CalBooking } from '@/components/cal-booking'
import { ScheduleBookingOptions } from '@/components/schedule-booking-options'

export const metadata: Metadata = {
  title: 'Payment Test',
  robots: { index: false, follow: false },
}

export default function GroupClassTestPage() {
  return (
    <section className="schedule-booking-page" id="book" aria-labelledby="group-class-test-title">
      <div className="page-shell schedule-booking-heading">
        <div>
          <p className="eyebrow">Cal.com payment test</p>
          <h1 id="group-class-test-title">Book and pay $0.50</h1>
        </div>
        <p className="schedule-booking-copy">
          Choose a time in Cal.com, then complete the $0.50 test payment. The booking is confirmed
          only after payment succeeds. <Link href="/schedule">Return to Schedule</Link>.
        </p>
      </div>
      <div className="page-shell">
        <ScheduleBookingOptions active="payment" />
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
