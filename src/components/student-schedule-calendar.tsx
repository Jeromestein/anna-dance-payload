'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import {
  type AccountScheduleEntry,
  formatScheduleEntry,
  getScheduleSourceLabel,
  getScheduleStatusLabel,
} from '@/lib/account/schedule'

import styles from './student-account-dashboard.module.css'

type StudentScheduleCalendarProps = {
  entries: AccountScheduleEntry[]
  loadError?: boolean
}

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getEntryDateKey(entry: AccountScheduleEntry | undefined) {
  if (!entry) return ''

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: entry.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(entry.startsAt))
    const year = parts.find((part) => part.type === 'year')?.value
    const month = parts.find((part) => part.type === 'month')?.value
    const day = parts.find((part) => part.type === 'day')?.value

    if (year && month && day) return `${year}-${month}-${day}`
  } catch {
    // Fall through to the ISO date when an imported timezone is invalid.
  }

  return entry.startsAt.slice(0, 10)
}

function getMonthDetails(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number)
  const firstDay = new Date(Date.UTC(year, month - 1, 1))

  return {
    leadingDays: firstDay.getUTCDay(),
    dayCount: new Date(Date.UTC(year, month, 0)).getUTCDate(),
    label: new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(firstDay),
  }
}

function formatDateKey(dateKey: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${dateKey}T12:00:00.000Z`))
}

function shiftMonth(monthKey: string, amount: number) {
  const [year, month] = monthKey.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1 + amount, 1))
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`
}

function groupEntriesByDate(entries: AccountScheduleEntry[]) {
  const entriesByDate = new Map<string, AccountScheduleEntry[]>()

  for (const entry of entries) {
    const dateKey = getEntryDateKey(entry)
    const existing = entriesByDate.get(dateKey)
    if (existing) existing.push(entry)
    else entriesByDate.set(dateKey, [entry])
  }

  return entriesByDate
}

