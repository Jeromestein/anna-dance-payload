import { createElement } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
const submit = vi.hoisted(() => vi.fn())
vi.mock('@/actions/student-leave', () => ({ submitStudentLeave: submit }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
import { StudentLeave } from '@/components/student-leave'
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
const course = {
  package_id: 'level-1',
  course_name: 'Level 1 Saturday',
  first_leave_at: null,
  second_leave_at: null,
}
const data = { courses: [course] }
describe('Simple Account leave form', () => {
  it('disables leave without an eligible course', () => {
    render(createElement(StudentLeave, { data: { courses: [] }, now: '2026-09-24T12:00:00Z' }))
    expect(screen.getByText('No paid courses with lessons remaining.')).toBeTruthy()
    expect(
      (screen.getByRole('button', { name: 'Request leave' }) as HTMLButtonElement).disabled,
    ).toBe(true)
  })
  it('keeps exhausted and available courses independent', async () => {
    render(
      createElement(StudentLeave, {
        data: {
          courses: [
            {
              ...course,
              first_leave_at: '2026-06-02T12:00:00Z',
              second_leave_at: '2026-07-02T12:00:00Z',
            },
            { ...course, package_id: 'DUET-01', course_name: 'Duet Monday' },
          ],
        },
        now: '2026-09-24T12:00:00Z',
      }),
    )
    expect(screen.getByText('0 of 2 requests remaining')).toBeTruthy()
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'DUET-01' } })
    expect(screen.getByText('2 of 2 requests remaining')).toBeTruthy()
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: 'Request leave' }) as HTMLButtonElement).disabled,
      ).toBe(false),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Request leave' }))
    expect((document.querySelector('[name=package_id]') as HTMLInputElement).value).toBe('DUET-01')
  })
  it('does not consume a request when the button is opened', () => {
    render(createElement(StudentLeave, { data, now: '2026-09-24T12:00:00Z' }))
    fireEvent.click(screen.getByRole('button', { name: 'Request leave' }))
    expect(submit).not.toHaveBeenCalled()
    expect(screen.getByRole('textbox').getAttribute('required')).not.toBeNull()
    expect(screen.getByText('2 of 2 requests remaining')).toBeTruthy()
  })
  it('updates the balance when the server returns a newly recorded timestamp', () => {
    const view = render(createElement(StudentLeave, { data, now: '2026-09-24T12:00:00Z' }))
    view.rerender(
      createElement(StudentLeave, {
        data: { courses: [{ ...course, first_leave_at: '2026-09-24T12:05:00Z' }] },
        now: '2026-09-24T12:05:01Z',
      }),
    )
    expect(screen.getByText('1 of 2 requests remaining')).toBeTruthy()
  })

  it('disables submission after both times fall in the current cycle', () => {
    render(
      createElement(StudentLeave, {
        data: {
          courses: [
            {
              ...course,
              first_leave_at: '2026-06-02T12:00:00Z',
              second_leave_at: '2026-07-02T12:00:00Z',
            },
          ],
        },
        now: '2026-09-24T12:00:00Z',
      }),
    )
    expect(
      (screen.getByRole('button', { name: 'Request leave' }) as HTMLButtonElement).disabled,
    ).toBe(true)
    expect(screen.getByText('0 of 2 requests remaining')).toBeTruthy()
  })
  it('shows a retry action after partial email failure and retains the receipt', async () => {
    submit.mockResolvedValue({
      warning: 'Emails pending',
      retryToken: 'test-receipt',
      remaining: 1,
    })
    const view = render(createElement(StudentLeave, { data, now: '2026-09-24T12:00:00Z' }))
    fireEvent.click(screen.getByRole('button', { name: 'Request leave' }))
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'October 1 family appointment' },
    })
    fireEvent.submit(view.container.querySelector('form')!)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Retry emails' })).toBeTruthy())
    expect((view.container.querySelector('[name=retry_token]') as HTMLInputElement).value).toBe(
      'test-receipt',
    )
    expect(screen.queryByRole('textbox')).toBeNull()
  })
})
