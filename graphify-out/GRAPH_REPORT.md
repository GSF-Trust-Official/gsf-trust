# Graph Report - .  (2026-04-28)

## Corpus Check
- 60 files · ~15,000 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 269 nodes · 321 edges · 11 communities detected
- Extraction: 74% EXTRACTED · 26% INFERRED · 0% AMBIGUOUS · INFERRED: 83 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Architecture & Auth Rules|Architecture & Auth Rules]]
- [[_COMMUNITY_API Routes & Client Components|API Routes & Client Components]]
- [[_COMMUNITY_Server-Side API Handlers|Server-Side API Handlers]]
- [[_COMMUNITY_Dashboard & Transaction APIs|Dashboard & Transaction APIs]]
- [[_COMMUNITY_Page Components & Layouts|Page Components & Layouts]]
- [[_COMMUNITY_Auth & Audit System|Auth & Audit System]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_SVG Assets|SVG Assets]]
- [[_COMMUNITY_SVG Assets|SVG Assets]]
- [[_COMMUNITY_SVG Assets|SVG Assets]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]

## God Nodes (most connected - your core abstractions)
1. `CLAUDE.md â€” GSF Project Full Specification` - 21 edges
2. `GSF Trust â€” Foundation Accounts Manager` - 18 edges
3. `POST()` - 16 edges
4. `isMember (lib/roles)` - 12 edges
5. `DB Table: ledger_entries` - 12 edges
6. `GET()` - 11 edges
7. `Dashboard Page` - 10 edges
8. `Donations API Route` - 10 edges
9. `Change Password Route` - 9 edges
10. `getSessionUser (lib/session)` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Next.js Logo SVG` --conceptually_related_to--> `Tech Stack: Next.js 15 + Cloudflare Workers + D1 + Tailwind v4 + shadcn/ui`  [INFERRED]
  public/next.svg → README.md
- `Vercel Logo SVG` --conceptually_related_to--> `Tech Stack: Next.js 15 + Cloudflare Workers + D1 + Tailwind v4 + shadcn/ui`  [INFERRED]
  public/vercel.svg → README.md
- `Donations API Route` --shares_data_with--> `DB Table: audit_log`  [INFERRED]
  app/api/donations/route.ts → cloudflare/migrations/001_initial_schema.sql
- `Ledger API Route` --shares_data_with--> `DB Table: ledger_entries`  [INFERRED]
  app/api/ledger/route.ts → cloudflare/migrations/001_initial_schema.sql
- `Ledger Expense API Route` --shares_data_with--> `DB Table: audit_log`  [INFERRED]
  app/api/ledger/expense/route.ts → cloudflare/migrations/001_initial_schema.sql

## Hyperedges (group relationships)
- **Core Toolchain Config (ESLint + PostCSS + Tailwind)** — eslintconfig_eslint_config, postcssconfig_postcss_config, postcssconfig_tailwindcss_postcss, eslintconfig_nextjs_core_web_vitals, eslintconfig_nextjs_typescript [INFERRED 0.85]
- **Data Integrity Principles** — readme_design_decision_soft_delete, readme_design_decision_audit_log, readme_reconciliation_query, claudemd_zakat_restriction_principle, claudemd_interest_ringfenced [INFERRED 0.88]
- **Public Static SVG Assets** — svg_file, svg_globe, svg_next, svg_vercel, svg_window [EXTRACTED 1.00]
- **Completed Development Phases (0, 1, 2)** — claudemd_phase0, claudemd_phase1, claudemd_phase2 [EXTRACTED 1.00]
- **Pending Development Phases (3â€“13)** — claudemd_phase3, claudemd_phase4, claudemd_phase5, claudemd_phase6, claudemd_phase7, claudemd_phase8, claudemd_phase9, claudemd_phase10, claudemd_phase11, claudemd_phase12, claudemd_phase13 [EXTRACTED 1.00]

## Communities

### Community 0 - "Architecture & Auth Rules"
Cohesion: 0.06
Nodes (45): Next.js Agent Rules (AGENTS.md), Next.js Breaking Changes Warning, Auth Flow: JWT in httpOnly cookie, bcryptjs 12 rounds, role enforcement, DB Schema: users, members, subscriptions, ledger_entries, donations, medical_cases, scholarship_payouts, audit_log, settings, Design System: Tailwind v4, shadcn/ui, Plus Jakarta Sans, Inter, JetBrains Mono, Non-Negotiable: Foundation Owns All Accounts, CLAUDE.md â€” GSF Project Full Specification, Non-Negotiable: Bank Interest Ring-Fenced (interest account, haram) (+37 more)

### Community 1 - "API Routes & Client Components"
Cohesion: 0.09
Nodes (35): Ledger API Route, Members API Route, DashboardCharts Component, KpiTile Component, QuickActions Component, RecentActivity Component, DonationsClient Component, LedgerPageClient Component (+27 more)

### Community 2 - "Server-Side API Handlers"
Cohesion: 0.09
Nodes (19): auditStatement(), canWrite(), getSecret(), getUserFromRequest(), hashPassword(), isAdmin(), signToken(), verifyPassword() (+11 more)

### Community 3 - "Dashboard & Transaction APIs"
Cohesion: 0.15
Nodes (22): Dashboard API Route, Donations API Route, Ledger Expense API Route, Ledger [id] API Route, Ledger Interest API Route, DB Table: donations, DB Table: ledger_entries, getUserFromRequest (lib/auth) (+14 more)

### Community 4 - "Page Components & Layouts"
Cohesion: 0.11
Nodes (10): isMember(), AppLayout(), getAllMembers(), middleware(), redirectToLogin(), ChangePasswordPage(), DashboardPage(), MembersPage() (+2 more)

### Community 5 - "Auth & Audit System"
Cohesion: 0.26
Nodes (12): Change Password Route, Login Route, DB Table: audit_log, DB Table: auth_attempts, DB Table: users, auditStatement (lib/audit), hashPassword (lib/auth), signToken (lib/auth) (+4 more)

### Community 10 - "ESLint Config"
Cohesion: 0.5
Nodes (4): ESLint Configuration, ESLint Global Ignores (.next, out, build, .open-next), eslint-config-next/core-web-vitals, eslint-config-next/typescript

### Community 49 - "SVG Assets"
Cohesion: 1.0
Nodes (1): File SVG Icon (generic file/document)

### Community 50 - "SVG Assets"
Cohesion: 1.0
Nodes (1): Globe SVG Icon (world/web/external link)

### Community 51 - "SVG Assets"
Cohesion: 1.0
Nodes (1): Window/Browser SVG Icon

### Community 52 - "Next.js Config"
Cohesion: 1.0
Nodes (1): Next.js Config

## Knowledge Gaps
- **53 isolated node(s):** `eslint-config-next/core-web-vitals`, `eslint-config-next/typescript`, `ESLint Global Ignores (.next, out, build, .open-next)`, `PostCSS Configuration`, `Next.js Agent Rules (AGENTS.md)` (+48 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `SVG Assets`** (1 nodes): `File SVG Icon (generic file/document)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `SVG Assets`** (1 nodes): `Globe SVG Icon (world/web/external link)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `SVG Assets`** (1 nodes): `Window/Browser SVG Icon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next.js Config`** (1 nodes): `Next.js Config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GET()` connect `Page Components & Layouts` to `Server-Side API Handlers`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Why does `POST()` connect `Server-Side API Handlers` to `Page Components & Layouts`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `POST()` (e.g. with `getUserFromRequest()` and `canWrite()`) actually correct?**
  _`POST()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `DB Table: ledger_entries` (e.g. with `Donations API Route` and `Ledger API Route`) actually correct?**
  _`DB Table: ledger_entries` has 11 INFERRED edges - model-reasoned connections that need verification._
- **What connects `eslint-config-next/core-web-vitals`, `eslint-config-next/typescript`, `ESLint Global Ignores (.next, out, build, .open-next)` to the rest of the system?**
  _53 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Architecture & Auth Rules` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `API Routes & Client Components` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._