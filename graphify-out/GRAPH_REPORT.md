# Graph Report - .  (2026-05-05)

## Corpus Check
- 140 files · ~62,852 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 387 nodes · 471 edges · 34 communities detected
- Extraction: 84% EXTRACTED · 16% INFERRED · 0% AMBIGUOUS · INFERRED: 75 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Project Architecture & Infrastructure|Project Architecture & Infrastructure]]
- [[_COMMUNITY_API Route Handlers|API Route Handlers]]
- [[_COMMUNITY_Core App Pages & KPI Components|Core App Pages & KPI Components]]
- [[_COMMUNITY_Google Drive Integration|Google Drive Integration]]
- [[_COMMUNITY_App Layouts & Pages|App Layouts & Pages]]
- [[_COMMUNITY_Scholarship Module|Scholarship Module]]
- [[_COMMUNITY_Ledger Write API|Ledger Write API]]
- [[_COMMUNITY_Ledger UI & Filtering|Ledger UI & Filtering]]
- [[_COMMUNITY_PDF Receipts & Member Portal|PDF Receipts & Member Portal]]
- [[_COMMUNITY_Settings & Configuration|Settings & Configuration]]
- [[_COMMUNITY_Form UI Components|Form UI Components]]
- [[_COMMUNITY_Authentication & Security|Authentication & Security]]
- [[_COMMUNITY_Excel Export Utilities|Excel Export Utilities]]
- [[_COMMUNITY_Expense Logging UI|Expense Logging UI]]
- [[_COMMUNITY_Card UI Component|Card UI Component]]
- [[_COMMUNITY_App Shell Layout|App Shell Layout]]
- [[_COMMUNITY_Root Page|Root Page]]
- [[_COMMUNITY_Auth Layout|Auth Layout]]
- [[_COMMUNITY_Set Password Page|Set Password Page]]
- [[_COMMUNITY_Sign Out Button|Sign Out Button]]
- [[_COMMUNITY_Edit Entry Modal|Edit Entry Modal]]
- [[_COMMUNITY_Log Interest Modal|Log Interest Modal]]
- [[_COMMUNITY_Button Component|Button Component]]
- [[_COMMUNITY_Label Component|Label Component]]
- [[_COMMUNITY_D1 Database Helper|D1 Database Helper]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_Audit Statement Helper|Audit Statement Helper]]
- [[_COMMUNITY_Insert Donation Query|Insert Donation Query]]
- [[_COMMUNITY_Get User Query|Get User Query]]
- [[_COMMUNITY_Login Schema (Zod)|Login Schema (Zod)]]
- [[_COMMUNITY_Change Password Schema|Change Password Schema]]
- [[_COMMUNITY_Log Donation Schema|Log Donation Schema]]
- [[_COMMUNITY_General Ledger Page|General Ledger Page]]
- [[_COMMUNITY_Settings Page (Admin)|Settings Page (Admin)]]

## God Nodes (most connected - your core abstractions)
1. `POST()` - 42 edges
2. `CLAUDE.md â€” Full Project Specification` - 35 edges
3. `GSF Trust â€” Foundation Accounts Manager (README)` - 32 edges
4. `GET()` - 30 edges
5. `getSessionUser()` - 12 edges
6. `runBackup()` - 11 edges
7. `PATCH()` - 11 edges
8. `isMember (lib/roles)` - 11 edges
9. `Dashboard Page` - 7 edges
10. `fmtDate()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Globe/Web Icon (SVG)` --semantically_similar_to--> `GSF Trust Application`  [INFERRED] [semantically similar]
  public/globe.svg → README.md
- `Browser Window / App UI Icon (SVG)` --semantically_similar_to--> `GSF Trust Application`  [INFERRED] [semantically similar]
  public/window.svg → README.md
- `Next.js Wordmark Logo (SVG)` --semantically_similar_to--> `Next.js 15 (App Router)`  [INFERRED] [semantically similar]
  public/next.svg → README.md
- `Vercel Triangle Logo (SVG)` --semantically_similar_to--> `Cloudflare Workers (Edge Runtime)`  [INFERRED] [semantically similar]
  public/vercel.svg → README.md
- `File/Document Icon (SVG)` --semantically_similar_to--> `Reports & Exports Page`  [INFERRED] [semantically similar]
  public/file.svg → README.md

## Hyperedges (group relationships)
- **Atomic Write + Audit Log Pattern (db.batch with mutation + audit)** — db_batch_atomicity, audit_log_table, lib_audit [EXTRACTED 1.00]
- **Zakat Isolation Enforcement (principle + SQL check + restricted ledger)** — zakat_restriction_principle, zakat_isolation_sql, zakat_ledger_page [EXTRACTED 1.00]
- **Export Pipeline (Excel + PDF + Google Drive upload)** — xlsx_sheetjs, react_pdf, google_drive_storage [EXTRACTED 1.00]