export function StudentScheduleCalendar({
  entries,
  loadError = false,
}: StudentScheduleCalendarProps) {
  const activeEntries = useMemo(
    () => entries.filter((entry) => entry.status !== 'cancelled'),
    [entries],
  )
  const cancelledEntries = useMemo(
    () => entries.filter((entry) => entry.status === 'cancelled'),
    [entries],
  )
  const activeEntriesByDate = useMemo(() => groupEntriesByDate(activeEntries), [activeEntries])
  const cancelledEntriesByDate = useMemo(
    () => groupEntriesByDate(cancelledEntries),
    [cancelledEntries],
  )
  const firstDateKey = getEntryDateKey(activeEntries[0] || cancelledEntries[0] || entries[0])
  const todayKey = new Date().toISOString().slice(0, 10)
  const initialDate = firstDateKey || todayKey
  const [visibleMonth, setVisibleMonth] = useState(initialDate.slice(0, 7))
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const monthDetails = getMonthDetails(visibleMonth)
  const selectedEntries = activeEntriesByDate.get(selectedDate) ?? []
  const selectedCancelledEntries = cancelledEntriesByDate.get(selectedDate) ?? []

  function selectMonth(monthKey: string, preferredDate?: string) {
    const firstActiveDate = Array.from(activeEntriesByDate.keys())
      .filter((dateKey) => dateKey.startsWith(`${monthKey}-`))
      .sort()[0]
    const firstCancelledDate = Array.from(cancelledEntriesByDate.keys())
      .filter((dateKey) => dateKey.startsWith(`${monthKey}-`))
      .sort()[0]

    setVisibleMonth(monthKey)
    setSelectedDate(preferredDate || firstActiveDate || firstCancelledDate || `${monthKey}-01`)
  }

  if (loadError) {
    return (
      <p className={styles.scheduleMessage} role="alert">
        We could not refresh your appointments. Please try again shortly.
      </p>
    )
  }

  if (entries.length === 0) {
    return (
      <div className={styles.emptySchedule}>
        <strong>No upcoming appointments</strong>
        <p>Your linked consultations and lessons will appear here.</p>
        <Link className="button button-secondary" href="/schedule#book">
          Book a consultation
        </Link>
      </div>
    )
  }

  return (
    <div className={styles.scheduleBody}>
      <section className={styles.calendar} aria-label={`${monthDetails.label} schedule calendar`}>
        <header className={styles.calendarTitle}>
          <div>
            <span>Schedule calendar</span>
            <strong>{monthDetails.label}</strong>
          </div>
          <nav aria-label="Calendar navigation">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => selectMonth(shiftMonth(visibleMonth, -1))}
            >
              ←
            </button>
            <button type="button" onClick={() => selectMonth(todayKey.slice(0, 7), todayKey)}>
              Today
            </button>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => selectMonth(shiftMonth(visibleMonth, 1))}
            >
              →
            </button>
          </nav>
        </header>

        <div className={styles.weekdays} aria-hidden="true">
          {weekdayLabels.map((weekday) => (
            <span key={weekday}>{weekday}</span>
          ))}
        </div>
        <div className={styles.days}>
          {Array.from({ length: monthDetails.leadingDays }, (_, index) => (
            <span className={styles.emptyDay} key={`leading-${index}`} />
          ))}
          {Array.from({ length: monthDetails.dayCount }, (_, index) => {
            const day = index + 1
            const dateKey = `${visibleMonth}-${String(day).padStart(2, '0')}`
            const dateEntries = activeEntriesByDate.get(dateKey) ?? []
            const isSelected = selectedDate === dateKey

            return (
              <button
                type="button"
                className={`${styles.day}${dateEntries.length ? ` ${styles.eventDay}` : ''}${isSelected ? ` ${styles.selectedDay}` : ''}`}
                key={dateKey}
                aria-label={`${formatDateKey(dateKey)}, ${dateEntries.length} active ${dateEntries.length === 1 ? 'appointment' : 'appointments'}`}
                aria-pressed={isSelected}
                onClick={() => setSelectedDate(dateKey)}
              >
                <span>{day}</span>
                {dateEntries.length > 0 && <i>{dateEntries.length}</i>}
              </button>
            )
          })}
        </div>
        <footer className={styles.calendarLegend}>
          <span>
            <i /> Appointment day
          </span>
          <span>
            <i /> Selected day
          </span>
        </footer>
      </section>

      <section className={styles.selectedSchedule} aria-label="Selected day schedule">
        <header className={styles.selectedScheduleHeader}>
          <span>Selected day</span>
          <strong>{formatDateKey(selectedDate)}</strong>
          <small>
            {selectedEntries.length
              ? `${selectedEntries.length} active ${selectedEntries.length === 1 ? 'appointment' : 'appointments'}`
              : 'No active appointments'}
          </small>
        </header>

        {selectedEntries.length > 0 ? (
          <div className={styles.eventList} aria-label="Selected day appointments">
            {selectedEntries.map((entry) => {
              const display = formatScheduleEntry(entry)

              return (
                <article className={styles.event} key={entry.id}>
                  <time className={styles.eventDate} dateTime={entry.startsAt}>
                    <span>{display.month}</span>
                    <strong>{display.day}</strong>
                  </time>
                  <div className={styles.eventInfo}>
                    <strong>{entry.title}</strong>
                    <span>
                      {display.time} · {entry.location || 'Location to be confirmed'}
                    </span>
                    <small>{getScheduleStatusLabel(entry)}</small>
                  </div>
                  <span
                    className={`${styles.sourceTag} ${entry.source === 'cal_com' ? styles.sourceCal : ''}`}
                  >
                    {getScheduleSourceLabel(entry)}
                  </span>
                </article>
              )
            })}
          </div>
        ) : (
          <div className={styles.selectedScheduleEmpty}>
            <strong>No classes this day</strong>
            <p>Select a highlighted date to view your appointment.</p>
          </div>
        )}

        {selectedCancelledEntries.length > 0 && (
          <details className={styles.cancelledSchedule}>
            <summary>Cancelled ({selectedCancelledEntries.length})</summary>
            <div className={styles.cancelledScheduleList}>
              {selectedCancelledEntries.map((entry) => {
                const display = formatScheduleEntry(entry)

                return (
                  <article key={entry.id}>
                    <strong>{entry.title}</strong>
                    <span>{display.time}</span>
                  </article>
                )
              })}
            </div>
          </details>
        )}
      </section>
    </div>
  )
}
