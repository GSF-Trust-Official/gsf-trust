-- Add updated_at column so edit operations can record when an entry was last modified.
-- Add notes column so expense/interest entries can carry optional free-text notes.
-- Existing rows get NULL for both (they predate the columns).
ALTER TABLE ledger_entries ADD COLUMN updated_at TEXT;
ALTER TABLE ledger_entries ADD COLUMN notes TEXT;