## Communities

### Community 0 - "Project Architecture & Infrastructure"
Cohesion: 0.04
Nodes (71): AGENTS.md â€” Next.js Agent Rules, audit_log Table (Immutable Audit Trail), Weekly Backup Cron (Sunday 00:00 IST â†’ Google Drive), CLAUDE.md â€” Full Project Specification, Cloudflare D1 (SQLite Database), cloudflare/migrations/ â€” SQL Migration Files, Cloudflare Workers (Edge Runtime), Dashboard â€” KPI Tiles + Charts (+63 more)

### Community 1 - "API Route Handlers"
Cohesion: 0.06
Nodes (20): getSecret(), getUserFromRequest(), hashPassword(), signToken(), verifyPassword(), verifyToken(), createMedicalCase(), generateCaseRef() (+12 more)

### Community 2 - "Core App Pages & KPI Components"
Cohesion: 0.08
Nodes (32): Dashboard API Route, Ledger API Route, Members API Route, DashboardCharts Component, KpiTile Component, QuickActions Component, RecentActivity Component, DonationsClient Component (+24 more)

### Community 3 - "Google Drive Integration"
Cohesion: 0.17
Nodes (20): deleteDriveFile(), getAccessToken(), isDriveConfigured(), listDriveFiles(), uploadToDrive(), buildBackupConfirmationHtml(), buildBackupConfirmationText(), buildDonationReceiptHtml() (+12 more)

### Community 4 - "App Layouts & Pages"
Cohesion: 0.11
Nodes (10): AppLayout(), MeLayout(), getMedicalCases(), ChangePasswordPage(), MedicalPage(), PaymentsPage(), ReportsPage(), SettingsPage() (+2 more)

### Community 5 - "Scholarship Module"
Cohesion: 0.2
Nodes (8): ScholarshipPage(), activateAnnouncement(), generateId(), getActiveAnnouncement(), upsertAnnouncement(), generateId(), getScholarshipPayouts(), insertScholarshipPayout()

### Community 6 - "Ledger Write API"
Cohesion: 0.17
Nodes (12): Ledger Expense API Route, Ledger [id] API Route, Ledger Interest API Route, insertExpense (lib/queries/ledger), insertInterest (lib/queries/ledger), softDeleteEntry (lib/queries/ledger), updateEntry (lib/queries/ledger), canWrite (lib/roles) (+4 more)

### Community 7 - "Ledger UI & Filtering"
Cohesion: 0.29
Nodes (8): AmountCell(), applyFilters(), BalanceCell(), buildUrl(), clearFilters(), formatDate(), StatusChip(), formatINR()

### Community 8 - "PDF Receipts & Member Portal"
Cohesion: 0.32
Nodes (3): fmtDate(), fmtINR(), MeDonationsPage()

### Community 9 - "Settings & Configuration"
Cohesion: 0.36
Nodes (5): getSetting(), setSetting(), setSettings(), patchSettings(), saveBanking()

### Community 10 - "Form UI Components"
Cohesion: 0.36
Nodes (4): onSubmit(), cn(), onSubmit(), react-hook-form + zod â€” Form Validation

### Community 11 - "Authentication & Security"
Cohesion: 0.32
Nodes (7): bcryptjs Password Hashing (12 rounds), Defense in Depth â€” Role check inside every route handler, Custom JWT Authentication (jose library), lib/auth.ts â€” JWT + bcrypt Helpers, Login Page (Public), middleware(), redirectToLogin()

### Community 12 - "Excel Export Utilities"
Cohesion: 0.4
Nodes (2): fmtINR(), generateExcel()

### Community 14 - "Expense Logging UI"
Cohesion: 0.67
Nodes (2): handleAccountChange(), handleSubmit()

### Community 17 - "Card UI Component"
Cohesion: 0.67
Nodes (2): CardAction(), cn()

### Community 18 - "App Shell Layout"
Cohesion: 0.67
Nodes (1): RootLayout()

### Community 19 - "Root Page"
Cohesion: 0.67
Nodes (1): RootPage()

### Community 20 - "Auth Layout"
Cohesion: 0.67
Nodes (1): AuthLayout()

### Community 21 - "Set Password Page"
Cohesion: 0.67
Nodes (1): handleSubmit()

### Community 22 - "Sign Out Button"
Cohesion: 0.67
Nodes (1): SignOutButton()

### Community 23 - "Edit Entry Modal"
Cohesion: 0.67
Nodes (1): EditEntryModal()

### Community 24 - "Log Interest Modal"
Cohesion: 0.67
Nodes (1): handleSubmit()

### Community 28 - "Button Component"
Cohesion: 0.67
Nodes (1): cn()

### Community 29 - "Label Component"
Cohesion: 0.67
Nodes (1): cn()

