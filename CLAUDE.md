# DietHaven Consult — CLAUDE.md

Guidance for Claude (or any agent/developer) working in this repository. Read this before writing code. It defines what to build right now, what NOT to build yet, the stack, repo layout, and the non-negotiable engineering constraints from the source spec.

Reference docs (keep in `/docs`):
- `DietHaven App guideline.docx.pdf` — original Module 1 development guide from the client.
- `DietHaven_Consult_PRD_Milestone1.docx` — scoped PRD for this milestone (2–3 week, quarter-budget, solo-developer build).

This file should be updated whenever scope, stack, or conventions change — it is the single source of truth for the agent, not the PRD (which is a client-facing document and stays static per milestone).

---

## 1. What this project is

DietHaven Consult is a two-sided clinical nutrition platform connecting registered dietitians with their patients, digitizing the Nutrition Care Process (NCP) using the IDNT framework, with Nigerian-specific tools (Food Exchange List) and AI-assisted clinical support layered in later. Tagline: "Your Food, Your Medicine."

Two user-facing apps, one shared backend:
- **Dietitian + Admin app** — web, desktop-first (data-entry heavy: assessments, care planning).
- **Patient app** — mobile (daily food logging, weight check-ins, viewing care plans).
- **Shared API + database** — single source of truth, real-time-consistent between both apps.

---

## 2. Current milestone: Milestone 1 (build this now)

Solo-developer build, **2–3 weeks**. Goal: prove the two-sided architecture end-to-end — auth, RBAC, patient–dietitian linkage, and **one** complete clinical data flow — not a partial slice of every feature.

### In scope
- **Backend**: NestJS API + PostgreSQL. RBAC enforced at the API layer (Admin / Dietitian / Patient). Auth: email/password + OTP (mobile). Audit logging on every create/edit/view of in-scope entities. TLS in transit, encryption at rest for PII.
- **Web (dietitian + admin)**: dietitian registration with credential fields (license number, specialty, facility) — manually approved by admin, no automated verification. Minimal admin console: list/approve/reject/suspend dietitian accounts. Dietitian invites a patient via email/link. Dietitian sees list of linked patients. **One** assessment domain only — Anthropometric: height, weight, auto-calculated BMI, weight history.
- **Mobile (patient)**: self-registration + accept-invite flow, OTP login, profile view/edit, view linked dietitian, **read-only** view of their own anthropometric data/trend (as entered by their dietitian).
- **Brand/UI**: DietHaven palette applied consistently (see §7). WCAG AA contrast, especially orange-on-light.
- **Compliance baseline**: informed consent captured at registration (NDPA 2023). RBAC + audit logging as the foundation for a full compliance review later — this milestone is **not** a compliant production launch.

### Explicitly out of scope — do not build unless asked
If a task seems to require any of these, stop and confirm with the user first — it's a scope-creep signal:
- The other five assessment domains (Biochemical, Clinical/Physical, Dietary, Environmental, Patient History).
- Nutrition Diagnosis (PES statements, diagnosis library), manual or AI.
- Nutrition Intervention (care plan builder, meal planning, Nigerian Food Exchange List, prescriptions).
- Monitoring & Evaluation (lab trend tracking, progress reports, follow-up docs).
- Daily Food Monitoring (patient food diary, adherence tracking).
- **Any AI features** (diagnosis suggestions, intervention recommendations, AI meal planning, clinical decision-support alerts).
- SMS invites, biometric login, full platform-config console, billing/subscriptions.

### Build order (solo dev — sequence, don't parallelize)
1. DB schema + Prisma models → auth (email/password + OTP) → RBAC guards.
2. Web thin slice: admin approval flow → dietitian invite/link patient → anthropometric assessment form.
3. Mobile thin slice: registration/accept-invite → OTP login → profile → read-only assessment trend view (reuses the same NestJS API — no new backend work).
4. Audit logging, encryption verification, consent capture, brand/UI pass — layered in alongside 2–3, not bolted on at the end.
5. Buffer: QA, bug fixing, UAT.

---

## 3. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Monorepo | Turborepo + Yarn (classic v1) workspaces | Workspaces declared in root `package.json`; pinned via `devEngines.packageManager` (yarn 1.22.22). |
| Web | Next.js (App Router), TypeScript | Dietitian + Admin dashboard. |
| Mobile | React Native + Expo, TypeScript | Patient app. |
| Backend | NestJS, TypeScript | Single API serving both apps. REST controllers (not tRPC — chosen for conventional structure over a solo-dev speed tradeoff). |
| Database | PostgreSQL | |
| ORM | Prisma | Schema lives in `packages/database`, shared by the API. |
| Auth | JWT sessions; email/password + OTP (mobile) | NestJS Guards for RBAC — enforced server-side, never trust a client-supplied role. |
| Validation | `zod` (or `class-validator` for NestJS DTOs) | Shared shapes go in `packages/types` so web/mobile/api don't drift. |
| Styling | Tailwind (web); NativeWind or StyleSheet (mobile) | Both consume `packages/ui-tokens` for brand colors. |

