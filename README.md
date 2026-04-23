# GSF Trust — Foundation Accounts Manager

A treasurer-operated web application for GSF Foundation that replaces a multi-sheet Excel workbook with a purpose-built ledger system. Manages member subscriptions, donations, medical assistance, scholarship payouts, and the general/zakat ledgers across ~25 members.

**Production:** https://gsf-trust.gsftrust-official.workers.dev  
**Preview (dev branch):** auto-deployed on every push to `dev`  
**Stack:** Next.js 15 · Cloudflare Workers · Cloudflare D1 (SQLite) · Tailwind v4 · shadcn/ui  
**Full spec:** [`CLAUDE.md`](./CLAUDE.md) — read this before touching anything.

---

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/GSF-Trust-Official/gsf-trust.git
cd gsf-trust
npm install
```

### 2. Environment variables

Copy the example file and fill in the values:

```bash
cp .env.example .env.local
```

| Variable | How to get it |
|----------|--------------|
| `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `RESEND_API_KEY` | Resend dashboard → API Keys |
| `GOOGLE_DRIVE_FOLDER_ID` | Google Drive → folder → share link → extract ID |
| `NODE_ENV` | Set to `development` locally |

### 3. Apply database migrations (local)

```bash
# Apply all migrations in order
npx wrangler d1 execute gsf-accounts-db --local --file=cloudflare/migrations/001_initial_schema.sql
npx wrangler d1 execute gsf-accounts-db --local --file=cloudflare/migrations/002_update_user_roles.sql
npx wrangler d1 execute gsf-accounts-db --local --file=cloudflare/migrations/003_seed_treasurer.sql
# Add any subsequent migrations in numbered order
```

Local D1 state is stored in `.wrangler/state/` — this folder is gitignored.

### 4. Run the local dev server

```bash
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000). Uses Next.js's dev server — fast reloads, no Workers runtime. Good for UI work.

### 5. Run the Cloudflare Workers preview locally

```bash
npm run preview:cf
```

Builds with OpenNext and runs Wrangler's local Workers emulator. Use this to test anything that touches the edge runtime (auth, D1 queries, cookies). Opens at [http://localhost:8788](http://localhost:8788).

---

## Deploying

Deployments are automatic via GitHub Actions:

| Branch | Target | URL |
|--------|--------|-----|
| `main` | Production | `gsf-trust.gsftrust-official.workers.dev` |
| `dev` | Preview | auto-generated preview URL |

**Never push directly to `main`.** The flow is: `feature/xxx` → PR to `dev` → Treasurer reviews preview → PR to `main` → auto-deploy.

To deploy manually:

```bash
npm run deploy
```

This runs `build:cf` (OpenNext build) then `wrangler deploy`.

---

## Applying a New Migration

**Never edit a migration file after it has been applied to production.** Write a new numbered file instead.

```bash
# 1. Write the new file
touch cloudflare/migrations/00X_description.sql

# 2. Apply locally and verify
npx wrangler d1 execute gsf-accounts-db --local --file=cloudflare/migrations/00X_description.sql

# 3. Run the reconciliation query to verify data integrity (see below)

# 4. Apply to production
npx wrangler d1 execute gsf-accounts-db --remote --file=cloudflare/migrations/00X_description.sql

# 5. Commit the migration file
git add cloudflare/migrations/00X_description.sql
git commit -m "chore: add migration 00X description"
```

Take a manual DB export before any destructive migration:

```bash
wrangler d1 export gsf-accounts-db --remote --output=backups/pre-migration-YYYY-MM-DD.sql
```

---

## Reconciliation Query

After any bulk operation or migration, verify the ledger totals:

```sql
SELECT
  SUM(CASE WHEN is_deleted = 0 THEN amount ELSE 0 END) AS grand_total,
  SUM(CASE WHEN account = 'general' AND is_deleted = 0 THEN amount ELSE 0 END) AS general_total,
  SUM(CASE WHEN account = 'zakat'   AND is_deleted = 0 THEN amount ELSE 0 END) AS zakat_total,
  COUNT(*) AS entry_count
FROM ledger_entries;
```

After the Excel migration, `grand_total` must equal **457900**. Do not go live until it does.

Run via Wrangler:

```bash
npx wrangler d1 execute gsf-accounts-db --remote \
  --command="SELECT SUM(CASE WHEN is_deleted=0 THEN amount ELSE 0 END) AS grand_total FROM ledger_entries;"