### Community 30 - "D1 Database Helper"
Cohesion: 0.67
Nodes (1): getDb()

### Community 44 - "Next.js Config"
Cohesion: 1.0
Nodes (1): Next.js Config

### Community 52 - "Audit Statement Helper"
Cohesion: 1.0
Nodes (1): auditStatement (lib/audit)

### Community 53 - "Insert Donation Query"
Cohesion: 1.0
Nodes (1): insertDonation (lib/queries/donations)

### Community 54 - "Get User Query"
Cohesion: 1.0
Nodes (1): getUserByEmail (lib/queries/users)

### Community 55 - "Login Schema (Zod)"
Cohesion: 1.0
Nodes (1): LoginSchema (lib/validators/auth)

### Community 56 - "Change Password Schema"
Cohesion: 1.0
Nodes (1): ChangePasswordSchema (lib/validators/auth)

### Community 57 - "Log Donation Schema"
Cohesion: 1.0
Nodes (1): LogDonationSchema (lib/validators/donation)

### Community 70 - "General Ledger Page"
Cohesion: 1.0
Nodes (1): General Ledger Page

### Community 71 - "Settings Page (Admin)"
Cohesion: 1.0
Nodes (1): Settings Page (Admin Only)

## Knowledge Gaps
- **57 isolated node(s):** `Next.js Config`, `DashboardCharts Component`, `KpiTile Component`, `QuickActions Component`, `RecentActivity Component` (+52 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Excel Export Utilities`** (6 nodes): `fmtDate()`, `fmtINR()`, `generateExcel()`, `n()`, `s()`, `excel.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Expense Logging UI`** (4 nodes): `LogExpenseModal.tsx`, `LogExpenseModal.tsx`, `handleAccountChange()`, `handleSubmit()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Card UI Component`** (4 nodes): `card.tsx`, `CardAction()`, `cn()`, `card.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App Shell Layout`** (3 nodes): `layout.tsx`, `layout.tsx`, `RootLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Root Page`** (3 nodes): `page.tsx`, `page.tsx`, `RootPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth Layout`** (3 nodes): `layout.tsx`, `layout.tsx`, `AuthLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Set Password Page`** (3 nodes): `page.tsx`, `page.tsx`, `handleSubmit()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Sign Out Button`** (3 nodes): `SignOutButton.tsx`, `SignOutButton.tsx`, `SignOutButton()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Edit Entry Modal`** (3 nodes): `EditEntryModal.tsx`, `EditEntryModal.tsx`, `EditEntryModal()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Log Interest Modal`** (3 nodes): `LogInterestModal.tsx`, `LogInterestModal.tsx`, `handleSubmit()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Button Component`** (3 nodes): `cn()`, `button.tsx`, `button.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Label Component`** (3 nodes): `label.tsx`, `label.tsx`, `cn()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `D1 Database Helper`** (3 nodes): `db.ts`, `getDb()`, `db.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next.js Config`** (1 nodes): `Next.js Config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Audit Statement Helper`** (1 nodes): `auditStatement (lib/audit)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Insert Donation Query`** (1 nodes): `insertDonation (lib/queries/donations)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Get User Query`** (1 nodes): `getUserByEmail (lib/queries/users)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Login Schema (Zod)`** (1 nodes): `LoginSchema (lib/validators/auth)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Change Password Schema`** (1 nodes): `ChangePasswordSchema (lib/validators/auth)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Log Donation Schema`** (1 nodes): `LogDonationSchema (lib/validators/donation)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `General Ledger Page`** (1 nodes): `General Ledger Page`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Settings Page (Admin)`** (1 nodes): `Settings Page (Admin Only)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GET()` connect `API Route Handlers` to `Authentication & Security`, `Google Drive Integration`, `App Layouts & Pages`, `Scholarship Module`?**
  _High betweenness centrality (0.179) - this node is a cross-community bridge._
- **Why does `middleware()` connect `Authentication & Security` to `API Route Handlers`?**
  _High betweenness centrality (0.144) - this node is a cross-community bridge._
- **Why does `GSF Trust â€” Foundation Accounts Manager (README)` connect `Project Architecture & Infrastructure` to `Authentication & Security`?**
  _High betweenness centrality (0.121) - this node is a cross-community bridge._
- **Are the 21 inferred relationships involving `POST()` (e.g. with `getUserFromRequest()` and `hashPassword()`) actually correct?**
  _`POST()` has 21 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `GET()` (e.g. with `middleware()` and `getUserFromRequest()`) actually correct?**
  _`GET()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `getSessionUser()` (e.g. with `AppLayout()` and `MeLayout()`) actually correct?**
  _`getSessionUser()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Next.js Config`, `DashboardCharts Component`, `KpiTile Component` to the rest of the system?**
  _57 weakly-connected nodes found - possible documentation gaps or missing edges._