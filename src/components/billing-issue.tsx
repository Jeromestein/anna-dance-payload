'use client'

import { startTransition, useActionState, useRef, useState } from 'react'
import { manageBill } from '@/actions/billing'
import {
  money,
  readItems,
  readAgreedTotal,
  itemDetail,
  type Bill,
  type BillItem,
} from '@/lib/billing/model'
import { BillShareTools } from './billing-share-tools'
import styles from './billing.module.css'
import { courseOptions } from '@/lib/billing/courses'

export function IssueBill({
  owner,
  ownerName,
  bills,
  id,
  test,
  paymentOrigin,
}: {
  owner: string
  ownerName: string
  bills: Bill[]
  id: string
  test: boolean
  paymentOrigin?: string
}) {
  const [state, action, pending] = useActionState(manageBill, {})
  const [requestId, setRequestId] = useState(id)
  const [kind, setKind] = useState('courses')
  const [review, setReview] = useState<BillItem[] | null>(null)
  const [validation, setValidation] = useState('')
  const [courses, setCourses] = useState(() =>
    courseOptions.map((course) => ({ key: course.key, count: '0' })),
  )
  const [agreedTotal, setAgreedTotal] = useState(0)
  const [reviewDue, setReviewDue] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const saved = state.billId === requestId && state.success
  const savedBill = saved ? bills.find((bill) => bill.id === requestId) : undefined
  const total =
    kind === 'courses'
      ? agreedTotal
      : review?.reduce((sum, item) => sum + item.quantity * (item.unit_amount_cents ?? 0), 0)
  function edit() {
    setReview(null)
    setValidation('')
    requestAnimationFrame(() => headingRef.current?.focus())
  }
  return (
    <form
      ref={formRef}
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault()
        if (pending || saved) return
        const data = new FormData(event.currentTarget)
        try {
          const checked = readItems(data)
          if (!review) {
            setReview(checked)
            if (kind === 'courses') setAgreedTotal(readAgreedTotal(data))
            setReviewDue(String(data.get('due') || 'Not set'))
            setValidation('')
            requestAnimationFrame(() => headingRef.current?.focus())
          } else if (data.get('confirmed') === 'yes') {
            startTransition(() => action(data))
          }
        } catch (error) {
          setValidation(error instanceof Error ? error.message : 'Check the bill details.')
        }
      }}
    >
      <input type="hidden" name="owner" value={owner} />
      <input type="hidden" name="id" value={requestId} />
      <input type="hidden" name="operation" value="issue" />
      <h3 ref={headingRef} tabIndex={-1}>
        {saved ? 'Payment request created' : review ? 'Review payment details' : 'Payment details'}
      </h3>
      <p>
        For <strong>{ownerName}</strong>
        {test && ' · SANDBOX — no real money'}
      </p>
      <fieldset disabled={pending || Boolean(saved)} className={styles.issueFields}>
        <div hidden={Boolean(review)}>
          <label>
            Payment type
            <select name="bill_kind" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="courses">Course purchase</option>
              <option value="other">Other fees</option>
            </select>
          </label>
          {kind === 'courses' && (
            <fieldset>
              <legend>Total and included lessons</legend>
              <label>
                Total to collect (USD)
                <input
                  name="total_price"
                  type="number"
                  min="0.50"
                  max="100000"
                  step="0.01"
                  required
                />
              </label>
              <p>Enter the total and lesson counts. Leave unused courses at 0.</p>
              {courseOptions.map((course) => (
                <input key={course.key} type="hidden" name="course_key" value={course.key} />
              ))}
              {courseOptions.map((course, index) => (
                <label
                  className={styles.courseCount}
                  key={course.key}
                  htmlFor={`${requestId}-${course.key}-count`}
                >
                  <span>
                    {course.name} · {course.minutes} minutes
                  </span>
                  <input
                    id={`${requestId}-${course.key}-count`}
                    name="credit_count"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    required
                    value={courses[index].count}
                    onChange={(e) =>
                      setCourses(
                        courses.map((row, i) =>
                          i === index ? { ...row, count: e.target.value } : row,
                        ),
                      )
                    }
                  />
                </label>
              ))}
            </fieldset>
          )}
          {kind === 'other' && (
            <fieldset>
              <legend>Fee details</legend>
              <label>
                Fee name
                <input name="fee_name" required maxLength={100} />
              </label>
              <label>
                Total to collect (USD)
                <input
                  name="total_price"
                  type="number"
                  min="0.50"
                  max="100000"
                  step="0.01"
                  required
                />
              </label>
              <label>
                Note (optional)
                <textarea
                  name="fee_note"
                  maxLength={90}
                  placeholder="e.g. Winter camp, December 21–23"
                />
              </label>
              <p>For camp, events, or other fees. This payment does not include lesson credits.</p>
            </fieldset>
          )}
          <details className={styles.issueOptions}>
            <summary>More options</summary>
            <label>
              Due date (optional)
              <input type="date" name="due" />
            </label>
            <label>
              Replaces an earlier payment request (optional)
              <select name="replaces">
                <option value="">None</option>
                {bills.map((bill) => (
                  <option key={bill.id} value={bill.id}>
                    {bill.bill_number} · {money(bill.amount_cents, bill.currency)}
                  </option>
                ))}
              </select>
            </label>
          </details>
        </div>
        {review && (
          <div className={styles.issueReview}>
            <ul className={styles.items}>
              {review.map((item, i) => (
                <li key={i}>
                  <span>
                    {item.description}
                    {kind === 'courses' && <small>{itemDetail(item, 'usd')}</small>}
                  </span>
                </li>
              ))}
            </ul>
            <p className={styles.issueTotal}>
              Total <strong>{money(total ?? 0, 'usd')} USD</strong>
            </p>
            {reviewDue !== 'Not set' && <p>Due date: {reviewDue}</p>}
            <p>
              {kind === 'courses'
                ? 'Lesson dates are arranged separately. '
                : 'This payment does not include lesson credits. '}
              The payment details and total cannot be changed after creation. Creating a request
              does not charge the student.
            </p>
            {!saved && (
              <label className={styles.confirm}>
                <input name="confirmed" value="yes" type="checkbox" required />I checked the
                student, items, and total.
              </label>
            )}
            {!saved && (
              <button type="button" onClick={edit}>
                Back to edit
              </button>
            )}
          </div>
        )}
        {!saved && (
          <button
            className={styles.primaryAction}
            disabled={
              pending || (kind === 'courses' && !courses.some((course) => Number(course.count) > 0))
            }
          >
            {pending ? 'Creating…' : review ? 'Create payment link' : 'Review payment details'}
          </button>
        )}
      </fieldset>
      {validation && <p role="alert">{validation}</p>}
      {state.error && !saved && <p role="alert">{state.error}</p>}
      {saved && (
        <>
          <p role="status">
            Payment request saved. When online payment is available, copy the link or send a payment
            email below.
          </p>
          {savedBill && (
            <BillShareTools
              bill={savedBill}
              owner={owner}
              ownerName={ownerName}
              paymentOrigin={paymentOrigin}
            />
          )}
          <button
            type="button"
            onClick={() => {
              setRequestId(crypto.randomUUID())
              setCourses(courseOptions.map((course) => ({ key: course.key, count: '0' })))
              formRef.current?.reset()
              edit()
            }}
          >
            Create another payment link
          </button>
        </>
      )}
    </form>
  )
}