```

Zakat isolation check (must always return 0):

```bash
npx wrangler d1 execute gsf-accounts-db --remote \
  --command="SELECT COUNT(*) FROM ledger_entries WHERE account='zakat' AND amount<0 AND category!='Scholarship' AND is_deleted=0;"
```

---

## Manual Backup

The app runs a weekly automated backup every Sunday at midnight IST (Cloudflare Cron Trigger → `/api/backup`). To trigger a manual backup:

1. Log in as Treasurer (admin)
2. Go to **Settings → Backup Now**

Or call the endpoint directly (requires the backup secret token from env vars):

```bash
curl -X POST https://gsf-trust.gsftrust-official.workers.dev/api/backup \
  -H "Authorization: Bearer $BACKUP_SECRET"
```

Backups are uploaded to the Foundation's Google Drive folder.

---

## Project Structure

```
gsf-trust/
├── app/
│   ├── (auth)/login/          # Login page (public)
│   ├── (auth)/register/       # Self-registration form (public)
│   ├── (app)/                 # Authenticated routes (admin/editor/viewer)
│   │   ├── dashboard/
│   │   ├── members/
│   │   ├── subscriptions/
│   │   ├── ledger/            # General ledger
│   │   ├── zakat/             # Zakat ledger (restricted)
│   │   ├── donations/
│   │   ├── medical/
│   │   ├── scholarship/       # Payouts log + announcement board
│   │   ├── payments/          # Banking details + UPI QR
│   │   ├── reports/
│   │   └── settings/
│   ├── me/                    # Member self-service portal (role=member only)
│   └── api/                   # Edge API routes
├── components/
│   ├── ui/                    # shadcn primitives
│   ├── forms/
│   ├── charts/
│   ├── tables/
│   └── modals/
├── lib/
│   ├── db.ts                  # D1 client helper
│   ├── auth.ts                # JWT + bcrypt
│   ├── audit.ts               # Audit log writer
│   ├── email.ts               # Resend wrapper
│   ├── queries/               # Typed D1 queries (one file per entity)
│   └── validators/            # Zod schemas
├── cloudflare/
│   └── migrations/            # Numbered SQL files — never edit after applied
├── types/index.ts             # TypeScript interfaces matching DB schema
├── middleware.ts              # JWT auth guard
├── wrangler.toml              # Cloudflare Workers config
└── CLAUDE.md                  # Full project spec — read before coding
```

---

## Roles

| Role | Who | Access |
|------|-----|--------|
| `admin` | Treasurer | Full read/write, user management, soft-delete, settings |
| `editor` | Board write-access | Log + edit transactions, manage members — no delete or user management |
| `viewer` | Board read-only | View all Foundation data, audit log — no writes |
| `member` | Foundation member | Own data only (subscriptions, donations, receipts) — row-level security |

---

## Key Design Decisions

- **No ORM.** Raw SQL via `db.prepare(...).bind(...).all<T>()`. All queries in `lib/queries/`.
- **No stored running balance.** Computed via SQL window function on every ledger query — never gets stale after edits or soft-deletes.
- **Soft delete only.** `is_deleted = 1` + `deleted_at` + `deleted_by`. Nothing is ever hard-deleted.
- **Every write is audited.** `audit_log` captures `before_json` and `after_json` for every mutation, in the same `db.batch()` as the mutation itself.
- **Zakat is restricted.** Zakat account outflows are rejected server-side if category is not `Scholarship`.
- **Edge runtime only.** No Node.js-only packages. Verify edge compatibility before installing anything.
- **No R2.** File exports (PDF/Excel) go to Google Drive. QR codes and receipt PDFs are generated on the fly.

---

## Credentials & Handover

Credentials are in a password-protected PDF sent to `gsftrust.official@gmail.com`. Contact the Treasurer if you need access.

For infrastructure access, the Foundation owns all accounts:
- **GitHub:** `GSF-Trust-Official` org
- **Cloudflare:** `gsftrust.official@gmail.com` account
- **Resend:** team member access via Foundation email
- **Google Drive:** "Project GSF Backups" folder

---

## Contact

**Developer:** Muhammed Suhaib  
**Email:** suhaib.muhammed2002@gmail.com  
**Phone:** +91 76392 58738

For bugs and feature requests, open a GitHub Issue in this repo.
