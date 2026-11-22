import type { DatabaseSync } from 'node:sqlite'

export type OccupiedInterval = {
  meetingTypeId: number
  start: string
  end: string
}

// Test fixture for #19: availability needs occupied intervals, while the public
// booking endpoint arrives in #20.
export function occupyInterval(db: DatabaseSync, interval: OccupiedInterval): void {
  db.prepare('INSERT INTO meetings (meeting_type_id, start_ms, end_ms) VALUES (?, ?, ?)').run(
    interval.meetingTypeId,
    Date.parse(interval.start),
    Date.parse(interval.end),
  )
}
