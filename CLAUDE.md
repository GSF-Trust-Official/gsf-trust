# CLAUDE.md — Project GSF

> **Purpose of this file:** This is the single source of truth for any AI assistant or developer working on the Project GSF project. Read this fully before writing any code. Every decision has already been made — your job is to execute cleanly, incrementally, and professionally.

---

## 0. PROJECT OVERVIEW

### 0.1 What this project is

Project GSF is a treasurer-operated web application that replaces the Foundation's existing multi-sheet Excel workbook with a purpose-built ledger system. It is a **financial application** — accuracy, auditability, and data integrity are non-negotiable.

The Foundation currently manages ~₹4,57,900 across two accounts (General and Zakat/GFES) with ~25 members, monthly subscriptions, donations, medical assistance cases, and scholarship payouts. Everything is tracked in Excel today, with all the problems that implies: formula drift, casing mismatches, no audit trail, no role-based access, no reliable backups.

**This is Version 1.** Scope is deliberately locked — see §4 for what's in and §13 for what's explicitly deferred to V2.

### 0.2 Who uses it

| Role | DB value | Count | Access |
|------|----------|-------|--------|
| Treasurer | `admin` | 1 | Full read/write + user management + soft-delete |
| Board Member (write) | `editor` | 0–12 | Log transactions, edit members — cannot delete or manage users |
| Board Member (read-only) | `viewer` | 0–12 | View all Foundation data, audit-ready, no write access |
| Foundation Member | `member` | up to ~50 | See only their own data (subs, donations, dues) — self-service portal built in V1 |

**Permission matrix:**

| Capability | admin | editor | viewer | member |
|-----------|-------|--------|--------|--------|
| Log transactions (subs, donations, expenses) | ✅ | ✅ | ❌ | ❌ |
| Edit transactions | ✅ | ✅ | ❌ | ❌ |
| Delete transactions (soft) | ✅ | ❌ | ❌ | ❌ |
| View all ledgers | ✅ | ✅ | ✅ | ❌ |
| View own payment history | ✅ | ✅ | ✅ | ✅ |
| Download own receipts (PDF) | ✅ | ✅ | ✅ | ✅ |
| Manage members (create/edit) | ✅ | ✅ | ❌ | ❌ |
| View members list | ✅ | ✅ | ✅ | ❌ |
| View own profile | ✅ | ✅ | ✅ | ✅ |
| Edit own profile (phone/email) | ✅ | ✅ | ✅ | ✅ |
| Post scholarship announcement | ✅ | ✅ | ❌ | ❌ |
| View scholarship announcement page | ✅ | ✅ | ✅ | ✅ |
| View payments page (banking + QR) | ✅ | ✅ | ✅ | ✅ |
| Approve registration requests | ✅ | ❌ | ❌ | ❌ |
| Manage users (invite, change roles) | ✅ | ❌ | ❌ | ❌ |
| Settings & backup | ✅ | ❌ | ❌ | ❌ |
| Export reports | ✅ | ✅ | ✅ | own data only |
| View audit log | ✅ | ✅ | ✅ | ❌ |

The `member` role is in the V1 schema and the self-service portal UI is built in V1 (Phase 13). Every member-facing route enforces row-level security — a member can only ever see their own data.

### 0.3 Non-negotiable principles

1. **Zakat is restricted.** Zakat funds may only flow to eligible categories (scholarship in V1). Enforce in UI *and* server-side.
2. **Every write is audited.** Every create/update/soft-delete lands in `audit_log` with before/after JSON. No silent overwrites.
3. **Soft delete only.** Transactions are never hard-deleted. History must be preserved.
4. **Server-side validation always.** Never trust the client. Role checks on every protected endpoint.
5. **Reconciliation gate.** The app does not go live until the grand total from migration matches ₹4,57,900 to the rupee.
6. **The Foundation owns everything.** All infrastructure accounts are in the Foundation's name. The developer is a collaborator, never an owner.

### 0.4 Ownership model (critical)

Every account — GitHub, Cloudflare, Resend, Google Drive backup folder, domain — is created by the Foundation, using the Foundation's Gmail, and the developer is added as a collaborator. Never create any account on the Foundation's behalf using a personal email. After handover, the developer's Cloudflare role is downgraded from Administrator to Read.

---

## 1. TECH STACK

### 1.1 Chosen stack (locked)
    
| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 14+ (App Router, TypeScript) | Industry standard, strong typing, good Cloudflare support |
| Hosting | Cloudflare Pages | Free, commercial use allowed, Mumbai/Chennai edge nodes, Foundation-friendly |
| Runtime | Cloudflare Workers (edge) | Fast globally, must use edge-compatible libraries only |
| Database | Cloudflare D1 (SQLite) | Free tier 5GB, serverless, automatic replication |
| File exports | Google Drive API | PDF/Excel exports uploaded directly; no R2 needed |
| Styling | Tailwind CSS + shadcn/ui | Utility-first, accessible primitives, easy to maintain |
| Forms | react-hook-form + zod | Type-safe validation, great DX |
| Charts | Recharts | Simple, React-native, good defaults |
| Auth | Custom JWT (jose library) | Edge-runtime compatible; NextAuth is not |
| Password hashing | bcryptjs | Edge-compatible bcrypt; 12 rounds |
| Email | Resend (free tier: 3000/mo) | Simple API, reliable delivery |
| Toasts | sonner | Minimal, accessible, good mobile UX |
| Date handling | date-fns | Tree-shakeable, timezone-safe |
| Utilities | clsx, tailwind-merge, lodash (sparingly) | Only where they add value |
| Excel export | `xlsx` (SheetJS) | Robust multi-sheet support |
| PDF export | `@react-pdf/renderer` | Works in edge runtime, simpler than puppeteer |
| QR code generation | `qrcode` | Pure-JS UPI QR generation; no external service, runs on Workers edge |
| Monitoring | UptimeRobot (free) | External ping every 5 min |

### 1.2 What NOT to use

- ❌ **NextAuth / Auth.js** — requires Node APIs not available in edge runtime
- ❌ **Prisma** (for now) — D1 works well with raw SQL + a thin helper; Prisma adds complexity
- ❌ **localStorage / sessionStorage** — for sensitive data; use httpOnly cookies only
- ❌ **Any Node-only library** — check edge compatibility before installing
- ❌ **Third-party analytics** (Google Analytics, etc.) — this is a private financial tool
- ❌ **Client-side database calls** — all D1 access goes through server routes

### 1.3 Edge-runtime compatibility rule

Before installing any package, verify it runs in the Cloudflare Workers edge runtime. If in doubt:
```bash
npm run build:cf
```
If the build fails with "Node.js API X is not supported", find an alternative.

---

## 2. INFRASTRUCTURE SETUP

### 2.1 Accounts the Treasurer owns (Foundation's name)

1. **Foundation Gmail** —  `gsftrust.official@gmail.com`, 2FA enabled, recovery phone added
2. **GitHub** — `gsf-trust` org, private repo `gsf-trust`, developer added as **Write access** (not Admin)
3. **Cloudflare** — developer added as **Administrator** during build, downgraded to **Read** after handover
4. **Resend** — developer added as team member, API key created once and stored in env vars
5. **Google Drive folder** — "Project GSF Backups", developer has Editor access, folder ID stored in env

### 2.2 Environment variables

Create `.env.example` (committed) and `.env.local` (never committed, already in `.gitignore`).

```bash
# .env.example
RESEND_API_KEY=
JWT_SECRET=
GOOGLE_DRIVE_FOLDER_ID=
NODE_ENV=development
```

**Generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Production env vars** go in Cloudflare Pages → Settings → Environment Variables, set for both **Production** and **Preview** environments.

### 2.3 wrangler.toml

```toml
name = "gsf-trust"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]
workers_dev = true

main = ".open-next/worker.js"

[assets]
directory = ".open-next/assets"

[[d1_databases]]
binding = "DB"
database_name = "gsf-accounts-db"
database_id = "f8bf6798-a34b-4e2f-b1fe-4a1b1ee0cea7"

# File exports and backups go to Google Drive — R2 is not used.
```

Commit this file. It contains no secrets.

### 2.4 Branches and deploys

- `main` → production (auto-deploys, live at `https://gsf-trust.gsftrust-official.workers.dev`)
- `dev` → preview — share this URL with the Treasurer weekly
- `feature/xxx` → branch from `dev`, merge back to `dev`
- `feature/xxx` → branch from `dev`, merge back to `dev`

**Flow:** `feature/xxx` → PR to `dev` → client reviews preview → PR to `main` at phase end → production auto-deploy.

Never commit directly to `main`.

---

## 3. REPOSITORY STRUCTURE

```
gsf-accounts/
├── app/                         # Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (app)/                   # authenticated routes
│   │   ├── dashboard/page.tsx
│   │   ├── members/
│   │   ├── subscriptions/
│   │   ├── ledger/
│   │   ├── zakat/
│   │   ├── donations/
│   │   ├── medical/
│   │   ├── scholarship/
│   │   ├── reports/
│   │   ├── settings/
│   │   └── layout.tsx           # sidebar layout
│   ├── api/                     # server routes
│   │   ├── auth/
│   │   ├── members/
│   │   ├── subscriptions/
│   │   ├── ledger/
│   │   ├── donations/
│   │   ├── medical/
│   │   ├── scholarship/
│   │   ├── reports/
│   │   └── backup/              # cron-triggered
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                      # shadcn primitives
│   ├── forms/                   # reusable form components
│   ├── charts/                  # Recharts wrappers
│   ├── tables/                  # ledger tables, matrices
│   └── modals/                  # Log Subscription, Log Donation, etc.
├── lib/
│   ├── db.ts                    # D1 client helpers
│   ├── auth.ts                  # JWT sign/verify, password hashing
│   ├── audit.ts                 # audit log writer
│   ├── email.ts                 # Resend wrapper
│   ├── validators/              # zod schemas
│   ├── queries/                 # typed D1 queries, one file per entity
│   └── utils.ts                 # formatting, cn() helper
├── cloudflare/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_seed_treasurer.sql
│       └── ...                  # numbered, never edited after applied
├── scripts/
│   ├── migrate-excel.ts         # one-time Excel → D1 migration
│   ├── reconcile.ts             # runs reconciliation queries
│   └── generate-password-hash.ts
├── types/
│   └── index.ts                 # shared TS types (kept in sync with SQL)
├── middleware.ts                # auth guard
├── wrangler.toml
├── next.config.ts
├── tailwind.config.ts
├── package.json
├── .env.example
├── .env.local                   # gitignored
├── .gitignore
├── CLAUDE.md                    # this file
└── README.md
```

