'use client'

import { startTransition, useActionState, useRef, useState } from 'react'
import { manageBill } from '@/actions/billing'
import {
  money,
  readItems,
  readAgreedTotal,
  itemDetail,
  itemAmount,
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
  const [items, setItems] = useState([{ key: 0, description: '', quantity: '1', price: '' }])
  const [review, setReview] = useState<BillItem[] | null>(null)
  const [validation, setValidation] = useState('')
  const [courses, setCourses] = useState([{ key: 'solo30', count: '1' }])
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
              <option value="courses">Course lessons · agreed total</option>
              <option value="fixed">Other payment / camp · custom total</option>
              <option value="general">Other itemized payment</option>
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
              <p>
                Enter the agreed total for this entire request. List the included lessons below.
              </p>
              {courses.map((row, index) => (
                <div className={styles.row} key={index}>
                  <label>
                    Course {index + 1}
                    <select
                      name="course_key"
                      value={row.key}
                      onChange={(e) =>
                        setCourses(
                          courses.map((c, i) => (i === index ? { ...c, key: e.target.value } : c)),
                        )
                      }
                    >
                      {courseOptions.map((course) => (
                        <option key={course.key} value={course.key}>
                          {course.name} · {course.minutes} minutes
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Number of lessons
                    <input
                      name="credit_count"
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      required
                      value={row.count}
                      onChange={(e) =>
                        setCourses(
                          courses.map((c, i) =>
                            i === index ? { ...c, count: e.target.value } : c,
                          ),
                        )
                      }
                    />
                  </label>
                  {courses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setCourses(courses.filter((_, i) => i !== index))}
                    >
                      Remove course {index + 1}
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                disabled={courses.length >= 4}
                onClick={() =>
                  setCourses([
                    ...courses,
                    {
                      key:
                        courseOptions.find((c) => !courses.some((r) => r.key === c.key))?.key ??
                        'group',
                      count: '1',
                    },
                  ])
                }
              >
                Add course
              </button>
            </fieldset>
          )}
          {kind === 'fixed' && (
            <fieldset>
              <legend>Course and agreed fee</legend>
              <label>
                Course / camp name
                <input name="package_name" required maxLength={60} />
              </label>
              <div className={styles.row}>
                <label>
                  Number of lessons / days
                  <input
                    name="course_count"
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    defaultValue="1"
                    required
                  />
                </label>
                <label>
                  Unit
                  <select name="course_unit">
                    <option value="lessons">Lessons</option>
                    <option value="days">Days</option>
                  </select>
                </label>
              </div>
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
                Dates and fee explanation
                <textarea
                  name="coverage"
                  required
                  maxLength={100}
                  placeholder="e.g. December 5–19; includes 3 classes, after prior credit"
                />
              </label>
              <p>
                Enter the final agreed total. This option records a charge without creating course
                credits. The account holder will see these details.
              </p>
            </fieldset>
          )}
          {!['fixed', 'courses'].includes(kind) &&
            items.map((item, index) => (
              <fieldset key={item.key}>
                <legend>
                  {kind === 'lessons' ? 'Course' : 'Item'} {index + 1}
                </legend>
                <label>
                  {kind === 'lessons' ? 'Course / package name' : 'Description'}
                  <input
                    name="description"
                    required
                    maxLength={kind === 'lessons' ? 185 : 200}
                    value={item.description}
                    onChange={(e) =>
                      setItems(
                        items.map((i) =>
                          i.key === item.key ? { ...i, description: e.target.value } : i,
                        ),
                      )
                    }
                  />
                </label>
                <div className={styles.row}>
                  <label>
                    {kind === 'lessons' ? 'Number of lessons' : 'Quantity'}
                    <input
                      name="quantity"
                      type="number"
                      min="1"
                      max="100"
                      step="1"
                      required
                      value={item.quantity}
                      onChange={(e) =>
                        setItems(
                          items.map((i) =>
                            i.key === item.key ? { ...i, quantity: e.target.value } : i,
                          ),
                        )
                      }
                    />
                  </label>
                  <label>
                    {kind === 'lessons' ? 'Price per lesson (USD)' : 'Unit price (USD)'}
                    <input
                      name="price"
                      type="number"
                      min={kind === 'lessons' ? '0.01' : '0'}
                      max="100000"
                      step="0.01"
                      required
                      value={item.price}
                      onChange={(e) =>
                        setItems(
                          items.map((i) =>
                            i.key === item.key ? { ...i, price: e.target.value } : i,
                          ),
                        )
                      }
                    />
                  </label>
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setItems(items.filter((i) => i.key !== item.key))}
                  >
                    Remove item {index + 1}
                  </button>
                )}
              </fieldset>
            ))}
          {!['fixed', 'courses'].includes(kind) && (
            <button
              type="button"
              disabled={items.length >= 20}
              onClick={() =>
                setItems([
                  ...items,
                  {
                    key: Math.max(...items.map((i) => i.key)) + 1,
                    description: '',
                    quantity: '1',
                    price: '',
                  },
                ])
              }
            >
              Add item
            </button>
          )}
        </div>
        <div hidden={Boolean(review)}>
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
        </div>
        {review && (
          <div className={styles.issueReview}>
            <ul className={styles.items}>
              {review.map((item, i) => (
                <li key={i}>
                  <span>
                    {item.description}
                    <small>{itemDetail(item, 'usd')}</small>
                  </span>
                  <strong>{itemAmount(item, 'usd')}</strong>
                </li>
              ))}
            </ul>
            <p className={styles.issueTotal}>
              Total <strong>{money(total ?? 0, 'usd')} USD</strong>
            </p>
            <p>Due date: {reviewDue}</p>
            <p>
              {['lessons', 'courses'].includes(kind) && 'Lesson dates are arranged separately. '}The
              course details and total cannot be changed after creation. Creating a request does not
              charge the student.
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
          <button className={styles.primaryAction} disabled={pending}>
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
              setCourses([{ key: 'solo30', count: '1' }])
              setItems([{ key: 0, description: '', quantity: '1', price: '' }])
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
