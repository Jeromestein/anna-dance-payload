export type CalSessionAppointment = {
  id: string
  cal_booking_uid: string | null
  cal_session_key: string | null
  seat_capacity: number | null
  status: string
}

export type CalAppointmentSession<T extends CalSessionAppointment> = {
  key: string
  appointments: T[]
  representative: T
  bookedSeats: number
  capacity: number | null
}

export function groupCalAppointments<T extends CalSessionAppointment>(
  appointments: T[],
): CalAppointmentSession<T>[] {
  const sessions = new Map<string, T[]>()

  for (const appointment of appointments) {
    const key =
      appointment.cal_session_key || appointment.cal_booking_uid || `appointment:${appointment.id}`
    const existing = sessions.get(key)
    if (existing) existing.push(appointment)
    else sessions.set(key, [appointment])
  }

  return Array.from(sessions, ([key, sessionAppointments]) => ({
    key,
    appointments: sessionAppointments,
    representative: sessionAppointments[0],
    bookedSeats: sessionAppointments.filter((appointment) => appointment.status !== 'cancelled')
      .length,
    capacity: sessionAppointments.reduce<number | null>((largest, appointment) => {
      if (!appointment.seat_capacity) return largest
      return largest === null
        ? appointment.seat_capacity
        : Math.max(largest, appointment.seat_capacity)
    }, null),
  }))
}
