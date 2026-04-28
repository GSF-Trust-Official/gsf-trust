-- Migration 008: Scholarship announcements bulletin board.
-- Separate from scholarship_payouts — this is a public-facing noticeboard
-- that Treasurer/editor posts to and all roles (including members) can view.

CREATE TABLE IF NOT EXISTS scholarship_announcements (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  eligibility_criteria TEXT,
  deadline TEXT,
  contact TEXT,
  poster_drive_url TEXT,
  documents_drive_url TEXT,
  form_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
  posted_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_scholarship_announcements_active
  ON scholarship_announcements(is_active);