### 3.1 Naming conventions

- **Files:** `kebab-case.tsx` for components, `camelCase.ts` for utilities
- **Components:** `PascalCase`
- **DB tables:** `snake_case`, plural (`members`, `ledger_entries`)
- **DB columns:** `snake_case`
- **TS types:** `PascalCase` matching DB entities (`Member`, `LedgerEntry`)
- **Zod schemas:** same name + `Schema` suffix (`MemberSchema`)

### 3.2 Commit message convention

```
feat: subscription tracker matrix with clickable cells
fix: currency formatting showing wrong locale in ledger
style: dashboard kpi card colours match design tokens
chore: add d1 migration for medical_cases table
docs: update readme with cloudflare deploy instructions
refactor: extract ledger query builder into lib/queries
test: add reconciliation test for zakat isolation
```

One logical change per commit. Commit often.

---

## 4. SCOPE — WHAT V1 INCLUDES

13 core modules, all functional end-to-end on mobile and desktop.

1. **Authentication** — Email + password, JWT in httpOnly cookie, optional 2FA for treasurer, forgot password, self-registration form with Treasurer approval workflow
2. **Dashboard** — KPI tiles (Total Funds, General, Zakat, Medical Pool, Outstanding Dues), Recharts (donation breakdown, expense allocation, collection rate), quick action buttons
3. **Members Roster** — CRUD, search, filter (Active/Inactive/BOD), per-member profile with contribution history
4. **Subscription Tracker** — P/D/N/A matrix, year selector, clickable cells, bulk mark-as-paid, arrears view
5. **General Ledger** — chronological, filters (date/category/member/in-out), running balance via window function, export; admin and editor can edit entries, admin can soft-delete
6. **Zakat Ledger** — completely separate, restricted badge, scholarship-only outflows; same edit/delete rules as General Ledger
7. **Donations Tracker** — Hadiya/Zakat/Other, auto-routed to correct account
8. **Medical Assistance Log** — cases with beneficiary (maskable), amounts, pledges, status
9. **Scholarship Log** — payouts, academic year, eligibility notes, Zakat-sourced
10. **Reports & Exports** — Annual report (Excel + PDF), Usage Breakdown, custom date-range exports
11. **Member Self-Service Portal** — Members log in and see only their own subscription history, donation history, outstanding dues, personal details, and downloadable PDF receipts; strict row-level security on every route
12. **Payments Page** — visible to all roles; displays Foundation's banking details (stored in Settings) and a dynamically generated UPI QR code via `qrcode` package
13. **Scholarship Announcements** — Treasurer/editor posts structured announcement (title, description, deadline, Google Drive poster link, Google Forms application link); all roles can view and access the form

---

## 5. DESIGN SYSTEM

### 5.1 Brand colors (use these tokens exactly)

```js
// tailwind.config.ts — extend
colors: {
  primary: '#004235',
  'primary-container': '#005c4b',
  'primary-fixed': '#a7f1da',
  'primary-fixed-dim': '#8bd5bf',
  'on-primary-fixed-variant': '#005142',
  'surface-low': '#f3f4f5',
  'surface-container': '#edeeef',
  'surface-high': '#e7e8e9',
  'outline-variant': '#bec9c4',
  'on-surface': '#191c1d',
  'on-surface-variant': '#3f4945',
  // semantic
  'success': '#0f7b5a',          // green for +amounts, paid chips
  'success-container': '#a7f1da',
  'warning': '#8b6a00',          // amber for due chips
  'warning-container': '#ffdea5',
  'error': '#ba1a1a',             // red for -amounts, restricted badge
  'error-container': '#ffdad6',
  'info': '#005c8a',
  'info-container': '#cfe6f2',
}
```

### 5.2 Typography

```js
fontFamily: {
  headline: ['"Plus Jakarta Sans"', 'sans-serif'],  // h1-h4, KPI numbers
  body: ['"Inter"', 'sans-serif'],                  // everything else
  mono: ['"JetBrains Mono"', 'monospace'],          // codes, IDs, refs
}
```

Load via `next/font` in `app/layout.tsx` — **not** via `<link>` in HTML. This ensures proper optimization.

### 5.3 Component patterns

**Chips / badges (subscription cells, status pills):**

| State | Background | Text | Letter |
|-------|-----------|------|--------|
| Paid | `bg-primary-fixed` | `text-on-primary-fixed-variant` | P |
| Due | `bg-warning-container` | `text-[#4d3600]` | D |
| N/A | `bg-info-container` | `text-[#003b52]` | N/A |
| Empty (future) | `bg-surface-container` | `text-[#6f7975]` | · |

**Amount formatting:**
- Positive amounts → `text-success` with `+ ` prefix
- Negative amounts → `text-error` with `− ` prefix (en-dash, not hyphen)
- Always format as `₹X,XX,XXX` using Indian grouping (`Intl.NumberFormat('en-IN')`)
- Never show trailing `.00` unless fractional

**KPI tiles:**
- Large `font-headline` number (`text-3xl md:text-4xl`)
- Small caption above (`text-xs uppercase tracking-widest`)
- Delta indicator below if applicable (`+4.2%` in `text-success`, `-1.1%` in `text-error`)

**Restricted badge (Zakat pages):**
```tsx
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-error-container text-error text-xs font-semibold">
  <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
  Restricted Account
</span>
```

### 5.4 Layout

- **Sidebar:** fixed left, 18rem (288px) wide on `xl+`, collapses to bottom tab bar on mobile
- **Content max width:** `max-w-7xl mx-auto px-4 md:px-8`
- **Card padding:** `p-4 md:p-6`
- **Vertical rhythm:** `space-y-6` between major sections, `space-y-3` within cards

### 5.5 Mobile responsiveness (non-negotiable from day one)

The treasurer will log payments from their **phone** while at meetings. Every feature must be usable on a 360px-wide screen.

**Breakpoints to test at every phase:**
- 360px (small Android)
- 390px (iPhone)
- 768px (iPad portrait)
- 1024px (iPad landscape / small laptop)
- 1440px (desktop)

**Mobile patterns:**
- **Subscription matrix:** horizontal scroll with sticky first column (member name). Show scroll shadow on edges.
- **Modals:** full-screen sheets on mobile (`<Sheet>` from shadcn), regular dialogs on desktop
- **Tables:** transform to stacked cards below `md:` (each row becomes a card)
- **Quick actions:** floating action button (FAB) on mobile, inline buttons on desktop
- **Forms:** single column on mobile, two columns `md:grid-cols-2` on desktop
- **Tap targets:** minimum 44×44px, always
- **Hover states:** never rely on hover alone for interaction

**Test every page at 360px before considering it done.**

### 5.6 Accessibility (WCAG 2.1 AA)

