-- Migration 001: Initial schema
-- Applied: never edit this file after applying to production; write a new migration instead.

-- Users (Treasurer + Board members)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'viewer')),
  is_active INTEGER NOT NULL DEFAULT 1,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  two_factor_secret TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_login TEXT
);

-- Members
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  join_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  is_bod INTEGER NOT NULL DEFAULT 0,
  bod_designation TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Ledger entries (source of truth for all balances)
-- Defined before subscriptions because subscriptions references it
CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  date TEXT NOT NULL,
  account TEXT NOT NULL CHECK (account IN ('general','zakat')),
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

-- Subscriptions (one row per member per month-year)
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  member_id TEXT NOT NULL REFERENCES members(id),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('paid','due','na')),
  amount REAL DEFAULT 300.00,
  paid_date TEXT,
  mode TEXT CHECK (mode IN ('bank','upi','cash',NULL)),
  reference TEXT,
  notes TEXT,
  ledger_entry_id TEXT REFERENCES ledger_entries(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(member_id, month, year)
);

-- Donations
CREATE TABLE IF NOT EXISTS donations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  date TEXT NOT NULL,
  member_id TEXT REFERENCES members(id),
  donor_name TEXT,
  type TEXT NOT NULL CHECK (type IN ('hadiya','zakat','other')),
  category TEXT NOT NULL CHECK (category IN ('general','medical','scholarship','emergency')),
  amount REAL NOT NULL,
  mode TEXT,
  reference TEXT,
  notes TEXT,
  ledger_entry_id TEXT REFERENCES ledger_entries(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Medical cases
CREATE TABLE IF NOT EXISTS medical_cases (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  case_ref TEXT NOT NULL UNIQUE,
  beneficiary_name TEXT NOT NULL,
  mask_name INTEGER NOT NULL DEFAULT 0,
  amount_requested REAL NOT NULL,
  amount_paid REAL DEFAULT 0,
  amount_external REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  opened_at TEXT NOT NULL,
  closed_at TEXT,
  description TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Scholarship payouts
CREATE TABLE IF NOT EXISTS scholarship_payouts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  beneficiary_name TEXT NOT NULL,
  member_id TEXT REFERENCES members(id),
  academic_year TEXT NOT NULL,
  amount REAL NOT NULL,
  eligibility_notes TEXT,
  paid_on TEXT NOT NULL,
  ledger_entry_id TEXT REFERENCES ledger_entries(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Audit log (immutable — never update or delete rows)
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL CHECK (action IN ('create','update','delete','login','logout','failed_login')),
  entity TEXT NOT NULL,
  entity_id TEXT,
  before_json TEXT,
  after_json TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Settings (key-value for foundation config)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')),
  updated_by TEXT REFERENCES users(id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_member ON subscriptions(member_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_year ON subscriptions(year, month);
CREATE INDEX IF NOT EXISTS idx_ledger_date ON ledger_entries(date DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_account ON ledger_entries(account);
CREATE INDEX IF NOT EXISTS idx_ledger_category ON ledger_entries(category);
CREATE INDEX IF NOT EXISTS idx_ledger_member ON ledger_entries(member_id);
CREATE INDEX IF NOT EXISTS idx_ledger_not_deleted ON ledger_entries(is_deleted) WHERE is_deleted = 0;
CREATE INDEX IF NOT EXISTS idx_donations_type ON donations(type);
CREATE INDEX IF NOT EXISTS idx_donations_date ON donations(date DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user_date ON audit_log(user_id, created_at DESC);
