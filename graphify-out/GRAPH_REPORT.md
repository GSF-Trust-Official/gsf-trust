# Graph Report - .  (2026-04-27)

## Corpus Check
- Corpus is ~24,633 words - fits in a single context window. You may not need a graph.

## Summary
- 171 nodes · 170 edges · 9 communities detected
- Extraction: 70% EXTRACTED · 30% INFERRED · 0% AMBIGUOUS · INFERRED: 51 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_API Route Handlers|API Route Handlers]]
- [[_COMMUNITY_Project Specification & DB Design|Project Specification & DB Design]]
- [[_COMMUNITY_Architecture & Design System|Architecture & Design System]]
- [[_COMMUNITY_App Pages & Layouts|App Pages & Layouts]]
- [[_COMMUNITY_User Queries|User Queries]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_File SVG Icon|File SVG Icon]]
- [[_COMMUNITY_Globe SVG Icon|Globe SVG Icon]]
- [[_COMMUNITY_Window SVG Icon|Window SVG Icon]]

## God Nodes (most connected - your core abstractions)
1. `CLAUDE.md â€” GSF Project Full Specification` - 21 edges
2. `GSF Trust â€” Foundation Accounts Manager` - 18 edges
3. `POST()` - 14 edges
4. `GET()` - 9 edges
5. `getSessionUser()` - 8 edges
6. `DB Schema: users, members, subscriptions, ledger_entries, donations, medical_cases, scholarship_payouts, audit_log, settings` - 8 edges
7. `getUserFromRequest()` - 6 edges
8. `PATCH()` - 5 edges
9. `DELETE()` - 5 edges
10. `auditStatement()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Next.js Logo SVG` --conceptually_related_to--> `Tech Stack: Next.js 15 + Cloudflare Workers + D1 + Tailwind v4 + shadcn/ui`  [INFERRED]
  public/next.svg → README.md
- `Vercel Logo SVG` --conceptually_related_to--> `Tech Stack: Next.js 15 + Cloudflare Workers + D1 + Tailwind v4 + shadcn/ui`  [INFERRED]
  public/vercel.svg → README.md
- `POST()` --calls--> `getUserByEmail()`  [INFERRED]
  C:\Users\Muhammed suhaib\Documents\Everything\GSF\gsf-trust\app\api\members\route.ts → C:\Users\Muhammed suhaib\Documents\Everything\GSF\gsf-trust\lib\queries\users.ts
- `@tailwindcss/postcss Plugin` --conceptually_related_to--> `Design System: Tailwind v4, shadcn/ui, Plus Jakarta Sans, Inter, JetBrains Mono`  [INFERRED]
  postcss.config.mjs → CLAUDE.md
- `AppLayout()` --calls--> `getSessionUser()`  [INFERRED]
  C:\Users\Muhammed suhaib\Documents\Everything\GSF\gsf-trust\app\(app)\layout.tsx → C:\Users\Muhammed suhaib\Documents\Everything\GSF\gsf-trust\lib\session.ts

## Hyperedges (group relationships)
- **Core Toolchain Config (ESLint + PostCSS + Tailwind)** — eslintconfig_eslint_config, postcssconfig_postcss_config, postcssconfig_tailwindcss_postcss, eslintconfig_nextjs_core_web_vitals, eslintconfig_nextjs_typescript [INFERRED 0.85]
- **Data Integrity Principles** — readme_design_decision_soft_delete, readme_design_decision_audit_log, readme_reconciliation_query, claudemd_zakat_restriction_principle, claudemd_interest_ringfenced [INFERRED 0.88]
- **Public Static SVG Assets** — svg_file, svg_globe, svg_next, svg_vercel, svg_window [EXTRACTED 1.00]
- **Completed Development Phases (0, 1, 2)** — claudemd_phase0, claudemd_phase1, claudemd_phase2 [EXTRACTED 1.00]
- **Pending Development Phases (3â€“13)** — claudemd_phase3, claudemd_phase4, claudemd_phase5, claudemd_phase6, claudemd_phase7, claudemd_phase8, claudemd_phase9, claudemd_phase10, claudemd_phase11, claudemd_phase12, claudemd_phase13 [EXTRACTED 1.00]

## Communities

