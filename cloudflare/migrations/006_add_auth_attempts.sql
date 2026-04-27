-- Migration 006: Track login attempts for throttling known and unknown emails.

CREATE TABLE IF NOT EXISTS auth_attempts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT NOT NULL,
  ip_address TEXT,
  success INTEGER NOT NULL DEFAULT 0 CHECK (success IN (0, 1)),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_auth_attempts_email_date
  ON auth_attempts(email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auth_attempts_ip_date
  ON auth_attempts(ip_address, created_at DESC);
