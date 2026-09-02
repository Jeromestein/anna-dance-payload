export type MockAccountEvent = {
  date: string
  day: string
  month: string
  title: string
  time: string
  location: string
  source: 'Semester schedule' | 'Cal.com preview'
}

export type MockStudentAccount = {
  isMock: true
  term: {
    name: string
    program: string
    lessonCount: number
    dateRange: string
  }
  payment: {
    status: 'Payment due'
    amount: string
    dueDate: string
    paidAmount: string
  }
  nextClass: MockAccountEvent
  events: MockAccountEvent[]
  calendarDays: number[]
}

const events: MockAccountEvent[] = [
  {
    date: '2026-09-08',
    day: '08',
    month: 'Sep',
    title: 'Ballet Foundations',
    time: 'Tuesday, 4:00–5:00 PM',
    location: 'Studio A',
    source: 'Semester schedule',
  },
  {
    date: '2026-09-12',
    day: '12',
    month: 'Sep',
    title: 'Private lesson consultation',
    time: 'Saturday, 10:00–10:30 AM',
    location: 'Online meeting',
    source: 'Cal.com preview',
  },
  {
    date: '2026-09-15',
    day: '15',
    month: 'Sep',
    title: 'Ballet Foundations',
    time: 'Tuesday, 4:00–5:00 PM',
    location: 'Studio A',
    source: 'Semester schedule',
  },
  {
    date: '2026-09-22',
    day: '22',
    month: 'Sep',
    title: 'Ballet Foundations',
    time: 'Tuesday, 4:00–5:00 PM',
    location: 'Studio A',
    source: 'Semester schedule',
  },
]

export function getMockStudentAccount(): MockStudentAccount {
  return {
    isMock: true,
    term: {
      name: 'Fall 2026',
      program: 'Ballet Foundations',
      lessonCount: 14,
      dateRange: 'Sep 8–Dec 15, 2026',
    },
    payment: {
      status: 'Payment due',
      amount: '$480.00',
      dueDate: 'September 5, 2026',
      paidAmount: '$0.00',
    },
    nextClass: events[0],
    events,
    calendarDays: [8, 12, 15, 22, 29],
  }
}