### Community 0 - "API Route Handlers"
Cohesion: 0.12
Nodes (18): auditStatement(), canWrite(), getSecret(), getUserFromRequest(), hashPassword(), isAdmin(), signToken(), verifyPassword() (+10 more)

### Community 1 - "Project Specification & DB Design"
Cohesion: 0.11
Nodes (24): Next.js Agent Rules (AGENTS.md), Next.js Breaking Changes Warning, DB Schema: users, members, subscriptions, ledger_entries, donations, medical_cases, scholarship_payouts, audit_log, settings, Non-Negotiable: Zakat Restricted to Scholarship Only, Backup Strategy (weekly cron + manual via Settings), Credentials & Handover (Foundation owns all accounts), D1 Database Migrations (wrangler d1 execute), Design Decision: Every Write Audited in audit_log via db.batch() (+16 more)

### Community 2 - "Architecture & Design System"
Cohesion: 0.1
Nodes (21): Auth Flow: JWT in httpOnly cookie, bcryptjs 12 rounds, role enforcement, Design System: Tailwind v4, shadcn/ui, Plus Jakarta Sans, Inter, JetBrains Mono, Non-Negotiable: Foundation Owns All Accounts, CLAUDE.md â€” GSF Project Full Specification, Non-Negotiable: Bank Interest Ring-Fenced (interest account, haram), Phase 0: Project Setup & First Deploy (COMPLETE), Phase 1: Database Schema & Auth Foundation (COMPLETE), Phase 10: Excel Migration (pending) (+13 more)

### Community 3 - "App Pages & Layouts"
Cohesion: 0.15
Nodes (10): isMember(), AppLayout(), getAllMembers(), middleware(), redirectToLogin(), ChangePasswordPage(), DashboardPage(), MembersPage() (+2 more)

### Community 7 - "User Queries"
Cohesion: 0.5
Nodes (1): getUserByEmail()

### Community 8 - "ESLint Config"
Cohesion: 0.5
Nodes (4): ESLint Configuration, ESLint Global Ignores (.next, out, build, .open-next), eslint-config-next/core-web-vitals, eslint-config-next/typescript

### Community 42 - "File SVG Icon"
Cohesion: 1.0
Nodes (1): File SVG Icon (generic file/document)

### Community 43 - "Globe SVG Icon"
Cohesion: 1.0
Nodes (1): Globe SVG Icon (world/web/external link)

### Community 44 - "Window SVG Icon"
Cohesion: 1.0
Nodes (1): Window/Browser SVG Icon

## Knowledge Gaps
- **30 isolated node(s):** `eslint-config-next/core-web-vitals`, `eslint-config-next/typescript`, `ESLint Global Ignores (.next, out, build, .open-next)`, `PostCSS Configuration`, `Next.js Agent Rules (AGENTS.md)` (+25 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `User Queries`** (4 nodes): `users.ts`, `getUserByEmail()`, `getUserById()`, `updateLastLogin()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `File SVG Icon`** (1 nodes): `File SVG Icon (generic file/document)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Globe SVG Icon`** (1 nodes): `Globe SVG Icon (world/web/external link)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Window SVG Icon`** (1 nodes): `Window/Browser SVG Icon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CLAUDE.md â€” GSF Project Full Specification` connect `Architecture & Design System` to `Project Specification & DB Design`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `GSF Trust â€” Foundation Accounts Manager` connect `Project Specification & DB Design` to `Architecture & Design System`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `POST()` connect `API Route Handlers` to `App Pages & Layouts`, `User Queries`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Are the 9 inferred relationships involving `POST()` (e.g. with `getUserFromRequest()` and `canWrite()`) actually correct?**
  _`POST()` has 9 INFERRED edges - model-reasoned connections that need verification._
- **Are the 7 inferred relationships involving `GET()` (e.g. with `middleware()` and `POST()`) actually correct?**
  _`GET()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Are the 7 inferred relationships involving `getSessionUser()` (e.g. with `AppLayout()` and `DashboardPage()`) actually correct?**
  _`getSessionUser()` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `eslint-config-next/core-web-vitals`, `eslint-config-next/typescript`, `ESLint Global Ignores (.next, out, build, .open-next)` to the rest of the system?**
  _30 weakly-connected nodes found - possible documentation gaps or missing edges._