- Color contrast: 4.5:1 for text, 3:1 for UI elements — verify with a checker, don't eyeball
- Every form field has a `<label>` — never rely on placeholder as label
- Focus states visible (Tailwind's `focus-visible:ring-2 focus-visible:ring-primary`)
- Keyboard navigation works everywhere — tab order is logical
- Modals trap focus and return it on close (shadcn handles this if used correctly)
- Icons that are buttons have `aria-label`
- Status changes announced to screen readers via toast's built-in ARIA

### 5.7 Formatting helpers (put in `lib/utils.ts`)

```ts
export const formatINR = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

export const formatMonthYear = (month: number, year: number) =>
  new Date(year, month - 1).toLocaleDateString('en-IN', {
    month: 'short', year: 'numeric',
  });
```

---

## 6. DATABASE SCHEMA

### 6.1 Migration philosophy

- All schema changes go through numbered SQL files in `cloudflare/migrations/`
- **Never edit a migration after it's been applied to production.** Write a new one.
- Every migration is idempotent (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`)
- Apply locally first, then remote:
  ```bash
  wrangler d1 execute gsf-accounts-db --local --file=cloudflare/migrations/00X.sql
  wrangler d1 execute gsf-accounts-db --remote --file=cloudflare/migrations/00X.sql
  ```

### 6.2 Schema (001_initial_schema.sql)

```sql
-- Users (Treasurer + Board members)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer', 'member')),
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

-- Ledger entries (source of truth for all balances)
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

-- Audit log (immutable)
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
```

**Additional tables added via later migrations:**

```sql
-- 004_add_member_user_link.sql
-- Links a users row to a members row (nullable; only set for role='member')
ALTER TABLE users ADD COLUMN member_id TEXT REFERENCES members(id);

-- 005_registration_requests.sql
-- Self-registration requests pending Treasurer approval
CREATE TABLE IF NOT EXISTS registration_requests (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  member_code TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  reviewed_by TEXT REFERENCES users(id),
  reviewed_at TEXT,
  linked_member_id TEXT REFERENCES members(id),
  rejection_reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reg_requests_status ON registration_requests(status);

-- 006_scholarship_announcements.sql
-- Bulletin board for scholarship announcements (separate from scholarship_payouts)
CREATE TABLE IF NOT EXISTS scholarship_announcements (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  eligibility_criteria TEXT,
  deadline TEXT,
  contact TEXT,
  poster_drive_url TEXT,       -- Google Drive share link (poster/flyer)
  documents_drive_url TEXT,    -- Google Drive share link (optional extra docs)
  form_url TEXT,               -- Google Forms link
  is_active INTEGER NOT NULL DEFAULT 0,  -- only one active at a time
  posted_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

**Settings keys for banking / payments page** (rows in the existing `settings` table, no new table needed):

| Key | Description |
|-----|-------------|
| `bank_name` | Name of the bank |
| `account_name` | Account holder name |
| `account_number` | Account number (display masked in UI) |
| `ifsc_code` | IFSC code |
| `branch` | Branch name |
| `upi_id` | UPI ID (e.g. `gsffoundation@okaxis`) |
| `gpay_number` | Phone number linked to GPay |

### 6.3 Schema design principles (for future migrations / stack migration)

- **Prefer SQL-standard types.** Even though D1 is SQLite, write SQL that would migrate to Postgres with minimal changes. Avoid SQLite-specific tricks where a standard form exists.
- **Explicit constraints.** Every FK, CHECK, UNIQUE is declared — don't rely on application logic alone.
- **Timestamps in ISO 8601.** `datetime('now')` produces `YYYY-MM-DD HH:MM:SS` which parses cleanly in JS and Postgres.
- **IDs are opaque strings.** Don't expose sequential integers. Current: 16-byte random hex. Could swap to UUIDs later without breaking code that treats them as strings.
- **Monetary values as REAL for now.** If stack migrates to Postgres, change to `NUMERIC(12,2)`. Don't use floats for intermediate calculations — always round to 2dp before comparing.
- **No ORM-specific types.** Anyone reading the schema should understand it without Prisma/Drizzle knowledge.
- **Running balance is computed, not stored.** The `running_balance` column exists in `ledger_entries` but is not written to — it is left `NULL`. Running balance is always derived at query time using a window function so edits and soft-deletes never leave stale cached values:
  ```sql
  SELECT *,
    SUM(amount) OVER (
      PARTITION BY account
      ORDER BY date, created_at
      ROWS UNBOUNDED PRECEDING
    ) AS running_balance
  FROM ledger_entries
  WHERE is_deleted = 0
  ORDER BY date DESC, created_at DESC;
  ```
  D1 (SQLite) supports window functions. This is more reliable than maintaining a stored column at ~hundreds of entries.

### 6.4 Writing queries

All queries go in `lib/queries/<entity>.ts`. One file per entity. Each function is a typed wrapper:

```ts
// lib/queries/members.ts
import type { D1Database } from '@cloudflare/workers-types';
import type { Member } from '@/types';

export async function getActiveMembers(db: D1Database): Promise<Member[]> {
  const { results } = await db
    .prepare("SELECT * FROM members WHERE status = 'active' ORDER BY code")
    .all<Member>();
  return results;
}

export async function getMemberById(db: D1Database, id: string): Promise<Member | null> {
  return await db
    .prepare('SELECT * FROM members WHERE id = ?')
    .bind(id)
    .first<Member>();
}
```

**Rules:**
- Always use `bind()` with parameters. Never interpolate user input into SQL strings. This prevents SQL injection.
- Wrap multi-statement writes in `db.batch([...])` for atomicity.
- Return typed results — `.first<T>()` and `.all<T>()`.
- Catch errors at the route level, not inside query functions.

### 6.5 Atomic multi-table writes

When a single user action writes to multiple tables (e.g. logging a subscription writes to `subscriptions`, `ledger_entries`, `audit_log`), use `db.batch()`:

```ts
const result = await db.batch([
  db.prepare('INSERT INTO subscriptions ...').bind(...),
  db.prepare('INSERT INTO ledger_entries ...').bind(...),
  db.prepare('INSERT INTO audit_log ...').bind(...),
]);
```

If any statement fails, the whole batch rolls back. This is the only way to maintain integrity.

---

## 7. AUTHENTICATION & SECURITY

### 7.1 Auth flow

1. User submits email + password to `/api/auth/login`
2. Server looks up user by email, compares password with `bcrypt.compare`
3. On success, sign a JWT with `jose` containing `{ sub: userId, role, exp }`
4. Set JWT in httpOnly cookie: `Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800` (8h)
5. Redirect to `/dashboard`
6. On every request, `middleware.ts` verifies the cookie and attaches user to request context
7. Protected API routes double-check role before mutating

### 7.2 middleware.ts

```ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PROTECTED_PATHS = ['/dashboard', '/members', '/subscriptions', '/ledger',
                         '/zakat', '/donations', '/medical', '/scholarship',
                         '/reports', '/settings', '/api'];
const PUBLIC_API = ['/api/auth/login', '/api/auth/forgot-password'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_API.some(p => pathname.startsWith(p))) return NextResponse.next();
  if (!PROTECTED_PATHS.some(p => pathname.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get('gsf-session')?.value;
  if (!token) return redirectToLogin(req);

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret);
    return NextResponse.next();
  } catch {
    return redirectToLogin(req);
  }
}

function redirectToLogin(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login).*)'],
};
```

### 7.3 Password rules

- Minimum 12 characters for admins and editors, 10 for viewers
- Hash with bcryptjs, **12 rounds** minimum
- On first login from invited account, force password change (`must_change_password = 1`)
- Rate-limit login attempts: 5 failures in 15 min → lock account for 15 min
- Log every login, logout, and failed login to `audit_log`

### 7.4 Role enforcement pattern

Every protected route checks role explicitly. Use these helpers:

```ts
// lib/auth.ts
export const canWrite = (role: UserRole) =>
  role === 'admin' || role === 'editor';

export const isAdmin = (role: UserRole) =>
  role === 'admin';

export const isMember = (role: UserRole) =>
  role === 'member';

// Member routes: enforce row-level isolation — always add WHERE member_id = userId
export const requireOwnData = (requestedMemberId: string, authedMemberId: string) =>
  requestedMemberId === authedMemberId;
```

```ts
// app/api/subscriptions/route.ts — admin and editor can log transactions
export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  if (!canWrite(user.role)) return json({ error: 'Forbidden' }, 403);
  // ... proceed
}

// app/api/members/[id]/route.ts — DELETE is admin-only (soft delete)
export async function DELETE(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  if (!isAdmin(user.role)) return json({ error: 'Forbidden' }, 403);
  // ... proceed
}

// app/api/me/subscriptions/route.ts — member sees only their own rows
export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  if (!isMember(user.role)) return json({ error: 'Forbidden' }, 403);
  // Always bind member_id to prevent horizontal privilege escalation
  const rows = await db.prepare(
    'SELECT * FROM subscriptions WHERE member_id = ?'
  ).bind(user.memberId).all();
  // ...
}
```

**Summary of what each role can do:**
- `admin` — everything
- `editor` — all writes except soft-delete and user management
- `viewer` — read-only, all Foundation data
- `member` — read-only, own data only, enforced at query level (V2 UI, V1 schema)

Never assume the middleware is enough. **Defense in depth.**

### 7.5 Session cookie configuration

```ts
cookies().set('gsf-session', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
  maxAge: 60 * 60 * 8, // 8 hours
});
```

### 7.6 General security checklist

- ✅ All routes use HTTPS (Cloudflare enforces this)
- ✅ Password hashing with bcrypt (12 rounds)
- ✅ JWT in httpOnly cookie only, never localStorage
- ✅ CSRF: SameSite=Strict cookies + verify Origin header on mutations
- ✅ SQL injection: always use parameterized queries (`.bind()`)
- ✅ XSS: React escapes by default; never use `dangerouslySetInnerHTML`
- ✅ Rate limiting on auth endpoints
- ✅ Audit log captures every mutation + auth event
- ✅ No secrets in the repo — only in Cloudflare env vars
- ✅ Input validation via zod on every API route
- ✅ Role check inside every protected route handler (not just middleware)
- ✅ Soft delete only — no data loss
- ✅ CORS: restrict to the production domain only

---

## 8. DATA INTEGRITY & BACKUPS

### 8.1 Why this matters

This is a financial system. The Foundation's total (~₹4,57,900) must be correct to the rupee at any moment. Data loss is not recoverable from user memory.

### 8.2 Backup strategy (multi-layer)

**Layer 1: Cloudflare D1 internal redundancy** — D1 replicates automatically across Cloudflare's infrastructure.

**Layer 2: Weekly scheduled export to Foundation's Google Drive** — every Sunday at midnight IST, a Cloudflare Cron Trigger runs `/api/backup` which:
1. Exports the entire D1 database as a `.sql` dump
2. Also exports each table as a `.csv` (human-readable, stack-agnostic)
3. Bundles them into a zip with a manifest file (date, row counts, SHA-256 of each file)
4. Uploads to the Foundation's Google Drive folder (via Google Drive API)
5. Deletes backups older than 30 weeks (keeps last 30)
6. Emails the Treasurer a confirmation with the backup filename and row counts

**Layer 3: On-demand export button in Settings** — Treasurer can manually trigger a backup at any time.

**Layer 4: Pre-destructive-action snapshots** — before applying a migration to production, export the DB manually:
```bash
wrangler d1 export gsf-accounts-db --remote --output=backups/pre-migration-YYYY-MM-DD.sql
```

### 8.3 Restore procedure (document this, test it)

During UAT phase, perform an actual test restore. The procedure:
1. Create a new D1 database: `wrangler d1 create gsf-accounts-db-restore-test`
2. Execute the backup SQL file against it: `wrangler d1 execute gsf-accounts-db-restore-test --remote --file=backup.sql`
3. Run the reconciliation query — totals should match the backup's manifest
4. Delete the test database

Write the procedure in `docs/RESTORE.md` so any future developer can do it.

### 8.4 Reconciliation query (run after any bulk operation)

```sql
SELECT
  SUM(CASE WHEN is_deleted = 0 THEN amount ELSE 0 END) as grand_total,
  SUM(CASE WHEN account = 'general' AND is_deleted = 0 THEN amount ELSE 0 END) as general_total,
  SUM(CASE WHEN account = 'zakat' AND is_deleted = 0 THEN amount ELSE 0 END) as zakat_total,
  COUNT(*) as entry_count
FROM ledger_entries;
```

After migration: `grand_total = 457900`. Do not go live until this matches.

### 8.5 Zakat isolation test

```sql
-- Must return 0 — zakat funds must never be spent on non-scholarship categories
SELECT COUNT(*) FROM ledger_entries
WHERE account = 'zakat' AND amount < 0 AND category != 'Scholarship' AND is_deleted = 0;
```

Add this as an automated test that runs on every deploy.

---

## 9. AUDIT LOG PATTERN

Every mutation writes to `audit_log`. Wrap this in a helper:

```ts
// lib/audit.ts
export async function logAudit(
  db: D1Database,
  params: {
    userId: string;
    action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'failed_login';
    entity: string;
    entityId?: string;
    before?: unknown;
    after?: unknown;
    ipAddress?: string;
    userAgent?: string;
  }
) {
  await db.prepare(`
    INSERT INTO audit_log
    (user_id, action, entity, entity_id, before_json, after_json, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    params.userId,
    params.action,
    params.entity,
    params.entityId ?? null,
    params.before ? JSON.stringify(params.before) : null,
    params.after ? JSON.stringify(params.after) : null,
    params.ipAddress ?? null,
    params.userAgent ?? null,
  ).run();
}
```

Every API route that mutates data calls this. The insert goes into the same `db.batch()` as the mutation itself, so if the mutation fails, the audit record isn't written either.

---

## 10. EMAIL (RESEND)

### 10.1 Receipt trigger logic

| Member has... | Action |
|---------------|--------|
| Email on record | Send receipt via Resend automatically |
| No email, has phone | Show "Copy receipt for WhatsApp" button; treasurer pastes into WhatsApp manually |
| No contact | No receipt action; transaction still logged |

**Critical:** email sending must be **non-blocking**. If Resend fails, the transaction is still saved. Log the email failure separately — don't surface it as a transaction failure.

### 10.2 Wrapper

```ts
// lib/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendReceipt(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  try {
    await resend.emails.send({
      from: 'GSF Foundation <onboarding@resend.dev>', // update after custom domain verified
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    return { ok: true };
  } catch (err) {
    console.error('Email send failed', err);
    return { ok: false, error: String(err) };
  }
}
```

### 10.3 Templates

Keep email HTML minimal and inline-styled. Email clients are hostile.

**Subscription receipt:**
```
Subject: Payment Receipt — GSF Foundation

Dear [Member Name],

JazakAllah Khair for your payment.

Receipt Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Member Code:    [CODE]
Payment for:    [Month Year] Subscription
Amount:         ₹300
Payment Mode:   UPI
Date:           12 Dec 2024
Reference:      [REF]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is an automatically generated receipt.
For queries, contact the Treasurer.

GSF Foundation
```

**WhatsApp clipboard format:**
```
*GSF Foundation — Payment Receipt*

Member: [Name] (Code: [XXXX])
Payment: [Month Year] Subscription
Amount: ₹300
Mode: UPI · Ref: [REF]
Date: 12 Dec 2024

_JazakAllah Khair_
```

---

## 11. CODE QUALITY STANDARDS

### 11.1 TypeScript

- `strict: true` in `tsconfig.json`, always
- No `any`. Use `unknown` and narrow.
- Every exported function has explicit return types
- Database entities have matching TS interfaces in `types/index.ts`, kept in sync with SQL
- Zod schemas are the source of truth for API input validation

### 11.2 Readability

- **Prefer clarity over cleverness.** If a junior dev can't read it in one pass, simplify.
- **Functions < 40 lines.** If longer, extract.
- **Files < 300 lines.** If longer, split.
- **Comments explain *why*, not *what*.** The code says what.
- **Name things fully.** `subscriptionMatrix` not `subMtx`. `calculateOutstandingDues` not `calcOD`.

### 11.3 Forward-compatibility (for future stack migration)

- **Keep Cloudflare-specific code at the edges.** Anything that touches `env.DB` lives in `lib/db.ts` — not scattered across route handlers. Google Drive access is isolated to `lib/drive.ts`.
- **Queries are plain SQL.** A future dev migrating to Postgres rewrites the connection layer, not every query.
- **Business logic in pure functions.** `calculateRunningBalance(entries)` is testable without a database.
- **No Cloudflare imports in UI components.** Ever.
- **Abstract the email provider.** `lib/email.ts` exposes `sendReceipt()` — swapping Resend for Brevo later means changing one file.

### 11.4 Tests (minimum viable, but include from day one)

Use Vitest for unit tests. Focus on:

- Currency formatting (`formatINR`)
- Running balance calculation
- Zakat isolation (inputs that should be rejected)
- Date parsing and formatting
- Zod schema validation edge cases

Not a full TDD cycle — but critical pure functions must have tests. Write them alongside the function, not later.

### 11.5 Error handling

Every API route follows this shape:

```ts
export async function POST(req: Request) {
  try {
    const user = await requireAuth(req, 'admin');
    const body = await req.json();
    const parsed = MySchema.safeParse(body);
    if (!parsed.success) {
      return json({ error: 'Invalid input', details: parsed.error.format() }, 400);
    }
    // ... business logic
    return json({ ok: true, data: result });
  } catch (err) {
    console.error('POST /api/xxx failed', err);
    return json({ error: 'Internal server error' }, 500);
  }
}
```

Never leak internal errors or stack traces to the client. Log them server-side.

### 11.6 README.md

Write it as you build, not at the end. It should contain:
- One-line project description
- Local setup (clone, install, env vars, migrations, dev server)
- How to run the Cloudflare preview locally
- How to deploy (mostly automatic via git push, but document manually too)
- How to apply a new migration
- How to trigger a manual backup
- How to run the reconciliation query
- Where the credentials handover doc lives
- Who to contact

---

## 12. PHASED DEVELOPMENT PLAN

**Timeline: ~7 weeks total.** Every phase has subphases, explicit tasks, and an end-of-phase review. Do not skip the reviews.

### PHASE 0 — Project Setup & First Deploy ✅ COMPLETE (23 Apr 2026)

**Goal:** A blank Next.js app deployed to Cloudflare Workers on a live URL before writing any feature code.

**Live URL:** https://gsf-trust.gsftrust-official.workers.dev

**Sub-phases:**

**0.1 Repo bootstrap** ✅
- [x] Clone the Foundation's empty repo (`GSF-Trust-Official/gsf-trust`)
- [x] Run `create-next-app` with TypeScript, Tailwind, App Router
- [x] Install all dependencies listed in §1.1
- [x] Initialize shadcn/ui
- [x] Create folder structure from §3

**0.2 Cloudflare config** ✅
- [x] Add `build:cf`, `preview:cf`, `deploy` scripts to `package.json`
- [x] Create `wrangler.toml` (name: `gsf-trust`, compatibility_date: `2024-09-23`, nodejs_compat)
- [x] Run `wrangler d1 create gsf-accounts-db` (ID: `f8bf6798-a34b-4e2f-b1fe-4a1b1ee0cea7`)
- [x] ~~R2~~ — not used; Google Drive handles file storage
- [x] Migrated from deprecated `@cloudflare/next-on-pages` to `@opennextjs/cloudflare`

**0.3 Env vars & secrets** ✅
- [x] Generate JWT_SECRET and add to Cloudflare dashboard + `.env.local`
- [x] Create `.env.local` locally
- [x] Create `.env.example` (committed, empty values)
- [x] Confirm `.env.local` is gitignored

**0.4 Tailwind theme** ✅
- [x] Brand colors defined in `globals.css` `@theme inline` block (Tailwind v4 CSS-first config)
- [x] Load Plus Jakarta Sans, Inter, JetBrains Mono via `next/font`
- [x] `app/globals.css` with base styles

**0.5 First deploy** ✅
- [x] `main` and `dev` branches pushed to `GSF-Trust-Official/gsf-trust`
- [x] Cloudflare Workers project connected via GitHub
- [x] Build command: `npm run build:cf`, Deploy command: `npx wrangler deploy`
- [x] D1 database bound (`env.DB`)
- [x] JWT_SECRET and NODE_ENV added as env vars in Cloudflare dashboard

**0.6 Review gate** ✅
- [x] Production URL loads: https://gsf-trust.gsftrust-official.workers.dev
- [x] D1 database exists and is bound (confirmed in deploy log)
- [x] Build completes without errors
- [x] TypeScript passes clean locally
- [x] `.gitignore` excludes `.env.local`, `.open-next/`, `.wrangler/`, `node_modules/`

---

### PHASE 1 — Database Schema & Auth Foundation (3–4 days)

**Goal:** Treasurer can log in and land on an empty dashboard. Middleware protects routes. Audit log works.

**Sub-phases:**

**1.1 Schema**
- [x] `cloudflare/migrations/001_initial_schema.sql` written and applied remotely
- [x] `cloudflare/migrations/002_update_user_roles.sql` — recreate users table with all four roles in CHECK (see below)
- [x] Apply 002 locally and remotely
- [x] `cloudflare/migrations/003_seed_treasurer.sql` — bcrypt hash committed (never plaintext); temp password `GSFAdmin2026!`, `must_change_password=1`
- [x] Apply 003 locally; apply remotely after updating email to real Treasurer email

**002_update_user_roles.sql pattern:**
```sql
PRAGMA foreign_keys = OFF;
CREATE TABLE users_new (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer', 'member')),
  is_active INTEGER NOT NULL DEFAULT 1,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  two_factor_secret TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_login TEXT
);
INSERT INTO users_new SELECT * FROM users;
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;
PRAGMA foreign_keys = ON;
```

**1.2 Type definitions**
- [x] `types/index.ts` created with interfaces for all tables
- [x] `UserRole` type exported: `'admin' | 'editor' | 'viewer' | 'member'` — `User.role` updated

**1.3 DB helper layer**
- [x] `lib/db.ts` — `getDb(env)`, `Env` interface
- [ ] `lib/queries/users.ts` — `getUserByEmail`, `updateLastLogin`
- [x] `lib/audit.ts` — `auditStatement()` helper

**1.4 Auth**
- [x] `lib/auth.ts` — `hashPassword`, `verifyPassword`, `signToken`, `verifyToken`
- [x] `lib/email.ts` — Resend wrapper
- [x] `lib/utils.ts` — `cn()`, `formatINR()`, `formatDate()`, `formatMonthYear()`
- [x] `middleware.ts` — JWT guard on protected paths
- [ ] Add `canWrite(role)` and `isAdmin(role)` helpers to `lib/auth.ts` (see §7.4)
- [ ] Zod schema for login input
- [ ] `app/api/auth/login/route.ts` — validates, checks password, sets cookie, logs audit
- [ ] `app/api/auth/logout/route.ts` — clears cookie, logs audit
- [ ] Login rate limiting (simple in-memory or D1-backed counter)

**1.5 UI shell**
- [ ] `app/(auth)/login/page.tsx` — email + password form, shadcn components
- [ ] `app/(app)/layout.tsx` — sidebar layout, responsive (sidebar → bottom nav on mobile)
- [ ] `app/(app)/dashboard/page.tsx` — placeholder "Welcome [name]"
- [ ] Sign out button in sidebar
- [ ] Sidebar shows role-appropriate actions (editors see Log buttons; viewers do not)

**1.6 Mobile pass**
- [ ] Test login at 360px — form is usable, tap targets are 44px+
- [ ] Test sidebar collapses/converts on mobile
- [ ] No horizontal scroll on any page at 360px

**1.7 Review gate**
- [ ] Treasurer can log in successfully
- [ ] Wrong password shows a friendly error (not a crash)
- [ ] Failed logins are logged
- [ ] Successful login is logged
- [ ] `/dashboard` without cookie redirects to `/login`
- [ ] Refreshing preserves session
- [ ] Sign out clears cookie and redirects
- [ ] 5 failed logins locks account for 15 min
- [ ] Password hash in DB is bcrypt (starts with `$2`)
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Login works on mobile Chrome and Safari
- [ ] **Security review:** JWT_SECRET is in env, not code. Cookies are httpOnly+Secure+SameSite=Strict. Passwords never logged. Rate limiting works.
- [ ] Commit: `feat: authentication, middleware, audit log foundation`

---

### PHASE 2 — Members Module (3–4 days)

**Goal:** Treasurer can create, edit, view, and soft-delete members. Board members can view.

**Sub-phases:**

**2.1 Queries**
- [ ] `lib/queries/members.ts` — list, getById, create, update, deactivate
- [ ] All writes go through `db.batch()` with audit entry

**2.2 Validators**
- [ ] `lib/validators/member.ts` — Zod schemas for create/update

**2.3 API routes**
- [ ] `GET /api/members` — paginated list, search, filter
- [ ] `POST /api/members` — create
- [ ] `GET /api/members/[id]` — detail
- [ ] `PATCH /api/members/[id]` — update
- [ ] `DELETE /api/members/[id]` — soft delete (set status=inactive)

**2.4 UI — list**
- [ ] `app/(app)/members/page.tsx` — server component fetches initial data
- [ ] Table with columns: Code, Name, BOD badge, Contact, Join Date, Status
- [ ] Client-side search (simple string match)
- [ ] Filter pills: All / Active / Inactive / BOD Only
- [ ] Pagination (20 per page)
- [ ] "Add Member" button → modal

**2.5 UI — profile**
- [ ] `app/(app)/members/[id]/page.tsx`
- [ ] Identity card (name, code, status, BOD designation, contact)
- [ ] KPI row: Total contributed (placeholder until subs exist), Outstanding dues, Assistance received
- [ ] 12-month subscription grid (empty for now; filled in Phase 4)
- [ ] Recent donations table (empty for now; filled in Phase 6)
- [ ] Edit button → same modal pre-filled
- [ ] Deactivate button with confirmation

**2.6 UI — Add/Edit modal**
- [ ] react-hook-form + zod resolver
- [ ] Full-screen sheet on mobile, dialog on desktop
- [ ] Fields: Name, Code (suggest next), Email, Phone, Join Date, Is BOD checkbox, BOD Designation (conditional)
- [ ] Optimistic update + toast on success
- [ ] Error handling with field-level messages

**2.7 Mobile pass**
- [ ] Members list: table converts to cards at `sm:` breakpoint
- [ ] Modal is full-screen on mobile
- [ ] Search input is prominent and tap-friendly
- [ ] Profile page readable at 360px

**2.8 Review gate**
- [ ] List loads from D1 with real data
- [ ] Add member creates row, shows in list immediately
- [ ] Edit persists
- [ ] Deactivate moves member to inactive filter
- [ ] Search works instantly
- [ ] Pagination works
- [ ] All writes log to `audit_log`
- [ ] Viewers (role=viewer) see list but Add/Edit/Delete buttons hidden
- [ ] Editors (role=editor) can Add/Edit but Deactivate button is hidden
- [ ] Viewer and editor API calls to DELETE return 403
- [ ] Viewer API calls to POST/PATCH return 403
- [ ] Mobile: every action works with thumb, no horizontal overflow
- [ ] **Security review:** Input validation on every route, role check on every mutation
- [ ] Commit: `feat: members module with full crud, profile view, audit trail`

---

### PHASE 3 — Dashboard (2–3 days)

**Goal:** Real KPIs from D1, real charts, quick action buttons (modals TBD in later phases).

**Sub-phases:**

**3.1 Aggregation queries**
- [ ] `lib/queries/dashboard.ts` — totalFunds, generalBalance, zakatBalance, medicalPool, outstandingDues, monthlyComparison
- [ ] All queries exclude `is_deleted = 1`

**3.2 API**
- [ ] `GET /api/dashboard` — returns all KPIs in one call

**3.3 UI — KPI tiles**
- [ ] 4 tiles on desktop (`lg:grid-cols-4`), 2 on tablet, 1 on mobile
- [ ] Each tile: label, big number, delta indicator
- [ ] Loading skeletons (don't show "₹0" while loading)

**3.4 UI — Charts**
- [ ] Donation Breakdown (PieChart)
- [ ] Expense Allocation (PieChart)
- [ ] Collection Rate (BarChart, last 12 months)
- [ ] Use brand color tokens exactly
- [ ] Charts are responsive (Recharts' `ResponsiveContainer`)

**3.5 UI — Recent activity**
- [ ] Last 10 ledger entries as a table
- [ ] On mobile: stacked cards

**3.6 UI — Quick actions**
- [ ] Three buttons: Log Subscription, Log Donation, Log Expense
- [ ] Visible for admin and editor; hidden for viewer
- [ ] Modals open but may contain placeholder content until Phases 4–6

**3.7 Mobile pass**
- [ ] KPI tiles stack cleanly
- [ ] Charts don't overflow
- [ ] Quick actions become a FAB on mobile

**3.8 Review gate**
- [ ] Zero hardcoded numbers; everything from D1
- [ ] Charts render at 360px
- [ ] Viewers don't see quick actions
- [ ] Page loads in < 2s on 4G (throttle in Chrome DevTools to verify)
- [ ] Commit: `feat: dashboard kpis, charts, recent activity, quick actions`

---

### PHASE 4 — Subscriptions Module (5–6 days)

**Goal:** Full subscription tracker matrix + Log Subscription modal with atomic writes.

**Sub-phases:**

**4.1 Queries**
- [ ] `lib/queries/subscriptions.ts` — `getMatrixForYear(year)`, `getMemberHistory(memberId)`, `upsertSubscription(...)`
- [ ] `getArrears()` — members with any status='due'

**4.2 API**
- [ ] `GET /api/subscriptions?year=YYYY` — returns matrix
- [ ] `POST /api/subscriptions` — creates/upserts + ledger entry + audit in one batch
- [ ] `GET /api/subscriptions/arrears`
- [ ] `POST /api/subscriptions/bulk-mark-paid` — for "mark all paid" button

**4.3 UI — Matrix view**
- [ ] `app/(app)/subscriptions/page.tsx`
- [ ] Table: members as rows, months as columns, current FY default
- [ ] Sticky first column (member name) — critical on mobile
- [ ] Year dropdown refetches
- [ ] Cell states: P (mint), D (amber), N/A (blue-grey), empty (grey dot)
- [ ] Current month column subtly highlighted
- [ ] Click P cell → popover with details (amount, date, mode, ref)
- [ ] Click D or empty → opens Log Subscription modal pre-filled

**4.4 UI — Log Subscription modal**
- [ ] Fields: Member (searchable select), Month, Year, Amount (default 300), Paid Date (default today), Mode, Reference, Notes
- [ ] Submit triggers: `db.batch([upsert subscription, insert ledger entry, insert audit log])`
- [ ] On success: close modal, refresh matrix, show toast
- [ ] If member has email: fire-and-forget receipt email via Resend
- [ ] Copy-to-WhatsApp button if no email

**4.5 UI — Arrears tab**
- [ ] Sub-route or tab: members ordered by total owed desc
- [ ] Click row → pre-opens Log Subscription for the oldest due month

**4.6 UI — Bulk mark**
- [ ] Button per column: "Mark all members Paid for [Month]"
- [ ] Confirmation dialog showing list of affected members and total
- [ ] On confirm: one batch per member

**4.7 Mobile pass**
- [ ] Matrix scrolls horizontally smoothly
- [ ] Sticky column stays put
- [ ] Cells are tap-friendly (minimum 44×32 given the column count)
- [ ] Modal usable at 360px

**4.8 Review gate**
- [ ] Logging a payment updates the cell to P instantly
- [ ] Ledger entry appears in General ledger with correct running balance
- [ ] Audit log has an entry
- [ ] Email sends (if member has email) — verify test inbox
- [ ] Failed email doesn't roll back the transaction
- [ ] Bulk mark creates one ledger entry per member
- [ ] Year selector works across multiple years
- [ ] **Data integrity review:** verify `subscriptions.ledger_entry_id` always points to an existing entry; run reconciliation query
- [ ] Commit: `feat: subscription tracker matrix, log subscription, bulk mark, arrears`

---

### PHASE 5 — Ledgers & Log Expense (4–5 days)

**Goal:** General Ledger, Zakat Ledger, Log Expense modal. Zakat isolation enforced. Admin and editor can edit entries; admin can soft-delete. Running balance computed via window function.

**Sub-phases:**

**5.1 Queries**
- [ ] `lib/queries/ledger.ts` — `getLedger({ account, filters, page })`, `insertExpense(...)`, `updateEntry(...)`, `softDeleteEntry(...)`
- [ ] Running balance computed via window function in every ledger query — never read from the `running_balance` column (see §6.3)

**5.2 API**
- [ ] `GET /api/ledger?account=general&...` — paginated, filtered
- [ ] `POST /api/ledger/expense` — atomic write + audit
- [ ] `PATCH /api/ledger/[id]` — edit entry; admin and editor only; can change amount, date, description, category, reference, notes; **cannot** change account (General ↔ Zakat); audit logs before/after JSON
- [ ] `DELETE /api/ledger/[id]` — soft delete; admin only; sets `is_deleted=1`, `deleted_at`, `deleted_by`; audit logs the delete
- [ ] Server-side check: if account=zakat, category must be 'Scholarship'

**5.3 UI — General Ledger**
- [ ] `app/(app)/ledger/page.tsx`
- [ ] Columns: Date, Category/Sub, Member Code, Description, Amount (colored), Running Balance
- [ ] Running balance column is always computed server-side — never from a stored column
- [ ] Filters: date range picker, category select, member code input, in/out toggle
- [ ] Current balance KPI top-right
- [ ] Server-side pagination (20/page)
- [ ] Export PDF / Excel buttons (toast "coming soon" until Phase 8)
- [ ] Pencil icon on each row → Edit modal (admin and editor)
- [ ] Trash icon on each row → Delete confirmation dialog (admin only)
- [ ] Deleted entries hidden from normal view; visible in Audit Log

**5.4 UI — Zakat Ledger**
- [ ] `app/(app)/zakat/page.tsx`
- [ ] Same layout including edit/delete controls, filtered to account='zakat'
- [ ] Red "Restricted Account" badge top
- [ ] Balance displayed separately, never merged
- [ ] Filter tabs: All / Inflows / Payouts

**5.5 UI — Log Expense modal**
- [ ] Fields: Account radio (General/Zakat), Category select, Description, Amount, Date, Reference, Notes
- [ ] When Account=Zakat, Category options reduce to Scholarship only (grey out others)
- [ ] Client shows amount as positive; stored as negative in DB
- [ ] Submit: batch write

**5.6 UI — Edit Entry modal**
- [ ] Pre-fills all editable fields from the selected row
- [ ] Account field is read-only (no moving entries between accounts)
- [ ] On submit: PATCH request + audit entry with `before_json` and `after_json`
- [ ] Success: close modal, refresh ledger rows, toast

**5.7 UI — Delete confirmation**
- [ ] Dialog text: "This will remove this entry from all balances. The audit log will retain a permanent record. Are you sure?"
- [ ] Shows the entry details (date, description, amount) in the confirmation
- [ ] On confirm: DELETE request + soft-delete; row disappears from ledger view

**5.8 Mobile pass**
- [ ] Ledger tables → stacked cards on mobile
- [ ] Edit and delete actions accessible in card view (kebab menu or swipe action)
- [ ] Filters collapse into a bottom sheet on mobile
- [ ] Modal full-screen on mobile

**5.9 Review gate**
- [ ] General ledger shows all general entries, never zakat
- [ ] Zakat ledger shows only zakat entries
- [ ] Log Expense with Zakat + Medical is rejected by the API (even if UI somehow bypassed)
- [ ] Running balance is correct after an edit (spot check: edit an entry and verify all subsequent balances update)
- [ ] Running balance is correct after a soft delete
- [ ] Edit saves before/after state in audit_log — verify both fields are populated
- [ ] Delete saves `deleted_by`, `deleted_at`, and `before_json` in audit_log
- [ ] Editor cannot call DELETE — returns 403
- [ ] Editor PATCH succeeds; amount/date/description changes persist
- [ ] Editing an entry cannot change its account (General or Zakat) — enforce server-side
- [ ] Filters combine correctly (date + category + member)
- [ ] Pagination works
- [ ] **Isolation test:** run the Zakat isolation SQL from §8.5 — must return 0
- [ ] Commit: `feat: general ledger, zakat ledger, log expense, edit and soft-delete`

---

### PHASE 6 — Donations (2–3 days)

**Goal:** Log Donation modal + Donations tracker page. Auto-routes to correct account.

**Sub-phases:**

**6.1 Queries + API**
- [ ] `lib/queries/donations.ts`
- [ ] `GET /api/donations` — filtered list
- [ ] `POST /api/donations` — atomic: insert donation + ledger entry (correct account) + audit

**6.2 UI**
- [ ] `app/(app)/donations/page.tsx` — table, filters, per-donor totals card
- [ ] Log Donation modal:
  - Donor (member search OR free-text name)
  - Type radio: Hadiya / Zakat / Other
  - Category: General / Medical / Scholarship / Emergency
  - Amount, Date, Mode, Reference, Notes
- [ ] When Type=Zakat: show callout "Zakat will be posted to the restricted Zakat account." and route to account=zakat automatically
- [ ] Receipt email on save (if member has email)

**6.3 Mobile pass**
- [ ] Table → cards on mobile
- [ ] Modal full-screen

**6.4 Review gate**
- [ ] Hadiya donations post to General
- [ ] Zakat donations post to Zakat and only Zakat
- [ ] Dashboard KPIs update after logging
- [ ] Receipt email sent (verified in test inbox)
- [ ] Commit: `feat: donations tracker, log donation, zakat auto-routing`

---

### PHASE 7 — Medical & Scholarship (4–5 days)

**Goal:** Medical cases CRUD with privacy masking; scholarship payouts deduct from Zakat; scholarship announcement board for members to view and apply.

**Sub-phases:**

**7.1 Medical queries + API + UI**
- [ ] Case list with beneficiary (masked for viewers if `mask_name=1`)
- [ ] Add case modal
- [ ] Case detail page with linked ledger entries
- [ ] Mark pledge received (updates amount_external)
- [ ] Close case action

**7.2 Scholarship payout queries + API + UI**
- [ ] Payout list
- [ ] Log Scholarship Payout modal — writes to Zakat ledger (negative amount)
- [ ] Eligibility notes field

**7.3 Privacy check**
- [ ] Viewer sees "XXXX" for masked beneficiaries
- [ ] Admin sees real names
- [ ] Export respects masking preference

**7.4 Migration + Scholarship announcement queries + API**
- [ ] Apply `006_scholarship_announcements.sql` locally and remotely
- [ ] `lib/queries/scholarshipAnnouncements.ts` — `getActiveAnnouncement()`, `upsertAnnouncement(...)`, `listAnnouncements()`
- [ ] `GET /api/scholarship/announcement` — returns the currently active announcement (all roles)
- [ ] `POST /api/scholarship/announcement` — create/update announcement; admin and editor only
- [ ] `PATCH /api/scholarship/announcement/[id]/activate` — sets this row active, deactivates all others; admin and editor only
- [ ] Validate `form_url` starts with `https://docs.google.com/forms/` server-side
- [ ] When poster drive URL is saved, do a server-side HEAD fetch — if it returns a non-200 (Drive login redirect), respond with a warning `{ ok: true, warning: 'poster_url_may_require_signin' }` so the UI can show a tip

**7.5 UI — Scholarship announcement (all roles)**
- [ ] `app/(app)/scholarship/announcement/page.tsx`
- [ ] Fetch active announcement from D1
- [ ] Display: title, description, eligibility, deadline, contact
- [ ] Poster: convert Google Drive share URL to preview URL for iframe embed; fallback "View Poster →" link in case iframe fails
  ```ts
  // lib/utils.ts helpers
  export const getDrivePreviewUrl = (shareUrl: string) => {
    const match = shareUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? `https://drive.google.com/file/d/${match[1]}/preview` : shareUrl;
  };
  export const getDriveThumbnailUrl = (shareUrl: string) => {
    const match = shareUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800` : shareUrl;
  };
  ```
- [ ] "Apply Now →" button — `<a href={formUrl} target="_blank">`; only shown if `form_url` is set
- [ ] "Supporting Documents →" link — only shown if `documents_drive_url` is set
- [ ] Empty state if no active announcement: "No scholarship announcements at this time."

**7.6 UI — Manage Announcement (admin and editor)**
- [ ] "Manage Announcement" button visible to admin/editor, hidden from viewer/member
- [ ] Form fields: Title, Description (textarea), Eligibility Criteria (textarea), Deadline (date picker), Contact (email), Poster Drive Link, Supporting Docs Link (optional), Application Form Link, Status (Draft / Published)
- [ ] If poster link returns the drive-signin-required warning: show inline tip "Make sure sharing is set to 'Anyone with the link' in Google Drive."
- [ ] Preview button — shows the member view before publishing

**7.7 Mobile pass**
- [ ] Case detail readable at 360px
- [ ] Announcement readable at 360px — poster iframe responsive
- [ ] "Apply Now" button prominent and tap-friendly
- [ ] Modals full-screen

**7.8 Review gate**
- [ ] Medical CRUD end-to-end
- [ ] Scholarship payout deducts from Zakat balance
- [ ] Masking works for viewers
- [ ] Active announcement is visible to all roles (including members)
- [ ] Viewer and member cannot POST/PATCH the announcement — returns 403
- [ ] Only one announcement active at a time (verify in DB: `SELECT COUNT(*) FROM scholarship_announcements WHERE is_active=1` = 1)
- [ ] Google Forms link validation rejects non-Forms URLs
- [ ] Audit log captures all creates/updates
- [ ] Commit: `feat: medical cases, scholarship log, scholarship announcement board`

---

### PHASE 8 — Reports & Exports (3–4 days)

**Goal:** Annual report + custom range exports, Excel + PDF, uploaded to Google Drive with a direct download link returned to the user.

**Sub-phases:**

**8.1 Query layer for reports**
- [ ] `lib/queries/reports.ts` — `getAnnualReport(fy)`, `getUsageBreakdown(from, to)`, `getCustomRangeLedger(...)`

**8.2 Excel export (`xlsx` lib)**
- [ ] Multi-sheet: Summary, General, Zakat, Subscriptions, Medical, Scholarship
- [ ] Upload to Foundation's Google Drive folder via `lib/drive.ts`
- [ ] Return a direct Google Drive download link (no signed URL needed — Drive handles access)

**8.3 PDF export (`@react-pdf/renderer`)**
- [ ] Clean branded layout
- [ ] Same data as Excel but formatted
- [ ] Also uploaded to Google Drive

**8.4 UI**
- [ ] Reports page: pick report type + date range → generate → download link
- [ ] Export buttons inside each ledger page also work

**8.5 Mobile pass**
- [ ] Reports page usable at 360px
- [ ] Downloads work on mobile Safari

**8.6 Review gate**
- [ ] Annual report Excel has correct totals matching reconciliation
- [ ] PDF formats correctly (spot check layout)
- [ ] Files appear in Foundation's Google Drive folder
- [ ] Download link opens the file correctly
- [ ] Commit: `feat: annual report excel+pdf exports, google drive storage`

---

### PHASE 9 — Email Polish & Backup Automation (2–3 days)

**Goal:** Receipts polished, weekly backup cron working end-to-end.

**Sub-phases:**

**9.1 Receipt templates**
- [ ] Subscription receipt (HTML + text)
- [ ] Donation receipt
- [ ] WhatsApp clipboard format button wherever appropriate
- [ ] Settings toggle: enable/disable receipts per transaction type

**9.2 Backup cron**
- [ ] `app/api/backup/route.ts` — protected by a secret token
- [ ] Exports all tables to CSV + SQL dump
- [ ] Uploads to Foundation's Google Drive folder (via service account or OAuth refresh token)
- [ ] Retains last 30 weeks, deletes older
- [ ] Emails Treasurer on success and failure
- [ ] Cloudflare Cron Trigger: Sunday 00:00 IST

**9.3 Manual backup button**
- [ ] Settings page → "Backup now" → calls the same endpoint
- [ ] Shows filename after success

**9.4 Review gate**
- [ ] Weekly backup triggers automatically (verify by manually triggering via curl)
- [ ] Backup file appears in Foundation's Google Drive
- [ ] Treasurer confirmation email arrives
- [ ] Test restore: download backup, restore to a scratch DB, run reconciliation → matches
- [ ] Commit: `feat: resend receipts polished, weekly backup cron to google drive`

---

### PHASE 10 — Excel Migration (2–3 days)

**Goal:** Foundation's historical data imported. Reconciliation matches ₹4,57,900 to the rupee.

**Sub-phases:**

**10.1 Get data**
- [ ] Receive `Project GSF.xlsx` from Treasurer
- [ ] Export each sheet to CSV: BOD, SUBSCRIPTION TRACKER, GSF General AC, GFES AC, Medical emergencies, Total Funds

**10.2 Write migration script**
- [ ] `scripts/migrate-excel.ts` using papaparse
- [ ] Normalise: "P"/"p" → 'paid', "D"/"d" → 'due', "N/A"/"na" → 'na'
- [ ] Trim all strings
- [ ] Handle code "0000" as a reserved external entry
- [ ] Amanath Saving Scheme → General outflow (negative)
- [ ] Zakat rows → account='zakat'
- [ ] All other ledger → account='general'

**10.3 Local dry run**
- [ ] Run against `--local` D1
- [ ] Reconciliation query must match ₹4,57,900 grand total
- [ ] Zakat isolation check: must return 0
- [ ] Spot check 5 random transactions against the Excel

**10.4 Production run**
- [ ] Treasurer on video call during production migration
- [ ] Take a manual D1 export first (`wrangler d1 export ...`)
- [ ] Run migration against `--remote`
- [ ] Reconciliation query matches
- [ ] Treasurer reviews 5 sample entries live

**10.5 Review gate**
- [ ] `SELECT SUM(amount) FROM ledger_entries WHERE is_deleted=0` = 457900
- [ ] Treasurer signs off in writing (WhatsApp screenshot acceptable)
- [ ] Commit: `chore: excel migration complete, reconciliation verified`

---

### PHASE 11 — UAT & Go-Live (2–3 days)

**Goal:** Treasurer and a Board member independently verify every feature. Production launch.

**Sub-phases:**

**11.1 Treasurer UAT checklist** (driven by Treasurer on video call, you observe)
- [ ] Log in on phone — loads < 2s
- [ ] Log a subscription — appears in tracker, ledger, receipt email received
- [ ] Log a Hadiya donation → General ledger updated
- [ ] Log a Zakat donation → Zakat ledger updated, not General
- [ ] Log a medical expense → General balance down
- [ ] Add a new member → appears in list
- [ ] Add a medical case, log a payout against it
- [ ] Log a scholarship payout → Zakat balance down
- [ ] Generate annual report → Excel downloads correctly
- [ ] Invite a Board member → they get email, can log in
- [ ] Board member cannot see Log buttons
- [ ] Board member can view all ledgers
- [ ] Works on desktop Chrome, Safari, and phone

**11.2 Technical checks**
- [ ] No TypeScript errors: `npm run build:cf`
- [ ] No console errors across any page
- [ ] Reconciliation query still matches ₹4,57,900 (minus any test data; reset if needed)
- [ ] All audit entries present
- [ ] Weekly backup tested end-to-end
- [ ] UptimeRobot monitoring set up for production URL

**11.3 Production flip**
- [ ] Domain DNS pointed at Cloudflare Pages (if custom domain approved)
- [ ] SSL certificate live (automatic)
- [ ] Treasurer sets a real strong password

**11.4 Review gate**
- [ ] Every item in §11.1 and §11.2 ticked
- [ ] Treasurer writes "Go Live approved" in WhatsApp
- [ ] Commit: `chore: uat complete, production live`

---

### PHASE 12 — Handover (1 day)

**Goal:** Foundation owns everything. You step back to Read access.

**Sub-phases:**

**12.1 Handover call (1.5 hours)**
- [ ] 20 min: accounts walkthrough, downgrade Cloudflare role to Read
- [ ] 30 min: app walkthrough
- [ ] 10 min: backup demonstration
- [ ] 10 min: support channel setup (GitHub Issues)
- [ ] 30 min: Q&A

**12.2 Deliverables**
- [ ] Credentials PDF, password-protected, sent to Foundation Gmail
- [ ] Pinned GitHub Issue: "V2 Roadmap" with deferred features from §14
- [ ] README.md complete
- [ ] `docs/RESTORE.md` written
- [ ] Fork repo to personal GitHub (before access changes)

**12.3 Review gate**
- [ ] Cloudflare role = Read
- [ ] Treasurer confirms they can log into every account using only the Foundation Gmail
- [ ] Commit: `docs: handover complete`

---

### PHASE 13 — Member Self-Service Portal (6–8 days)

**Goal:** Foundation members can self-register, get Treasurer approval, log in, and view their own data with downloadable PDF receipts. Payments page with UPI QR visible to all roles. Self-registration flow with pending queue in Settings.

**Sub-phases:**

**13.1 Migrations**
- [ ] Apply `004_add_member_user_link.sql` — adds `member_id TEXT REFERENCES members(id)` to users (nullable)
- [ ] Apply `005_registration_requests.sql` — self-registration table (see §6.2)
- [ ] Apply both locally and remotely

**13.2 API routes (member-scoped)**
- [ ] `GET /api/me/subscriptions` — member's own subscription history (all years)
- [ ] `GET /api/me/donations` — member's own donation history
- [ ] `GET /api/me/dues` — outstanding months where status='due'
- [ ] `PATCH /api/me/profile` — update own phone and email only
- [ ] `GET /api/me/receipts/[subscriptionId]` — generates and streams a PDF receipt using `@react-pdf/renderer`; enforces `subscription.member_id === authed user's member_id`
- [ ] Every query binds `WHERE member_id = ?` to the authed user's linked `member_id`

**13.3 Self-registration API**
- [ ] `POST /api/auth/register` — public (no auth); creates a `registration_requests` row with `status='pending'`; sends email to Treasurer via Resend: "New registration request from [Name]"
- [ ] `GET /api/admin/registrations` — admin only; lists pending requests
- [ ] `POST /api/admin/registrations/[id]/approve` — admin only; creates `users` row (`role='member'`, `must_change_password=1`, `member_id` linked to selected member); sends invite email with one-time JWT link (48h expiry); sets request `status='approved'`
- [ ] `POST /api/admin/registrations/[id]/reject` — admin only; sends polite rejection email; sets `status='rejected'`, stores `rejection_reason`
- [ ] `POST /api/admin/bulk-invite` — admin only; send direct invite emails to all members who have an email on record but no user account yet (pre-approved path, no pending queue)

**13.4 Admin invite flow (direct invite from member profile)**
- [ ] Admin can invite a specific member from the member profile page: triggers `POST /api/admin/invite-member` → same result as approve (creates user, sends invite, links member_id)
- [ ] Invite email contains a one-time link: signed JWT (`{ sub: userId, purpose: 'set-password', exp: 48h }`), links to `/set-password?token=...`
- [ ] `POST /api/auth/set-password` — validates token, sets password, clears `must_change_password`

**13.5 UI — Registration form (public)**
- [ ] "Register" link on the login page → `app/(auth)/register/page.tsx`
- [ ] Fields: Full name, Email, Phone (optional), Member code (optional, hint: "If you know your code from a physical card"), Message to Treasurer (optional)
- [ ] On submit: POST to `/api/auth/register`; show: "Your registration request has been submitted. The Treasurer will review it and you'll receive an email when your account is ready."

**13.6 UI — Pending registrations (admin, in Settings)**
- [ ] Settings → "Pending Registrations" with badge count
- [ ] List of requests: name, email, phone, date submitted, message
- [ ] Approve action: dropdown to select existing member to link (or "Create new member"), then confirm
- [ ] Reject action: optional rejection reason field
- [ ] Approved/rejected history also visible (status filter)

**13.7 UI — Member dashboard (`/me`)**
- [ ] Separate layout for `member` role — simpler, no sidebar nav to Foundation-wide pages
- [ ] Landing: outstanding dues (prominent), total contributed this year, quick stats
- [ ] Subscription history: year tabs, P/D/N/A chip grid (read-only); each paid row has a "Download Receipt" button
- [ ] Donation history: date, type, amount, mode
- [ ] Personal details: name (read-only), email and phone (editable)
- [ ] Link to Payments page and Scholarship Announcement page in nav
- [ ] Middleware redirects `member` role away from all non-`/me` app routes

**13.8 UI — Receipt download (PDF)**
- [ ] "Download Receipt" button on each paid subscription row in the member dashboard
- [ ] Calls `GET /api/me/receipts/[subscriptionId]`
- [ ] PDF generated server-side using `@react-pdf/renderer`:
  - Header: "GSF Foundation — PAYMENT RECEIPT"
  - Receipt No: `RCP-YYYY-MM-[memberCode]` (constructed from subscription data)
  - Member name, code, payment for (month/year), amount, mode, reference, date of payment, status "PAID ✓"
  - Footer: "System-generated receipt · GSF Foundation"
- [ ] Response: `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="receipt-YYYY-MM.pdf"`
- [ ] All roles (admin, editor, viewer) can also download receipts from the Treasurer-facing subscription view

**13.9 UI — Payments page (`/payments`, all roles)**
- [ ] `app/(app)/payments/page.tsx` — visible to all authenticated roles
- [ ] Fetches banking details from `settings` table (keys: `bank_name`, `account_name`, `account_number`, `ifsc_code`, `branch`, `upi_id`, `gpay_number`)
- [ ] Displays account number masked: show only last 4 digits (`XXXXXXXX4521`)
- [ ] Generates UPI QR code dynamically:
  ```ts
  import QRCode from 'qrcode';
  const upiUrl = `upi://pay?pa=${upiId}&pn=GSF+Foundation&cu=INR`;
  const qrDataUrl = await QRCode.toDataURL(upiUrl);
  // <img src={qrDataUrl} alt="Scan to pay" />
  ```
- [ ] Note displayed below QR: "Amount is not pre-filled — enter the amount yourself and send a screenshot to the Treasurer via WhatsApp after paying."
- [ ] Admin can edit banking details from this page (or from Settings)
- [ ] Link to payments page in `/me` nav for members; in sidebar for other roles

**13.10 Row-level security**
- [ ] Every `/api/me/*` route checks `isMember(user.role)` — 403 for non-members
- [ ] Every query binds `WHERE member_id = ?` to the authed user's `member_id`
- [ ] A crafted API request supplying a different `member_id` returns empty results (not an error — just empty)

**13.11 Mobile pass**
- [ ] Registration form usable at 360px
- [ ] `/me` dashboard usable at 360px — members primarily on phones
- [ ] Subscription grid scrolls horizontally with sticky month labels
- [ ] QR code large enough to scan on a phone screen (≥ 200×200px)
- [ ] PDF download works on mobile Safari (use `Content-Disposition: attachment`)
- [ ] Personal details form single column on mobile

**13.12 Review gate**
- [ ] Member self-registers → Treasurer receives email → approves and links to member record → member receives invite → sets password → logs in → sees own data
- [ ] Bulk invite sends emails to all eligible members
- [ ] Member cannot access `/dashboard`, `/ledger`, `/members`, or any Foundation-wide route
- [ ] Receipt PDF downloads correctly: name, code, month/year, amount, mode, reference, date
- [ ] Receipt endpoint rejects requests where `subscription.member_id !== authed user's member_id`
- [ ] Payments page shows correct banking details; QR code scans correctly in GPay/Paytm
- [ ] Account number is masked in display
- [ ] Registration with an email already in `registration_requests` or `users` is rejected (duplicate check)
- [ ] Profile update (phone/email) logs to audit_log
- [ ] No TypeScript errors
- [ ] Mobile: all actions work at 360px
- [ ] Commit: `feat: member portal, receipt download, payments page, self-registration`

---

## 13. DEFERRED TO V2 (do NOT build in V1)

Documented only so you don't accidentally start on them.

1. In-app UPI/Razorpay payments
2. Scholarship application engine (document upload, approval workflow)
3. Public fundraising / medical campaign pages
4. Chit-fund module
5. WhatsApp/SMS notifications (only email in V1)
6. In-app approval workflow for board decisions
7. 80G tax receipts
8. Trend analytics beyond dashboard
9. Multi-language UI (English only in V1)
10. Native iOS/Android apps (responsive PWA in V1)

---

## 14. COMMUNICATION PROTOCOL

### 14.1 Weekly Friday update (send without fail)

```
Project GSF — Week [X] Update

✅ Done this week:
• …

🔄 In progress:
• …

📅 Next week:
• …

🔗 Preview: https://dev.gsf-accounts.pages.dev
🔗 Production: https://gsf-accounts.pages.dev
```

### 14.2 Feedback handling

When Treasurer sends feedback via WhatsApp:
1. Create a GitHub Issue immediately with labels (`client-feedback` + `v1` or `v2`)
2. Reply: "Got it — logged as issue #X. Will confirm by [date] if it fits V1 or needs a separate quote."
3. Never leave feedback in WhatsApp alone

### 14.3 Out-of-scope requests

> "Yes, that's doable. It's not in the original V1 scope so I'll add it as a change request. It adds roughly [X days]. Happy to proceed once you confirm in writing — WhatsApp reply is fine."

Screenshot the confirmation. Log it on the GitHub Issue.

---

## 15. GLOBAL CHECKLIST FOR EVERY NEW FEATURE

Before marking any feature "done":

- [ ] Does it work on 360px-wide screens?
- [ ] Are all tap targets ≥ 44×44px?
- [ ] Are all form fields labeled (not just placeholders)?
- [ ] Is there a loading state?
- [ ] Is there an error state with a user-friendly message?
- [ ] Is there an empty state?
- [ ] Does the API validate input with Zod?
- [ ] Does the API check the user's role?
- [ ] Does every mutation write to `audit_log`?
- [ ] Is the write atomic (`db.batch()`) if it touches multiple tables?
- [ ] Did I run the reconciliation query after testing?
- [ ] Did I test with a viewer account, not just admin?
- [ ] Is there no hardcoded string that should be configurable?
- [ ] Did I commit with a clear message?

---

## 16. WHEN IN DOUBT

- **Data integrity > speed.** Always.
- **Boring > clever.** The Treasurer is not impressed by one-liners.
- **Paraphrase, don't copy.** When referencing external docs, write in your own words.
- **Ask before assuming.** If a requirement isn't in this file or the linked docs, ask the Treasurer on WhatsApp. Don't guess.
- **Security isn't optional.** Every route checks auth. Every input is validated. Every mutation is logged.
- **Mobile first.** If it doesn't work on a phone, it doesn't work.
- **The Foundation owns everything.** You're a guest in their house. Build like you'll hand over the keys tomorrow — because you will.

---

*This file is the project's north star. Update it when decisions change. Any other markdown in `/docs` is supplementary; this is canonical.*

**Last updated:** project kickoff, April 2026
**Maintained by:** Muhammed Suhaib
**Contact:** suhaib.muhammed2002@gmail.com · +91 76392 58738