import { createElement } from 'react'
import { afterAll, beforeAll, afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/actions/course-schedule', () => ({ manageCourseSchedule: vi.fn() }))
import { manageCourseSchedule } from '@/actions/course-schedule'
import { StudentSchedule } from '@/components/admin/StudentSchedule'
import { planLessonSlot, courseDateKey, courseTimeRange } from '@/lib/account/schedule-planning'
import type { AccountScheduleEntry } from '@/lib/account/schedule'
import type { CourseCreditData } from '@/lib/account/course-credits'

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open')
    },
  })
})
afterAll(() => {
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
const entry: AccountScheduleEntry = {
  id: 'existing',
  entryType: 'consultation',
  title: 'Consultation',
  startsAt: '2030-06-10T14:00:00Z',
  endsAt: '2030-06-10T15:00:00Z',
  timezone: 'America/New_York',
  location: null,
  status: 'scheduled',
  source: 'cal_com',
}
const credits: CourseCreditData = {
  unavailable: false,
  lessons: [],
  balances: [
    {
      item_id: 'item',
      payment_id: 'payment',
      bill_number: 'bill',
      description: 'Solo Class · 30 minutes',
      course_key: 'solo30',
      credit_count: 3,
      lesson_duration_minutes: 30,
      reserved: 0,
      completed: 0,
      available: 3,
      allocatable: true,
      bill_status: 'paid',
    },
  ],
}
function setup(entries: AccountScheduleEntry[] = []) {
  render(
    createElement(StudentSchedule, {
      owner: 'student',
      today: '2030-06-10',
      credits,
      entries,
      loadError: false,
    }),
  )
  const launcher = screen.getByRole('button', { name: 'Schedule a lesson' })
  launcher.focus()
  fireEvent.click(launcher)
  fireEvent.change(screen.getByLabelText('Course'), { target: { value: 'solo30' } })
}

function chooseTime(time: string) {
  fireEvent.change(screen.getByLabelText('Hour'), { target: { value: time.slice(0, 2) } })
  fireEvent.change(screen.getByLabelText('Minute'), { target: { value: time.slice(3) } })
}

describe('calendar lesson scheduling', () => {
  it('selects one date, previews a read-only end time and uses one credit', () => {
    setup()
    chooseTime('10:15')
    const end = screen.getByLabelText('End time · automatic') as HTMLInputElement
    expect(end.value).toBe('10:45')
    expect(end.readOnly).toBe(true)
    expect(screen.queryByLabelText('Number of lessons')).toBeNull()
    expect(
      (screen.getByRole('button', { name: 'Save lesson' }) as HTMLButtonElement).disabled,
    ).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Change date' }))
    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Jun 11, 2030, 0 appointments',
      }),
    )
    expect(screen.getByLabelText('End time · automatic')).toHaveProperty('value', '10:45')
    fireEvent.click(screen.getByRole('button', { name: 'Close lesson dialog' }))
    expect(screen.getByText('Jun 11, 2030', { selector: 'h3' })).toBeDefined()
  })
  it('updates the end time directly when selecting hours and minutes without submitting', () => {
    setup()
    expect(screen.queryByRole('button', { name: 'Use this time' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Start time (24-hour)' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Save lesson' })).toHaveProperty('disabled', true)
    chooseTime('16:30')
    expect(screen.getByLabelText('End time · automatic')).toHaveProperty('value', '17:00')
    fireEvent.change(screen.getByLabelText('Minute'), { target: { value: '45' } })
    expect(screen.getByLabelText('End time · automatic')).toHaveProperty('value', '17:15')
    expect(screen.getByRole('button', { name: 'Save lesson' })).toHaveProperty('disabled', false)
    expect(manageCourseSchedule).not.toHaveBeenCalled()
  })
  it('explains a conflict with an existing consultation and disables saving', () => {
    setup([entry])
    chooseTime('10:00')
    expect(screen.getByRole('alert').textContent).toContain('Time conflict: Consultation')
    expect(
      (screen.getByRole('button', { name: 'Save lesson' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    chooseTime('11:00')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(
      (screen.getByRole('button', { name: 'Save lesson' }) as HTMLButtonElement).disabled,
    ).toBe(false)
  })
  it('shows a fresh server conflict after submit and allows correction', async () => {
    vi.mocked(manageCourseSchedule).mockResolvedValue({
      error: 'Time conflict: this student already has a lesson or appointment during this slot.',
    })
    setup()
    chooseTime('10:00')
    fireEvent.submit(screen.getByRole('form', { name: 'Lesson details' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Time conflict:'))
    const submitted = vi.mocked(manageCourseSchedule).mock.calls[0][1]
    expect(submitted.get('local')).toBe('2030-06-10T10:00')
    expect(submitted.get('request')).toMatch(/^[a-f0-9-]{36}$/)
    chooseTime('11:00')
    expect(screen.queryByRole('alert')).toBeNull()
    vi.mocked(manageCourseSchedule).mockResolvedValue({ success: 'Lesson schedule saved.' })
    fireEvent.submit(screen.getByRole('form', { name: 'Lesson details' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('saved'))
    expect(
      (screen.getByRole('button', { name: 'Save lesson' }) as HTMLButtonElement).disabled,
    ).toBe(true)
  })
  it('keeps forms in a modal, restores focus on close, and never submits on Escape', () => {
    setup()
    expect(
      screen
        .getByRole('dialog', { name: 'Schedule a lesson' })
        .contains(screen.getByRole('form', { name: 'Lesson details' })),
    ).toBe(true)
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true, cancelable: true }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('form', { name: 'Lesson details' })).toBeNull()
    expect(document.body.style.overflow).toBe('')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Schedule a lesson' }))
    expect(manageCourseSchedule).not.toHaveBeenCalled()
  })
  it('opens cancellation in a separate dialog without changing the lesson', () => {
    render(
      createElement(StudentSchedule, {
        owner: 'student',
        today: '2030-06-10',
        entries: [{ ...entry, source: 'academy' }],
        loadError: false,
        credits: {
          ...credits,
          lessons: [
            {
              id: entry.id,
              payment_item_id: 'item',
              starts_at: entry.startsAt,
              ends_at: entry.endsAt,
              location: null,
              status: 'scheduled',
              revision: 0,
              source: 'academy',
            },
          ],
        },
      }),
    )
    expect(screen.queryByLabelText('Cancellation reason')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel lesson' }))
    const dialog = screen.getByRole('dialog', { name: 'Cancel lesson' })
    expect(within(dialog).getByLabelText('Cancellation reason')).toBeDefined()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(manageCourseSchedule).not.toHaveBeenCalled()
  })
  it('prevents new scheduling if complete schedule data is unavailable', () => {
    render(
      createElement(StudentSchedule, {
        owner: 'student',
        today: '2030-06-10',
        credits,
        entries: [],
        loadError: true,
      }),
    )
    expect(screen.getByRole('alert').textContent).toContain('could not be loaded')
    expect(screen.queryByRole('button', { name: 'Save lesson' })).toBeNull()
  })
})

describe('slot overlap boundaries', () => {
  it('allows adjacent slots but rejects partial overlaps and enclosing slots', () => {
    expect(planLessonSlot('2030-06-10', '09:30', 30, [entry]).conflict).toBeUndefined()
    expect(planLessonSlot('2030-06-10', '11:00', 30, [entry]).conflict).toBeUndefined()
    expect(planLessonSlot('2030-06-10', '09:45', 30, [entry]).conflict?.id).toBe('existing')
    expect(planLessonSlot('2030-06-10', '09:30', 120, [entry]).conflict?.id).toBe('existing')
  })
  it('ignores cancelled slots and the lesson being rescheduled', () => {
    expect(
      planLessonSlot('2030-06-10', '10:00', 30, [{ ...entry, status: 'cancelled' }]).conflict,
    ).toBeUndefined()
    expect(planLessonSlot('2030-06-10', '10:00', 30, [entry], 'existing').conflict).toBeUndefined()
  })
  it('keeps New York dates across midnight and rejects ambiguous DST starts', () => {
    const slot = planLessonSlot('2030-06-10', '23:45', 30, [])
    expect(courseDateKey(slot.end)).toBe('2030-06-11')
    expect(courseTimeRange(slot.start, slot.end)).toBe('23:45–Jun 11, 2030 · 00:15')
    expect(() => planLessonSlot('2026-11-01', '01:30', 30, [])).toThrow('ambiguous')
  })
})
