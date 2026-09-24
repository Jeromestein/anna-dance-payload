'use client'

import { startTransition, useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitStudentLeave, type LeaveActionState } from '@/actions/student-leave'
import {
  currentLeaveTimes,
  leaveDateLabel,
  leavePeriod,
  leavePeriodLabel,
  type LeaveData,
} from '@/lib/leave/model'
import styles from './student-leave.module.css'

export function StudentLeave({ data, now }: { data: LeaveData; now: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState<LeaveActionState, FormData>(
    async (previous, form) =>
      form.get('reset') === 'yes' ? {} : submitStudentLeave(previous, form),
    {},
  )
  const [clock, setClock] = useState(now)
  const effectiveNow = new Date(Math.max(Date.parse(now), Date.parse(clock))).toISOString()
  const period = leavePeriod(effectiveNow)
  const times = currentLeaveTimes(data, effectiveNow)
  const remaining = 2 - times.length

  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = new Date().toISOString()
      if (leavePeriod(next).start !== leavePeriod(clock).start) {
        setClock(next)
        router.refresh()
      }
    }, 60000)
    return () => window.clearInterval(timer)
  }, [clock, router])

  return (
    <section className={styles.card} aria-labelledby="leave-title" id="leave">
      <div className={styles.heading}>
        <div>
          <h2 id="leave-title">Leave requests</h2>
          <p>
            {data.unavailable
              ? 'Leave balance is temporarily unavailable.'
              : `${remaining} of 2 requests remaining`}
          </p>
        </div>
        <button
          type="button"
          className="button button-secondary"
          disabled={data.unavailable || remaining === 0 || pending}
          aria-expanded={open}
          aria-controls="leave-request-form"
          onClick={() => {
            if (state.success) {
              const reset = new FormData()
              reset.set('reset', 'yes')
              startTransition(() => action(reset))
              setOpen(true)
            } else setOpen(!open)
          }}
        >
          Request leave
        </button>
      </div>
      <p className={styles.help}>
        {leavePeriodLabel(period)} · Resets January 1 and June 1, New York time. Unused requests do
        not carry over.
      </p>
      {times.length > 0 && (
        <ul className={styles.times}>
          {times.map((time, index) => (
            <li key={time}>
              Request {index + 1}: {leaveDateLabel(time)}
            </li>
          ))}
        </ul>
      )}
      {open && (
        <form action={action} className={styles.form} id="leave-request-form">
          <input type="hidden" name="first_leave_at" value={data.first_leave_at ?? ''} />
          <input type="hidden" name="second_leave_at" value={data.second_leave_at ?? ''} />
          {state.retryToken ? (
            <input type="hidden" name="retry_token" value={state.retryToken} />
          ) : null}
          {!state.success && !state.retryToken && (
            <>
              <label htmlFor="leave-reason">Your leave request *</label>
              <textarea
                id="leave-reason"
                name="reason"
                rows={4}
                maxLength={1000}
                required
                placeholder="Please include the class date and a brief explanation."
                aria-describedby="leave-help"
              />
              <p id="leave-help" className={styles.help}>
                Please notify the Academy at least 24 hours before class. Your message will be
                emailed to you and the Academy. Schedule and makeup arrangements are handled by
                staff.
              </p>
            </>
          )}
          {state.error && (
            <p role="alert" className={styles.error}>
              {state.error}
            </p>
          )}
          {state.warning && (
            <p role="status" className={styles.warning}>
              {state.warning}
            </p>
          )}
          {state.success && (
            <p role="status" className={styles.success}>
              {state.success}
            </p>
          )}
          {!state.success && (
            <button
              className="button"
              type="submit"
              disabled={pending || (!state.retryToken && (remaining === 0 || data.unavailable))}
            >
              {pending ? 'Sending…' : state.retryToken ? 'Retry emails' : 'Submit leave request'}
            </button>
          )}
        </form>
      )}
    </section>
  )
}
