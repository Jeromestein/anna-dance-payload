import Link from 'next/link'

type ScheduleBookingOptionsProps = {
  active: 'trial' | 'payment'
}

export function ScheduleBookingOptions({ active }: ScheduleBookingOptionsProps) {
  return (
    <nav className="schedule-booking-options" aria-label="Booking options">
      <Link
        className={active === 'trial' ? 'is-active' : undefined}
        href="/schedule#book"
        aria-current={active === 'trial' ? 'page' : undefined}
      >
        <span>Trial class</span>
        <small>Standard booking</small>
      </Link>
      <Link
        className={active === 'payment' ? 'is-active' : undefined}
        href="/schedule/group-test#book"
        aria-current={active === 'payment' ? 'page' : undefined}
      >
        <span>Payment test</span>
        <small>$0.50 after choosing a time</small>
      </Link>
    </nav>
  )
}
