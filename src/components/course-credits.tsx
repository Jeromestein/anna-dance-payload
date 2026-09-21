'use client'

import { useActionState, useState } from 'react'
import { manageCourseSchedule } from '@/actions/course-schedule'
import {
  newYorkInstant,
  type CourseCreditData,
  type CourseBalance,
  type ManagedLesson,
} from '@/lib/account/course-credits'
import styles from './billing.module.css'

const dateLabel = (date: string) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
function LessonTimeFields({
  local,
  onChange,
  duration,
}: {
  local: string
  onChange: (value: string) => void
  duration: number
}) {
  let endTime = ''
  let error = ''
  if (local) {
    try {
      const start = newYorkInstant(local)
      endTime = dateLabel(new Date(Date.parse(start) + duration * 60000).toISOString())
    } catch (cause) {
      error = (cause as Error).message
    }
  }
  return (
    <>
      <label>
        Start time · New York
        <input
          name="local"
          type="datetime-local"
          required
          value={local}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      <label>
        End time · New York (automatic)
        <input type="text" readOnly value={endTime} placeholder="Choose a start time" />
      </label>
      <p>{duration} minutes · End time is calculated automatically.</p>
      {error && <p role="alert">{error}</p>}
    </>
  )
}
function CourseScheduleForm({
  owner,
  item,
  test,
}: {
  owner: string
  item: CourseBalance
  test: boolean
}) {
  const [state, action, pending] = useActionState(manageCourseSchedule, {})
  const [request] = useState(() => item.request_id ?? crypto.randomUUID())
  const [local, setLocal] = useState('')
  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="owner" value={owner} />
      <input type="hidden" name="item" value={item.item_id} />
      <input type="hidden" name="test" value={test ? 'yes' : 'no'} />
      <input type="hidden" name="operation" value="create" />
      <input type="hidden" name="request" value={request} />
      <fieldset disabled={pending || Boolean(state.success)}>
        <LessonTimeFields
          local={local}
          onChange={setLocal}
          duration={item.lesson_duration_minutes}
        />
        <p>Uses 1 lesson credit · {item.available} available to schedule</p>
        <button disabled={pending || !local || item.available < 1}>Save lesson</button>
      </fieldset>
      {state.error && <p role="alert">{state.error}</p>}
      {state.success && <p role="status">{state.success}</p>}
    </form>
  )
}
function LessonActions({
  owner,
  lesson,
  duration,
  test,
}: {
  owner: string
  lesson: ManagedLesson
  duration: number
  test: boolean
}) {
  const [state, action, pending] = useActionState(manageCourseSchedule, {})
  const [operation, setOperation] = useState('reschedule')
  const [local, setLocal] = useState('')
  const [now] = useState(Date.now)
  return (
    <details className={styles.lessonDisclosure}>
      <summary>Adjust lesson</summary>
      <form action={action} className={styles.form}>
        <input type="hidden" name="owner" value={owner} />
        <input type="hidden" name="item" value={lesson.payment_item_id} />
        <input type="hidden" name="lesson" value={lesson.id} />
        <input type="hidden" name="revision" value={lesson.revision} />
        <input type="hidden" name="test" value={test ? 'yes' : 'no'} />
        <label>
          Action
          <select name="operation" value={operation} onChange={(e) => setOperation(e.target.value)}>
            <option value="reschedule">Reschedule</option>
            <option value="cancel">Cancel and release reservation</option>
            {Date.parse(lesson.ends_at) <= now && <option value="complete">Mark completed</option>}
          </select>
        </label>
        {operation === 'reschedule' && (
          <>
            <LessonTimeFields local={local} onChange={setLocal} duration={duration} />
            <input type="hidden" name="location" value={lesson.location ?? ''} />
          </>
        )}
        {operation === 'cancel' && (
          <label>
            Reason
            <input name="reason" maxLength={500} required />
          </label>
        )}
        <button disabled={pending || Boolean(state.success)}>Save change</button>
        {state.error && <p role="alert">{state.error}</p>}
        {state.success && <p role="status">{state.success}</p>}
      </form>
    </details>
  )
}
export function CourseCredits({ data, owner }: { data: CourseCreditData; owner?: string }) {
  const [now] = useState(Date.now)
  if (data.unavailable)
    return (
      <p role="alert">
        Course credits could not be loaded. Existing bills and appointments are shown separately.
      </p>
    )
  if (!data.balances.length)
    return <p>No course credits are configured yet. Existing bookings remain on your schedule.</p>
  return (
    <div className={styles.records}>
      <h3>{data.test ? 'Sandbox course credits · no real lessons' : 'Course credits'}</h3>
      {data.balances.map((item) => (
        <article className={styles.bill} key={item.item_id}>
          <div className={styles.body}>
            <h4>{item.description}</h4>
            <small>{item.bill_number}</small>
            <p>
              {item.credit_count}{' '}
              {['payment_due', 'pending_verification'].includes(item.bill_status)
                ? 'included · awaiting payment'
                : 'purchased'}{' '}
              · {item.reserved} scheduled · {item.completed} completed
            </p>
            {item.allocatable && item.available >= 0 ? (
              <strong>{item.available} available to schedule</strong>
            ) : (
              <p>
                {item.available < 0
                  ? 'Credit history needs review.'
                  : item.bill_status === 'paid'
                    ? 'Payment or refund needs review before scheduling.'
                    : `Not available for scheduling · ${item.bill_status.replaceAll('_', ' ')}`}
              </p>
            )}
            {owner && item.allocatable && item.available > 0 && (
              <details className={styles.lessonDisclosure}>
                <summary>Schedule a lesson</summary>
                <CourseScheduleForm
                  key={`${item.item_id}:${item.available}`}
                  owner={owner}
                  item={item}
                  test={Boolean(data.test)}
                />
              </details>
            )}
            {data.lessons
              .filter((lesson) => lesson.payment_item_id === item.item_id)
              .map((lesson) => (
                <div key={lesson.id} className={styles.body}>
                  <p>
                    {dateLabel(lesson.starts_at)} · {lesson.status}
                    {lesson.location ? ` · ${lesson.location}` : ''}
                  </p>
                  {['scheduled', 'changed'].includes(lesson.status) &&
                    Date.parse(lesson.ends_at) < now && (
                      <p>Past lesson · completion needs review</p>
                    )}
                  {owner &&
                    lesson.source === 'academy' &&
                    ['scheduled', 'changed'].includes(lesson.status) && (
                      <LessonActions
                        key={`${lesson.id}:${lesson.revision}`}
                        owner={owner}
                        lesson={lesson}
                        duration={item.lesson_duration_minutes}
                        test={Boolean(data.test)}
                      />
                    )}
                </div>
              ))}
          </div>
        </article>
      ))}
    </div>
  )
}
