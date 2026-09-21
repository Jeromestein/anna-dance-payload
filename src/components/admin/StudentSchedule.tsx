'use client'

import { useActionState, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { manageCourseSchedule } from '@/actions/course-schedule'
import type { CourseCreditData, ManagedLesson } from '@/lib/account/course-credits'
import type { AccountScheduleEntry } from '@/lib/account/schedule'
import { courseOptions } from '@/lib/billing/courses'
import {
  courseDateKey,
  courseDateLabel,
  courseMonth,
  courseTimeLabel,
  courseTimeRange,
  planLessonSlot,
} from '@/lib/account/schedule-planning'
import styles from './student-schedule.module.css'

type Edit = { lesson: ManagedLesson; operation: 'reschedule' | 'cancel' | 'complete' }
type Props = {
  owner: string
  credits: CourseCreditData
  entries: AccountScheduleEntry[]
  loadError: boolean
  today: string
}

function ScheduleCalendar({
  month,
  selected,
  today,
  entries,
  busy,
  onSelect,
  onMonth,
}: {
  month: string
  selected: string
  today: string
  entries: AccountScheduleEntry[]
  busy: boolean
  onSelect: (date: string) => void
  onMonth: (offset: number) => void
}) {
  const details = courseMonth(month)
  const active = entries.filter((entry) => entry.status !== 'cancelled')
  return (
    <section className={styles.calendar} aria-label={`${details.label} lesson calendar`}>
      <header className={styles.calendarHeader}>
        <h3>{details.label}</h3>
        <nav aria-label="Lesson calendar navigation">
          <button
            type="button"
            aria-label="Previous month"
            disabled={busy}
            onClick={() => onMonth(-1)}
          >
            ←
          </button>
          <button type="button" disabled={busy} onClick={() => onSelect(today)}>
            Today
          </button>
          <button type="button" aria-label="Next month" disabled={busy} onClick={() => onMonth(1)}>
            →
          </button>
        </nav>
      </header>
      <div className={styles.weekdays} aria-hidden="true">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className={styles.days}>
        {Array.from({ length: details.leading }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length: details.days }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, '0')}`
          const count = active.filter((entry) => onDate(entry, date)).length
          return (
            <button
              type="button"
              key={date}
              disabled={busy}
              className={`${styles.day} ${count ? styles.bookedDay : ''} ${date === selected ? styles.selectedDay : ''}`}
              aria-label={`${courseDateLabel(date)}, ${count} appointments`}
              aria-pressed={date === selected}
              aria-current={date === today ? 'date' : undefined}
              onClick={() => onSelect(date)}
            >
              <span>{i + 1}</span>
              {count > 0 && (
                <small>
                  {count}
                  <span className={styles.countLabel}> booked</span>
                </small>
              )}
            </button>
          )
        })}
      </div>
      <p className={styles.legend}>
        <span>● Appointments</span>
        <strong>■ Selected day</strong>
      </p>
    </section>
  )
}

function onDate(entry: AccountScheduleEntry, date: string) {
  return (
    courseDateKey(entry.startsAt) <= date &&
    courseDateKey(new Date(Date.parse(entry.endsAt) - 1)) >= date
  )
}

function LessonEditor({
  owner,
  credits,
  entries,
  date,
  edit,
  onDone,
  onBusy,
  onDateChange,
  today,
}: Omit<Props, 'loadError' | 'today'> & {
  date: string
  edit: Edit | null
  onDone: () => void
  onBusy: (value: boolean) => void
  onDateChange: (date: string) => void
  today: string
}) {
  const [pickingDate, setPickingDate] = useState(false)
  const [pickerMonth, setPickerMonth] = useState(date.slice(0, 7))
  const request = useRef<string | null>(null)
  const [state, action, pending] = useActionState(
    async (previous: { error?: string; success?: string }, form: FormData) => {
      request.current ??= crypto.randomUUID()
      form.set('request', request.current)
      onBusy(true)
      try {
        return await manageCourseSchedule(previous, form)
      } finally {
        onBusy(false)
      }
    },
    {},
  )
  const [now] = useState(Date.now)
  const [course, setCourse] = useState('')
  const initialTime = edit ? courseTimeLabel(edit.lesson.starts_at) : ''
  const [hour, setHour] = useState(initialTime.slice(0, 2))
  const [minute, setMinute] = useState(initialTime.slice(3) || '00')
  const time = `${hour}:${minute}`
  const validTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(time)
  const [edited, setEdited] = useState(false)
  const operation = edit?.operation ?? 'create'
  const item = edit
    ? credits.balances.find((balance) => balance.item_id === edit.lesson.payment_item_id)
    : credits.balances.find(
        (balance) => balance.course_key === course && balance.allocatable && balance.available > 0,
      )
  const timed = operation === 'create' || operation === 'reschedule'
  let preview: ReturnType<typeof planLessonSlot> | undefined
  let warning = ''
  if (timed && item && validTime) {
    try {
      preview = planLessonSlot(date, time, item.lesson_duration_minutes, entries, edit?.lesson.id)
      if (Date.parse(preview.start) <= now) warning = 'Choose a start time in the future.'
      else if (preview.conflict) {
        warning = `Time conflict: ${preview.conflict.title} is scheduled for ${courseDateLabel(courseDateKey(preview.conflict.startsAt))}, ${courseTimeRange(preview.conflict.startsAt, preview.conflict.endsAt)}. Choose another time or date.`
      }
    } catch (error) {
      warning = (error as Error).message
    }
  }
  const locked = pending || Boolean(state.success)
  const error = warning || (!edited ? state.error : '')
  const available = credits.balances
    .filter((balance) => balance.course_key === course && balance.allocatable)
    .reduce((sum, balance) => sum + Math.max(0, balance.available), 0)
  return (
    <form
      className={styles.editor}
      action={action}
      onChange={() => setEdited(true)}
      onSubmit={() => setEdited(false)}
      aria-label="Lesson details"
    >
      <input type="hidden" name="owner" value={owner} />
      <input type="hidden" name="item" value={item?.item_id ?? ''} />
      <input type="hidden" name="test" value={credits.test ? 'yes' : 'no'} />
      <input type="hidden" name="operation" value={operation} />
      <input type="hidden" name="local" value={`${date}T${time}`} />
      {edit && (
        <>
          <input type="hidden" name="lesson" value={edit.lesson.id} />
          <input type="hidden" name="revision" value={edit.lesson.revision} />
          <input type="hidden" name="location" value={edit.lesson.location ?? ''} />
          <p>
            {item?.description} · {courseDateLabel(courseDateKey(edit.lesson.starts_at))} ·{' '}
            {courseTimeRange(edit.lesson.starts_at, edit.lesson.ends_at)}
          </p>
        </>
      )}
      <fieldset disabled={locked}>
        {!edit && (
          <label>
            Course
            <select value={course} onChange={(event) => setCourse(event.target.value)} required>
              <option value="">Choose a course</option>
              {courseOptions.map((option) => {
                const count = credits.balances
                  .filter((b) => b.course_key === option.key && b.allocatable)
                  .reduce((sum, b) => sum + Math.max(0, b.available), 0)
                return (
                  <option key={option.key} value={option.key} disabled={!count}>
                    {option.name} · {option.minutes} min · {count} available
                  </option>
                )
              })}
            </select>
          </label>
        )}
        {timed && (
          <>
            <div className={styles.dateRow}>
              <p className={styles.selectedDate}>
                Date: <strong>{courseDateLabel(date)}</strong>
              </p>
              <button
                type="button"
                aria-expanded={pickingDate}
                onClick={() => setPickingDate(!pickingDate)}
              >
                Change date
              </button>
            </div>
            {pickingDate && (
              <ScheduleCalendar
                month={pickerMonth}
                selected={date}
                today={today}
                entries={entries}
                busy={locked}
                onMonth={(offset) => setPickerMonth(courseMonth(pickerMonth, offset).key)}
                onSelect={(value) => {
                  onDateChange(value)
                  setPickerMonth(value.slice(0, 7))
                  setPickingDate(false)
                  setEdited(true)
                }}
              />
            )}

            <div className={styles.timeFields}>
              <fieldset className={styles.startTime}>
                <legend>Start time (24-hour)</legend>
                <div className={styles.timePickerFields}>
                  <label>
                    Hour
                    <select value={hour} onChange={(event) => setHour(event.target.value)} required>
                      <option value="">HH</option>
                      {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(
                        (value) => (
                          <option key={value}>{value}</option>
                        ),
                      )}
                    </select>
                  </label>
                  <label>
                    Minute
                    <select
                      value={minute}
                      onChange={(event) => setMinute(event.target.value)}
                      required
                    >
                      {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map(
                        (value) => (
                          <option key={value}>{value}</option>
                        ),
                      )}
                    </select>
                  </label>
                </div>
              </fieldset>
              <label>
                End time · automatic
                <input
                  readOnly
                  aria-label="End time · automatic"
                  value={preview ? courseTimeLabel(preview.end) : ''}
                  placeholder="Calculated automatically"
                />
              </label>
            </div>
            {preview && courseDateKey(preview.end) !== date && (
              <p>Ends on {courseDateLabel(courseDateKey(preview.end))}.</p>
            )}
            {item && (
              <p>
                {item.lesson_duration_minutes} minutes
                {!edit
                  ? ` · Uses 1 credit · ${available} available`
                  : ' · Keeps the existing credit reservation'}
              </p>
            )}
          </>
        )}
        {operation === 'cancel' && (
          <label>
            Cancellation reason
            <textarea name="reason" required maxLength={500} rows={2} />
          </label>
        )}
        {operation === 'cancel' && <p>The reserved lesson credit will be released.</p>}
        {operation === 'complete' && (
          <p>Mark this lesson as completed. Its credit will count as used.</p>
        )}
        {error && !state.success && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <button
          className={operation === 'cancel' ? styles.danger : styles.primary}
          disabled={locked || !item || (timed && (!preview || Boolean(warning)))}
        >
          {pending
            ? 'Saving…'
            : {
                create: 'Save lesson',
                reschedule: 'Save new time',
                cancel: 'Confirm cancellation',
                complete: 'Mark completed',
              }[operation]}
        </button>
      </fieldset>
      {state.success && (
        <p className={styles.success} role="status">
          {state.success}
        </p>
      )}
      <button type="button" disabled={pending} onClick={onDone}>
        {state.success ? 'Done' : 'Close'}
      </button>
    </form>
  )
}

function LessonDialog({
  owner,
  credits,
  entries,
  date: initialDate,
  edit,
  today,
  onClose,
}: Omit<Props, 'loadError'> & {
  date: string
  edit: Edit | null
  onClose: (date: string) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [date, setDate] = useState(initialDate)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const element = dialog.current
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflow = document.body.style.overflow
    element?.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      element?.close()
      document.body.style.overflow = overflow
      if (trigger?.isConnected) trigger.focus({ preventScroll: true })
    }
  }, [])
  return createPortal(
    <dialog
      ref={dialog}
      className={`${styles.schedule} ${styles.dialog}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose(date)
      }}
    >
      <header className={styles.dialogHeader}>
        <h3 id={titleId}>
          {edit
            ? {
                reschedule: 'Reschedule lesson',
                cancel: 'Cancel lesson',
                complete: 'Complete lesson',
              }[edit.operation]
            : 'Schedule a lesson'}
        </h3>
        <button
          type="button"
          aria-label="Close lesson dialog"
          disabled={busy}
          onClick={() => onClose(date)}
        >
          ×
        </button>
      </header>
      <p className={styles.dialogTimezone}>New York time · 24-hour</p>
      <LessonEditor
        owner={owner}
        credits={credits}
        entries={entries}
        date={date}
        edit={edit}
        today={today}
        onDateChange={setDate}
        onDone={() => onClose(date)}
        onBusy={setBusy}
      />
    </dialog>,
    document.body,
  )
}

