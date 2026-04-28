-- Add reference column to ledger_entries for storing voucher/transaction references on expenses
ALTER TABLE ledger_entries ADD COLUMN reference TEXT;
