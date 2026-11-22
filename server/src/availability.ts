import type { DatabaseSync } from 'node:sqlite'
import type { MeetingType } from './meeting-types.js'

const TBILISI_OFFSET_MINUTES = 4 * 60
const MINUTES_IN_MS = 60_000
const WORKDAY_START_MINUTES = 10 * 60
const WORKDAY_END_MINUTES = 18 * 60
const SLOT_STEP_MINUTES = 30
const WINDOW_DAYS = 14

export type Slot = {
  start: string
  end: string
}

export type AvailabilityDay = {
  date: string
  slots: Slot[]
}

export type MeetingTypeAvailability = {
  days: AvailabilityDay[]
}

type CalendarDate = {
  year: number
  month: number
  day: number
}

type OccupiedInterval = {
  start_ms: number
  end_ms: number
}

function tbilisiDate(instant: Date): CalendarDate {
  const local = new Date(instant.getTime() + TBILISI_OFFSET_MINUTES * MINUTES_IN_MS)

  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth() + 1,
    day: local.getUTCDate(),
  }
}

function addDays(date: CalendarDate, days: number): CalendarDate {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days))

  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  }
}

function tbilisiMidnightMs(date: CalendarDate): number {
  return Date.UTC(date.year, date.month - 1, date.day) - TBILISI_OFFSET_MINUTES * MINUTES_IN_MS
}

function isWeekend(date: CalendarDate): boolean {
  const dayOfWeek = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay()

  return dayOfWeek === 0 || dayOfWeek === 6
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function formatDate(date: CalendarDate): string {
  return `${date.year}-${pad(date.month)}-${pad(date.day)}`
}

function formatTime(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}

function formatSlot(date: CalendarDate, minutes: number): string {
  return `${formatDate(date)}T${formatTime(minutes)}:00+04:00`
}

function lastStartMinutes(durationMinutes: number): number {
  const availableMinutes = WORKDAY_END_MINUTES - WORKDAY_START_MINUTES

  return (
    WORKDAY_START_MINUTES +
    SLOT_STEP_MINUTES * Math.floor((availableMinutes - durationMinutes) / SLOT_STEP_MINUTES)
  )
}

export function getMeetingTypeAvailability(
  db: DatabaseSync,
  meetingType: MeetingType,
  now: Date,
): MeetingTypeAvailability {
  const firstDate = addDays(tbilisiDate(now), 1)
  const occupied = db
    .prepare('SELECT start_ms, end_ms FROM meetings WHERE start_ms < ? AND end_ms > ?')
    .all(
      tbilisiMidnightMs(addDays(firstDate, WINDOW_DAYS)),
      tbilisiMidnightMs(firstDate),
    ) as unknown as OccupiedInterval[]

  const days: AvailabilityDay[] = []

  for (let offset = 0; offset < WINDOW_DAYS; offset += 1) {
    const date = addDays(firstDate, offset)
    const slots: Slot[] = []

    if (!isWeekend(date)) {
      const midnightMs = tbilisiMidnightMs(date)
      const lastStart = lastStartMinutes(meetingType.durationMinutes)

      for (let start = WORKDAY_START_MINUTES; start <= lastStart; start += SLOT_STEP_MINUTES) {
        const startMs = midnightMs + start * MINUTES_IN_MS
        const endMs = startMs + meetingType.durationMinutes * MINUTES_IN_MS
        const isOccupied = occupied.some(
          (interval) => startMs < interval.end_ms && interval.start_ms < endMs,
        )

        if (!isOccupied) {
          slots.push({
            start: formatSlot(date, start),
            end: formatSlot(date, start + meetingType.durationMinutes),
          })
        }
      }
    }

    days.push({ date: formatDate(date), slots })
  }

  return { days }
}
