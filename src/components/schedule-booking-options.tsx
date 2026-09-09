import Link from 'next/link'
import { paidClassBookings } from '@/lib/cal/booking-options'

type ScheduleBookingOptionsProps = {
  active: string
}

export function ScheduleBookingOptions({ active }: ScheduleBookingOptionsProps) {
  return (
    <nav className="schedule-booking-options" aria-label="Paid classes">
      {paidClassBookings.map((option) => (
        <Link
          key={option.slug}
          className={active === option.slug ? 'is-active' : undefined}
          href={`/schedule?class=${option.slug}#book`}
          aria-current={active === option.slug ? 'page' : undefined}
        >
          <span>{option.title}</span>
          <small>{option.details}</small>
        </Link>
      ))}
    </nav>
  )
}
