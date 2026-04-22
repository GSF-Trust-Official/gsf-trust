# CLAUDE.md — Project GSF

> **Purpose of this file:** This is the single source of truth for any AI assistant or developer working on the Project GSF project. Read this fully before writing any code. Every decision has already been made — your job is to execute cleanly, incrementally, and professionally.

---

## 0. PROJECT OVERVIEW

### 0.1 What this project is

Project GSF is a treasurer-operated web application that replaces the Foundation's existing multi-sheet Excel workbook with a purpose-built ledger system. It is a **financial application** — accuracy, auditability, and data integrity are non-negotiable.

The Foundation currently manages ~₹4,57,900 across two accounts (General and Zakat/GFES) with ~25 members, monthly subscriptions, donations, medical assistance cases, and scholarship payouts. Everything is tracked in Excel today, with all the problems that implies: formula drift, casing mismatches, no audit trail, no role-based access, no reliable backups.

**This is Version 1.** Scope is deliberately locked — see §4 for what's in and §13 for what's explicitly deferred to V2.

### 0.2 Who uses it

| Role | Count | Access |
|------|-------|--------|
| Treasurer (Admin) | 1 | Full read/write |
| Joint Treasurer (optional) | 0–1 | Write-capable backup |
| Board Members (Viewers) | up to 12 | View-only, audit-ready |

