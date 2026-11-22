import type { DatabaseSync } from 'node:sqlite'
import { formatInstant } from './availability.js'
import type { MeetingType } from './meeting-types.js'

export type MeetingTypeSummary = {
  id: number
  name: string
  durationMinutes: number
}

export type Meeting = {
  id: number
  meetingType: MeetingTypeSummary
  start: string
  end: string
  guestName: string
  guestEmail: string
  guestAdditionalInfo?: string
}

export type NewMeeting = {
  startMs: number
  endMs: number
  guestName: string
  guestEmail: string
  guestAdditionalInfo?: string
}

export type CreateMeetingResult = { ok: true; meeting: Meeting } | { ok: false }

export function createMeeting(
  db: DatabaseSync,
  meetingType: MeetingType,
  meeting: NewMeeting,
): CreateMeetingResult {
  db.exec('BEGIN IMMEDIATE')

  try {
    const occupying = db
      .prepare('SELECT 1 AS taken FROM meetings WHERE start_ms < ? AND end_ms > ? LIMIT 1')
      .get(meeting.endMs, meeting.startMs)

    if (occupying !== undefined) {
      db.exec('ROLLBACK')
      return { ok: false }
    }

    const result = db
      .prepare(
        `INSERT INTO meetings
          (meeting_type_id, start_ms, end_ms, guest_name, guest_email, guest_additional_info)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        meetingType.id,
        meeting.startMs,
        meeting.endMs,
        meeting.guestName,
        meeting.guestEmail,
        meeting.guestAdditionalInfo ?? null,
      )

    db.exec('COMMIT')

    return {
      ok: true,
      meeting: {
        id: Number(result.lastInsertRowid),
        meetingType: {
          id: meetingType.id,
          name: meetingType.name,
          durationMinutes: meetingType.durationMinutes,
        },
        start: formatInstant(meeting.startMs),
        end: formatInstant(meeting.endMs),
        guestName: meeting.guestName,
        guestEmail: meeting.guestEmail,
        ...(meeting.guestAdditionalInfo === undefined
          ? {}
          : { guestAdditionalInfo: meeting.guestAdditionalInfo }),
      },
    }
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}
