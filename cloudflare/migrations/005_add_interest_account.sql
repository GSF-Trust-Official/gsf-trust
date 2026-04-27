-- Migration 005: Add 'interest' account type to ledger_entries.
-- Bank savings account interest (riba) is prohibited in Islam; it must be tracked
-- separately and distributed to the poor. This adds a third ring-fenced account
-- type alongside 'general' and 'zakat'. Outflows from this account may only be
-- distributions to the poor — enforced server-side in Phase 5.
-- SQLite cannot ALTER a CHECK constraint, so we recreate the table.

PRAGMA foreign_keys = OFF;

CREATE TABLE ledger_entries_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  date TEXT NOT NULL,
  account TEXT NOT NULL CHECK (account IN ('general','zakat','interest')),
  category TEXT NOT NULL,
  sub_category TEXT,
  member_id TEXT REFERENCES members(id),
  member_code TEXT,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  running_balance REAL,
  source_type TEXT,
  source_id TEXT,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  deleted_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  created_by TEXT REFERENCES users(id)
);

INSERT INTO ledger_entries_new SELECT * FROM ledger_entries;
DROP TABLE ledger_entries;
ALTER TABLE ledger_entries_new RENAME TO ledger_entries;

-- Restore indexes
CREATE INDEX IF NOT EXISTS idx_ledger_date ON ledger_entries(date DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_account ON ledger_entries(account);
CREATE INDEX IF NOT EXISTS idx_ledger_category ON ledger_entries(category);
CREATE INDEX IF NOT EXISTS idx_ledger_member ON ledger_entries(member_id);
CREATE INDEX IF NOT EXISTS idx_ledger_not_deleted ON ledger_entries(is_deleted) WHERE is_deleted = 0;

PRAGMA foreign_keys = ON;
