export const consultationBooking = {
  slug: 'trial-class-consultation',
  title: 'Free consultation',
  details: '30 minutes · Complimentary',
}

// Prices and durations verified against the Anna Dance Cal.com event types.
export const paidClassBookings = [
  { slug: 'level-class', title: 'Group Class', details: '60 minutes · $31 per person' },
  { slug: 'duet-class', title: 'Duet Class', details: '60 minutes · $75 per person' },
  { slug: 'solo-class-30min', title: 'Solo Class (30 min)', details: '30 minutes · $40' },
  { slug: 'solo-class', title: 'Solo Class (60 min)', details: '60 minutes · $90' },
] as const

export function getScheduleBooking(isAuthenticated: boolean, requested?: string | string[]) {
  if (!isAuthenticated) return consultationBooking
  return paidClassBookings.find((option) => option.slug === requested) ?? paidClassBookings[0]
}