export function StudentSchedule({ owner, credits, entries, loadError, today }: Props) {
  const router = useRouter()
  const [now] = useState(Date.now)
  const [selected, setSelected] = useState(today)
  const [month, setMonth] = useState(today.slice(0, 7))
  const [edit, setEdit] = useState<Edit | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const selectedEntries = entries
    .filter((entry) => onDate(entry, selected))
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
  const unavailable = loadError || credits.unavailable
  const totalAvailable = credits.balances
    .filter((b) => b.allocatable)
    .reduce((sum, b) => sum + Math.max(0, b.available), 0)
  function closeDialog(date: string) {
    setDialogOpen(false)
    setEdit(null)
    setSelected(date)
    setMonth(date.slice(0, 7))
  }
  function changeMonth(offset: number) {
    const next = courseMonth(month, offset).key
    setMonth(next)
    setSelected(next === today.slice(0, 7) ? today : `${next}-01`)
  }
  function startEdit(lesson: ManagedLesson, operation: Edit['operation']) {
    setEdit({ lesson, operation })
    setDialogOpen(true)
  }
  return (
    <div className={styles.schedule}>
      <p className={styles.instructions}>
        Select a date, then choose a course and start time. All times are New York time (24-hour).
      </p>
      {credits.test && <p className={styles.testNotice}>Sandbox schedule · no real lessons</p>}
      {unavailable && (
        <div className={styles.error} role="alert">
          The complete schedule or credit balance could not be loaded. Reload before scheduling.
          <button type="button" onClick={() => router.refresh()}>
            Reload schedule
          </button>
        </div>
      )}
      <ScheduleCalendar
        month={month}
        selected={selected}
        today={today}
        entries={entries}
        busy={false}
        onSelect={(date) => {
          setSelected(date)
          setMonth(date.slice(0, 7))
        }}
        onMonth={changeMonth}
      />
      <div className={styles.dayLayout}>
        <section className={styles.agenda} aria-label="Selected day appointments">
          <header className={styles.agendaHeader}>
            <h3>{courseDateLabel(selected)}</h3>
            {!unavailable && totalAvailable > 0 && (
              <button
                type="button"
                className={styles.primary}
                onClick={() => {
                  setEdit(null)
                  setDialogOpen(true)
                }}
              >
                Schedule a lesson
              </button>
            )}
          </header>
          {!selectedEntries.length && <p>No appointments for this student on this day.</p>}
          {selectedEntries.map((entry) => {
            const lesson = credits.lessons.find((lesson) => lesson.id === entry.id)
            const manageable =
              lesson?.source === 'academy' &&
              ['scheduled', 'changed'].includes(lesson.status) &&
              !unavailable
            return (
              <article
                className={`${styles.appointment} ${entry.status === 'cancelled' ? styles.cancelled : ''}`}
                key={entry.id}
              >
                <strong>{courseTimeRange(entry.startsAt, entry.endsAt)}</strong>
                <span>{entry.title}</span>
                <small>
                  {entry.status === 'changed'
                    ? 'Rescheduled'
                    : entry.status[0].toUpperCase() + entry.status.slice(1)}{' '}
                  · {entry.source === 'cal_com' ? 'Cal.com' : 'Academy'}
                </small>
                {manageable && (
                  <div className={styles.lessonActions}>
                    <button type="button" onClick={() => startEdit(lesson, 'reschedule')}>
                      Reschedule
                    </button>
                    <button type="button" onClick={() => startEdit(lesson, 'cancel')}>
                      Cancel lesson
                    </button>
                    {Date.parse(lesson.ends_at) <= now && (
                      <button type="button" onClick={() => startEdit(lesson, 'complete')}>
                        Mark completed
                      </button>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </section>
        {!unavailable && totalAvailable === 0 && (
          <p>
            No available lesson credits. Existing lessons can still be managed from the calendar.
          </p>
        )}
      </div>
      {dialogOpen && (
        <LessonDialog
          owner={owner}
          credits={credits}
          entries={entries}
          today={today}
          date={selected}
          edit={edit}
          onClose={closeDialog}
        />
      )}
      <details className={styles.balances}>
        <summary>Course balances</summary>
        {courseOptions.map((course) => {
          const balances = credits.balances.filter((b) => b.course_key === course.key)
          return (
            <p key={course.key}>
              <strong>
                {course.name} · {course.minutes} min
              </strong>
              <span>
                {balances
                  .filter((b) => b.allocatable)
                  .reduce((s, b) => s + Math.max(0, b.available), 0)}{' '}
                available · {balances.reduce((s, b) => s + b.reserved, 0)} scheduled ·{' '}
                {balances.reduce((s, b) => s + b.completed, 0)} completed
              </span>
            </p>
          )
        })}
      </details>
    </div>
  )
}