---

## 4. Repo structure

```
diethaven-consult/
├── apps/
│   ├── web/            # Next.js — dietitian + admin dashboard
│   ├── mobile/         # Expo React Native — patient app
│   └── api/            # NestJS — shared backend (REST)
├── packages/
│   ├── database/       # Prisma schema, migrations, generated client
│   ├── types/          # Shared TS types, zod schemas, DTO shapes
│   ├── config/         # Shared eslint/tsconfig/prettier config
│   └── ui-tokens/      # Brand colors/typography constants (see §7)
├── docs/
│   ├── DietHaven App guideline.docx.pdf
│   └── DietHaven_Consult_PRD_Milestone1.docx
├── turbo.json
├── package.json          # workspaces: ["apps/*", "packages/*"]
├── .env.example
└── CLAUDE.md
```

---

## 5. Commands

```bash
yarn install                       # install everything

yarn dev                           # turbo run dev (all apps, if resources allow)
yarn workspace api dev             # NestJS only
yarn workspace web dev             # Next.js only
yarn workspace mobile dev          # expo start

yarn workspace database db:migrate  # prisma migrate dev
yarn workspace database db:studio   # prisma studio
yarn workspace database db:generate # prisma generate

yarn lint
yarn check-types
yarn build
yarn workspace api test          # no root "test" task in turbo.json yet — per-workspace for now
```

Given the solo, sequenced build order in §2, you will usually run **one** app at a time (`yarn workspace api dev`, then later `yarn workspace web dev`, etc.) rather than `yarn dev` for all three at once.

---

## 6. Data model (Milestone 1 — Prisma)

Build the `Assessment` model domain-flexible now (JSON `domainData` field) even though only `anthropometric` is populated in this milestone — this avoids a schema rebuild when the other five domains are added in Milestone 2.

| Model | Key fields |
|---|---|
| `User` | id, role (`ADMIN` \| `DIETITIAN` \| `PATIENT`), name, email, phone, passwordHash, status, createdAt |
| `DietitianProfile` | userId, licenseNumber, specialty, facility, approvalStatus |
| `PatientProfile` | userId, dietitianId, dateOfBirth, sex, contact, consentStatus |
| `Assessment` | id, patientId, dietitianId, date, domain (enum, only `ANTHROPOMETRIC` used now), domainData (JSON: height, weight, bmi, weightHistory[]) |
| `AuditLog` | id, userId, action, entityType, entityId, timestamp |

Do not add Diagnosis, Intervention, MealPlan, FoodExchangeItem, MonitoringEntry, or FoodLog models yet — they belong to later milestones (see the full guide in `/docs` for their eventual shape).

---

## 7. Brand

| Role | Hex | Usage |
|---|---|---|
| Primary — Green | `#2E6B3E` | Nav bars, primary buttons, headers, active states. Should dominate. |
| Secondary — Orange | `#E07A1F` | CTAs, alerts, active tab indicators. Used sparingly as an accent. |
| Neutral backgrounds | `#F5F5F0` / `#E6F0E8` | Card backgrounds, table stripes, section backgrounds. |
| Text | `#222222` (body) / `#1F4A2C` (headings) | |

These hex values are approximations pending confirmation against DietHaven's brand sheet (open item). Store them once in `packages/ui-tokens` and import everywhere — don't hardcode hex values in component files.

---

## 8. Non-negotiable engineering constraints

These apply to every PR from day one, not deferred to a later "polish" pass:

- **RBAC enforced server-side.** Every NestJS endpoint checks the authenticated user's role via a Guard. Never rely on the frontend hiding a button — a patient account must never be able to fetch another patient's data, verify this with a test, not just a UI check.
- **Encrypt in transit and at rest.** TLS everywhere (deployment config). PII fields (DOB, contact, health data) encrypted at rest — confirm the specific approach (column-level encryption vs. full-disk/managed Postgres encryption) before storing real patient data.
- **Audit every access.** Every create, edit, and view of `PatientProfile` or `Assessment` writes an `AuditLog` row: who, what, when.
- **Consent before data collection.** A patient cannot complete registration without consent capture (NDPA 2023).
- **Label nothing as AI.** There are no AI features in this milestone — don't add "AI Suggested" badges or similar UI for anything that isn't actually AI-generated.

---

## 9. Open items (need a decision before or during this milestone)

- Confirm exact brand hex codes against DietHaven's brand sheet.
- Confirm approach for at-rest encryption of PII columns (Prisma middleware + `pgcrypto`, vs. relying on managed Postgres encryption).
- Nigerian Food Exchange List dataset source — not needed for Milestone 1, but worth sourcing now so Milestone 2 (Intervention) isn't blocked.
- AI provider/model choice — not needed until the AI milestone, but data-handling implications (sending patient data to a third-party API) need an early conversation.
- Subscription/billing model — affects `User`/account tiers, ideally decided before Milestone 2.