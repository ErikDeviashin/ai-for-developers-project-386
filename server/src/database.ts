import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS meeting_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL
      CHECK (duration_minutes IN (15, 30, 60, 120))
  );
`

export function openDatabase(filename = ':memory:'): DatabaseSync {
  if (filename !== ':memory:') {
    mkdirSync(dirname(filename), { recursive: true })
  }

  const db = new DatabaseSync(filename)
  db.exec(SCHEMA)

  return db
}
