# Database Restore Procedure

> Use this guide to restore GSF Trust data from a Google Drive backup CSV export.
> Run through this procedure once during UAT to confirm it works before going live.

---

## When You Need This

- Accidental data corruption or bulk-delete
- Failed migration that left the database in a bad state
- Disaster recovery after a Cloudflare incident

---

## What a Backup Contains

Each weekly backup uploads one CSV file per table to the Foundation's Google Drive folder:

| File | Table |
|------|-------|
| `gsf-backup-YYYY-MM-DD_members.csv` | All foundation members |
| `gsf-backup-YYYY-MM-DD_subscriptions.csv` | Subscription records |
| `gsf-backup-YYYY-MM-DD_ledger_entries.csv` | All ledger entries (source of truth for balances) |
| `gsf-backup-YYYY-MM-DD_donations.csv` | Donation records |
| `gsf-backup-YYYY-MM-DD_medical_cases.csv` | Medical assistance cases |
| `gsf-backup-YYYY-MM-DD_scholarship_payouts.csv` | Scholarship payouts |
| `gsf-backup-YYYY-MM-DD_scholarship_announcements.csv` | Announcements |
| `gsf-backup-YYYY-MM-DD_settings.csv` | App settings (banking details, etc.) |
| `gsf-backup-YYYY-MM-DD_audit_log.csv` | Last 5,000 audit log rows |

---

## Step 1 — Download the Backup

1. Open the Foundation's Google Drive folder ("Project GSF Backups")
2. Sort by date — choose the most recent backup set for the date you want to restore from
3. Download all CSV files for that date to your local machine

---

## Step 2 — Assess the Damage

Before restoring, decide the scope:

- **Full restore** (rare): drop and recreate the D1 database entirely
- **Partial restore** (common): re-insert specific rows that were accidentally deleted or corrupted

For most incidents, a partial restore is safer.

---

## Step 3 — Full Restore (Nuclear Option)

Only do this if the database is completely unrecoverable.

### 3a. Export current state first (even if broken)
```bash
wrangler d1 export gsf-accounts-db --remote --output=emergency-export-$(date +%Y-%m-%d).sql
```

### 3b. Create a test restore database to verify the backup works
```bash
wrangler d1 create gsf-accounts-db-restore-test
```

Update `wrangler.toml` temporarily to point to the new database ID, then apply all migrations:
```bash
wrangler d1 execute gsf-accounts-db-restore-test --remote --file=cloudflare/migrations/001_initial_schema.sql
wrangler d1 execute gsf-accounts-db-restore-test --remote --file=cloudflare/migrations/002_update_user_roles.sql
# ... repeat for all migrations in order (003 through 012)
```

### 3c. Import the CSV data

Convert CSV files to INSERT statements (use a tool like `csvkit`, or write a Node script). Then apply them:
```bash
wrangler d1 execute gsf-accounts-db-restore-test --remote --file=restore-inserts.sql
```

### 3d. Run the reconciliation query
```bash
wrangler d1 execute gsf-accounts-db-restore-test --remote --command="
SELECT
  SUM(CASE WHEN is_deleted = 0 THEN amount ELSE 0 END) AS grand_total,
  SUM(CASE WHEN account = 'general' AND is_deleted = 0 THEN amount ELSE 0 END) AS general_total,
  SUM(CASE WHEN account = 'zakat' AND is_deleted = 0 THEN amount ELSE 0 END) AS zakat_total,
  COUNT(*) AS entry_count
FROM ledger_entries;
"
```

The `grand_total` should match the expected Foundation balance at the backup date.

### 3e. Swap databases

If the test restore looks correct, update `wrangler.toml` to use the restored database ID and deploy.

---

## Step 4 — Partial Restore (Recommended for Most Incidents)

For targeted recovery (e.g. accidentally soft-deleted entries, wrong data entered):

### 4a. Identify the affected rows from the CSV

Open the relevant CSV in Excel or Google Sheets. Find the rows you need to restore.

### 4b. Write targeted INSERT or UPDATE statements

Example — restore a soft-deleted ledger entry:
```sql
UPDATE ledger_entries
SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL
WHERE id = 'the-entry-id-here';
```

Example — re-insert a deleted member:
```sql
INSERT INTO members (id, code, name, email, phone, join_date, status, created_at, updated_at)
VALUES ('original-id', 'GSF042', 'Member Name', 'email@example.com', NULL, '2024-01-01', 'active', datetime('now'), datetime('now'));
```

### 4c. Apply to the live database
```bash
wrangler d1 execute gsf-accounts-db --remote --command="UPDATE ledger_entries SET ..."
```

### 4d. Verify
Run the reconciliation query against the live database and confirm the total matches expectations.

---

## Isolation Verification Queries

Run these after any restore to confirm financial integrity:

**Zakat isolation (must return 0):**
```sql
SELECT COUNT(*) FROM ledger_entries
WHERE account = 'zakat' AND amount < 0 AND category != 'Scholarship' AND is_deleted = 0;
```

**Interest isolation (must return 0):**
```sql
SELECT COUNT(*) FROM ledger_entries
WHERE account = 'interest' AND amount < 0
  AND category NOT IN ('Distribution to Poor', 'Charity Distribution')
  AND is_deleted = 0;
```

---

## After a Full Restore

1. Log in to the app and verify the dashboard KPIs look correct
2. Check the most recent 10 ledger entries in each account
3. Verify member count matches the backup manifest
4. Run a manual backup immediately (Settings → Run Backup Now) so a fresh copy goes to Google Drive

---

## Contact

If you cannot complete a restore, contact the developer:
- **Muhammed Suhaib** — suhaib.muhammed2002@gmail.com · +91 76392 58738