Members themselves do **not** log in. V1 workflow: treasurer logs everything; board reviews.

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
| File storage | Cloudflare R2 | Free tier 10GB, for PDF/Excel exports |
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
name = "gsf-accounts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "gsf-accounts-db"
database_id = "REPLACE_WITH_ACTUAL_ID"

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "gsf-accounts-files"
```

Commit this file. It contains no secrets.

### 2.4 Branches and deploys

- `main` → production (auto-deploys to `gsf-accounts.pages.dev`)
- `dev` → preview (auto-deploys to `dev.gsf-accounts.pages.dev`) — share this URL with the Treasurer weekly
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

10 core modules, all functional end-to-end on mobile and desktop.

1. **Authentication** — Email + password, JWT in httpOnly cookie, optional 2FA for treasurer, forgot password
2. **Dashboard** — KPI tiles (Total Funds, General, Zakat, Medical Pool, Outstanding Dues), Recharts (donation breakdown, expense allocation, collection rate), quick action buttons
3. **Members Roster** — CRUD, search, filter (Active/Inactive/BOD), per-member profile with contribution history
4. **Subscription Tracker** — P/D/N/A matrix, year selector, clickable cells, bulk mark-as-paid, arrears view
5. **General Ledger** — chronological, filters (date/category/member/in-out), running balance, export
6. **Zakat Ledger** — completely separate, restricted badge, scholarship-only outflows
7. **Donations Tracker** — Hadiya/Zakat/Other, auto-routed to correct account
8. **Medical Assistance Log** — cases with beneficiary (maskable), amounts, pledges, status
9. **Scholarship Log** — payouts, academic year, eligibility notes, Zakat-sourced
10. **Reports & Exports** — Annual report (Excel + PDF), Usage Breakdown, custom date-range exports

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

### 6.3 Schema design principles (for future migrations / stack migration)

- **Prefer SQL-standard types.** Even though D1 is SQLite, write SQL that would migrate to Postgres with minimal changes. Avoid SQLite-specific tricks where a standard form exists.
- **Explicit constraints.** Every FK, CHECK, UNIQUE is declared — don't rely on application logic alone.
- **Timestamps in ISO 8601.** `datetime('now')` produces `YYYY-MM-DD HH:MM:SS` which parses cleanly in JS and Postgres.
- **IDs are opaque strings.** Don't expose sequential integers. Current: 16-byte random hex. Could swap to UUIDs later without breaking code that treats them as strings.
- **Monetary values as REAL for now.** If stack migrates to Postgres, change to `NUMERIC(12,2)`. Don't use floats for intermediate calculations — always round to 2dp before comparing.
- **No ORM-specific types.** Anyone reading the schema should understand it without Prisma/Drizzle knowledge.

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

- Minimum 12 characters for admins, 10 for viewers
- Hash with bcryptjs, **12 rounds** minimum
- On first login from invited account, force password change (`must_change_password = 1`)
- Rate-limit login attempts: 5 failures in 15 min → lock account for 15 min
- Log every login, logout, and failed login to `audit_log`

### 7.4 Role enforcement pattern

Every protected route checks role explicitly:

```ts
// app/api/subscriptions/route.ts
export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  if (user.role !== 'admin') return json({ error: 'Forbidden' }, 403);
  // ... proceed
}
```

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

- **Keep Cloudflare-specific code at the edges.** Anything that touches `env.DB` or `env.STORAGE` lives in `lib/db.ts` or `lib/storage.ts` — not scattered across route handlers.
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

### PHASE 0 — Project Setup & First Deploy (2–3 days)

**Goal:** A blank Next.js app deployed to Cloudflare Pages on a live URL before writing any feature code.

**Sub-phases:**

**0.1 Repo bootstrap**
- [ ] Clone the Foundation's empty repo
- [ ] Run `create-next-app` with TypeScript, Tailwind, App Router
- [ ] Install all dependencies listed in §1.1
- [ ] Initialize shadcn/ui
- [ ] Create folder structure from §3

**0.2 Cloudflare config**
- [ ] Write `next.config.ts` with `@cloudflare/next-on-pages` dev platform
- [ ] Add `build:cf`, `preview:cf`, `deploy` scripts to `package.json`
- [ ] Create `wrangler.toml`
- [ ] Run `wrangler d1 create gsf-accounts-db`
- [ ] Update `wrangler.toml` with the database ID
- [ ] Run `wrangler r2 bucket create gsf-accounts-files`

**0.3 Env vars & secrets**
- [ ] Generate JWT_SECRET (64 random bytes hex)
- [ ] Create `.env.local` with all required vars
- [ ] Create `.env.example` (committed, empty values)
- [ ] Confirm `.env.local` is gitignored

**0.4 Tailwind theme**
- [ ] Extend `tailwind.config.ts` with color tokens from §5.1
- [ ] Load Plus Jakarta Sans, Inter, JetBrains Mono via `next/font`
- [ ] Create `app/globals.css` with base styles

**0.5 First deploy**
- [ ] Push `main` and `dev` branches to GitHub
- [ ] In Cloudflare dashboard: Workers & Pages → Create → Connect to Git
- [ ] Configure build: command `npm run build:cf`, output `.vercel/output/static`
- [ ] Set production branch `main`, preview branch `dev`
- [ ] Add all env vars for both Production and Preview
- [ ] Deploy and confirm the blank Next.js page loads

**0.6 Review gate**
- [ ] Production URL loads without errors
- [ ] Dev preview URL loads and differs (e.g. console.log confirms)
- [ ] D1 database exists and is bound
- [ ] R2 bucket exists and is bound
- [ ] No errors in Cloudflare build log
- [ ] No TypeScript errors locally
- [ ] `.gitignore` excludes `.env.local`, `.vercel/`, `node_modules/`
- [ ] README has "Getting Started" section
- [ ] Commit: `chore: initial project setup, cloudflare pages connected`

---

### PHASE 1 — Database Schema & Auth Foundation (3–4 days)

**Goal:** Treasurer can log in and land on an empty dashboard. Middleware protects routes. Audit log works.

**Sub-phases:**

**1.1 Schema**
- [ ] Write `cloudflare/migrations/001_initial_schema.sql` from §6.2
- [ ] Apply locally: `wrangler d1 execute gsf-accounts-db --local --file=...`
- [ ] Apply remote
- [ ] Write `002_seed_treasurer.sql` (generate bcrypt hash locally, commit only the hash, never plaintext)
- [ ] Apply seed locally and remote

**1.2 Type definitions**
- [ ] Create `types/index.ts` with interfaces matching every table
- [ ] Verify every nullable column is `T | null` in TS

**1.3 DB helper layer**
- [ ] `lib/db.ts` — exports `getDb(env)` that returns typed D1 client
- [ ] `lib/queries/users.ts` — `getUserByEmail`, `updateLastLogin`
- [ ] `lib/audit.ts` — the `logAudit` helper from §9

**1.4 Auth**
- [ ] `lib/auth.ts` — `hashPassword`, `verifyPassword`, `signToken`, `verifyToken`
- [ ] Zod schema for login input
- [ ] `app/api/auth/login/route.ts` — validates, checks password, sets cookie, logs audit
- [ ] `app/api/auth/logout/route.ts` — clears cookie, logs audit
- [ ] `middleware.ts` — the code from §7.2
- [ ] Login rate limiting (simple in-memory or D1-backed counter)

**1.5 UI shell**
- [ ] `app/(auth)/login/page.tsx` — email + password form, shadcn components
- [ ] `app/(app)/layout.tsx` — sidebar layout, responsive (sidebar → bottom nav on mobile)
- [ ] `app/(app)/dashboard/page.tsx` — placeholder "Welcome [name]"
- [ ] Sign out button in sidebar

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
- [ ] Viewers (role=viewer) see list but Add/Edit buttons hidden
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
- [ ] Hidden for viewers
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

### PHASE 5 — Ledgers & Log Expense (3–4 days)

**Goal:** General Ledger, Zakat Ledger, Log Expense modal. Zakat isolation enforced.

**Sub-phases:**

**5.1 Queries**
- [ ] `lib/queries/ledger.ts` — `getLedger({ account, filters, page })`, `getRunningBalance()`, `insertExpense(...)`

**5.2 API**
- [ ] `GET /api/ledger?account=general&...` — paginated, filtered
- [ ] `POST /api/ledger/expense` — atomic write + audit
- [ ] Server-side check: if account=zakat, category must be 'Scholarship'

**5.3 UI — General Ledger**
- [ ] `app/(app)/ledger/page.tsx`
- [ ] Columns: Date, Category/Sub, Member Code, Description, Amount (colored), Running Balance
- [ ] Filters: date range picker, category select, member code input, in/out toggle
- [ ] Current balance KPI top-right
- [ ] Server-side pagination (20/page)
- [ ] Export PDF / Excel buttons (toast "coming soon" until Phase 8)

**5.4 UI — Zakat Ledger**
- [ ] `app/(app)/zakat/page.tsx`
- [ ] Same layout, filtered to account='zakat'
- [ ] Red "Restricted Account" badge top
- [ ] Balance displayed separately, never merged
- [ ] Filter tabs: All / Inflows / Payouts

**5.5 UI — Log Expense modal**
- [ ] Fields: Account radio (General/Zakat), Category select, Description, Amount, Date, Reference, Notes
- [ ] When Account=Zakat, Category options reduce to Scholarship only (grey out others)
- [ ] Client shows amount as positive; stored as negative in DB
- [ ] Submit: batch write

**5.6 Mobile pass**
- [ ] Ledger tables → stacked cards on mobile
- [ ] Filters collapse into a bottom sheet on mobile
- [ ] Modal full-screen on mobile

**5.7 Review gate**
- [ ] General ledger shows all general entries, never zakat
- [ ] Zakat ledger shows only zakat entries
- [ ] Log Expense with Zakat + Medical is rejected by the API (even if UI somehow bypassed)
- [ ] Running balance calculation is correct (spot check 3 entries manually)
- [ ] Filters combine correctly (date + category + member)
- [ ] Pagination works
- [ ] **Isolation test:** run the Zakat isolation SQL from §8.5 — must return 0
- [ ] Commit: `feat: general ledger, zakat ledger, log expense with restriction`

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

### PHASE 7 — Medical & Scholarship (3–4 days)

**Goal:** Medical cases CRUD with privacy masking; scholarship payouts deduct from Zakat.

**Sub-phases:**

**7.1 Medical queries + API + UI**
- [ ] Case list with beneficiary (masked for viewers if `mask_name=1`)
- [ ] Add case modal
- [ ] Case detail page with linked ledger entries
- [ ] Mark pledge received (updates amount_external)
- [ ] Close case action

**7.2 Scholarship queries + API + UI**
- [ ] Payout list
- [ ] Log Scholarship Payout modal — writes to Zakat ledger (negative amount)
- [ ] Eligibility notes field

**7.3 Privacy check**
- [ ] Viewer sees "XXXX" for masked beneficiaries
- [ ] Admin sees real names
- [ ] Export respects masking preference

**7.4 Mobile pass**
- [ ] Case detail readable at 360px
- [ ] Modals full-screen

**7.5 Review gate**
- [ ] Medical CRUD end-to-end
- [ ] Scholarship payout deducts from Zakat balance
- [ ] Masking works for viewers
- [ ] Audit log captures everything
- [ ] Commit: `feat: medical cases, scholarship log, privacy masking`

---

### PHASE 8 — Reports & Exports (3–4 days)

**Goal:** Annual report + custom range exports, Excel + PDF, stored in R2, signed download links.

**Sub-phases:**

**8.1 Query layer for reports**
- [ ] `lib/queries/reports.ts` — `getAnnualReport(fy)`, `getUsageBreakdown(from, to)`, `getCustomRangeLedger(...)`

**8.2 Excel export (`xlsx` lib)**
- [ ] Multi-sheet: Summary, General, Zakat, Subscriptions, Medical, Scholarship
- [ ] Save to R2 with timestamped name
- [ ] Generate signed URL (expires 1 hour)

**8.3 PDF export (`@react-pdf/renderer`)**
- [ ] Clean branded layout
- [ ] Same data as Excel but formatted

**8.4 UI**
- [ ] Reports page: pick report type + date range → generate → download link
- [ ] Export buttons inside each ledger page also work

**8.5 Mobile pass**
- [ ] Reports page usable at 360px
- [ ] Downloads work on mobile Safari

**8.6 Review gate**
- [ ] Annual report Excel has correct totals matching reconciliation
- [ ] PDF formats correctly (spot check layout)
- [ ] Files land in R2
- [ ] Signed URL works and expires
- [ ] Commit: `feat: annual report excel+pdf exports, r2 storage, signed urls`

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
- [ ] Pinned GitHub Issue: "V2 Roadmap" with deferred features from §13
- [ ] README.md complete
- [ ] `docs/RESTORE.md` written
- [ ] Fork repo to personal GitHub (before access changes)

**12.3 Review gate**
- [ ] Cloudflare role = Read
- [ ] Treasurer confirms they can log into every account using only the Foundation Gmail
- [ ] Commit: `docs: handover complete`

---

## 13. DEFERRED TO V2 (do NOT build in V1)

Documented only so you don't accidentally start on them:

1. Member self-service portal
2. In-app UPI/Razorpay payments
3. Scholarship application engine (with document upload, approval workflow)
4. Public fundraising / medical campaign pages
5. Chit-fund module
6. WhatsApp/SMS notifications (only email in V1)
7. In-app approval workflow for board decisions
8. 80G tax receipts
9. Trend analytics beyond dashboard
10. Multi-language UI (English only in V1)
11. Native iOS/Android apps (responsive PWA in V1)

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