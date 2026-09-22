# DietHaven Consult — AGENTS.md

Guidance for Codex (or any agent/developer) working in this repository. Read this before writing code. It defines what to build right now, what NOT to build yet, the stack, repo layout, and the non-negotiable engineering constraints from the source spec.

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

## 2. Current scope

**Milestone 1 is complete.** It proved the two-sided architecture end-to-end — auth, RBAC, patient–dietitian linkage, and one complete clinical data flow across web, mobile, and the shared API.

**Phases 1-3 are complete.** All four IDNT stages — Assessment, Diagnosis, Intervention, Monitoring — plus Daily Food Monitoring are built end to end across web, mobile and the shared API. What remains is **Phase 4 (the AI layer)** and **Phase 5 (polish & compliance)**, both still out of scope until asked for — see the list below, which stays authoritative.

### In scope (built)
- **Backend**: NestJS API + PostgreSQL. RBAC enforced at the API layer (Admin / Dietitian / Patient). Auth: email/password + OTP (mobile). Audit logging on every create/edit/view of in-scope entities. TLS in transit, encryption at rest for PII.
- **Web (dietitian + admin)**: dietitian registration with credential fields (license number, specialty, facility) — manually approved by admin, no automated verification. Dietitian invites a patient via email/link. Dietitian sees list of linked patients. Dietitian can view/edit their own profile and change their password (credentials stay read-only — an admin verified them at approval).
- **Nutrition Assessment — all six IDNT domains** (added after Milestone 1 closed, at the user's explicit request; guideline §4.2.1): Patient History, Anthropometric, Biochemical/Laboratory, Nutrition-Focused Physical, Dietary, and Environmental. Each domain is a separate `Assessment` row, so the forms are stage-gated — a dietitian saves progress per domain rather than completing one long form. Derived values are computed server-side and never accepted from the client: BMI from height/weight, and lab results flagged LOW/NORMAL/HIGH against the standard adult reference ranges in `packages/types/src/lab-ranges.ts`. Those ranges are **advisory defaults, not a clinical source of truth** — real ranges vary by lab, assay, sex, and age, so a flag means "look at this", never a diagnosis.
- **Nutrition Diagnosis — manual, no AI** (guideline §4.2.2): IDNT PES statements (Problem / Etiology / Signs & Symptoms) with a live full-sentence preview. A curated starter library of IDNT terms grouped by the three IDNT domains (Intake, Clinical, Behavioral-Environmental) lives in `packages/types/src/diagnosis.ts`; it is a **working subset, not the licensed IDNT reference**, and the form always accepts a free-text problem so a dietitian is never boxed in. Signs/symptoms are cited from the patient's own recorded assessment findings — each citation is stored on the diagnosis as `evidence`, so an accepted diagnosis stays traceable back to the data that justified it. Status is ACTIVE / RESOLVED / RULED_OUT (rule-out is how a diagnosis is rejected). The `aiGenerated` column exists because the guideline's entity list defines it, but the service hard-codes it to `false` and no UI may present a diagnosis as AI-generated — see §8.
- **Nutrition Intervention — manual, no AI** (guideline §4.2.3): a care plan that must map to a specific accepted diagnosis (`diagnosisId` is required, and the service checks the diagnosis belongs to both this dietitian *and* this patient). Carries an optional nutrition prescription (energy/macro/fluid targets, restrictions, supplements) and an optional `MealPlan` built from the Nigerian Food Exchange List — which is finally wired into a patient-facing feature, via a new read-only `GET /food-exchange-items` for dietitians. Writes to the list stay admin-only. Meal-plan items **copy the food's name, portion and macros onto the plan** alongside the item id, so editing or deleting a reference item later can't silently rewrite a plan a patient is already following. Prescriptions print via a `.print-target` isolation rule in `globals.css`; there is no PDF export (that's Phase 3). Status is DRAFT / ACTIVE / COMPLETED / DISCONTINUED, and `aiGenerated` is hard-coded `false` exactly as on `Diagnosis`.
- **Monitoring & Evaluation** (guideline §4.2.4): laboratory trend view per marker across every recorded panel compared against its reference range, weight/BMI trend with first-to-latest change, a printable progress report, and follow-up documentation (`FollowUp`) recording a RESOLVED / IMPROVED / UNCHANGED / WORSENED outcome against the diagnosis or intervention the visit reviewed. **Deliberate deviation from the guideline's entity list: there is no `MonitoringEntry` model.** That entity would carry weight, BMI and lab values — all of which `Assessment` already holds as a dated, domain-tagged series. A second home would fork the answer to "what is this patient's weight", so trends are derived from `Assessment` (see `packages/types/src/monitoring.ts`) and `FollowUp` stores only what is genuinely new: the visit's outcome and narrative.
- **Daily Food Monitoring** (guideline §4.2.5): a patient-facing food diary in the mobile app (Diary tab + log-meal screen) with search against the Nigerian Food Exchange List, a free-text fallback for anything not on it, and optional hunger/fullness/symptom feedback per entry. Dietitians see logging activity and adherence on the Monitoring tab. **Adherence formula** (`packages/types/src/food-log.ts`): per exchange group, credit is `min(logged, planned)` so overeating one group can't offset missing another; the score is total credit over total planned exchanges. A day with nothing countable scores `null`, never 0 — "no data" and "followed none of the plan" must not look alike. It is a defensible working definition, **not a validated clinical measure**: it counts exchange quantities only and knows nothing about timing, food quality, or whether the patient simply logged badly. Two known limits, both surfaced in the UI: superseded meal plans are deleted by `setMealPlan`, so past days are scored against the *current* plan; and `photoUrl` exists on `FoodLog` but nothing writes to it, because no storage provider is chosen (§9).
- **Admin console** (deliberately built beyond the original minimal Milestone-1 cut, at the user's explicit request — see §6 note): dietitian account management (list/approve/reject/suspend, with a detail view and linked-patient count), Nigerian Food Exchange List CRUD (reference data — see §6), an audit log viewer, and a platform stats overview. Per the guideline's own Role Permission Matrix, Admin has exactly one capability across every phase of the product — "manage platform settings & dietitian accounts" — so this is the *full* admin scope, not a slice of it. Admin never gets visibility into patient clinical data (assessments, diagnosis, intervention, food logs) at any milestone; that stays dietitian/patient-only per the source spec.
- **Mobile (patient)**: self-registration + accept-invite flow, OTP login, profile view/edit, view linked dietitian, **read-only** view of their own anthropometric data/trend (as entered by their dietitian), and their own food diary (the one clinical record a patient writes — per the guideline's Role Permission Matrix, "log daily food intake" is patient-only).
- **Brand/UI**: DietHaven palette applied consistently (see §7). WCAG AA contrast, especially orange-on-light.
- **Compliance baseline**: informed consent captured at registration (NDPA 2023). RBAC + audit logging as the foundation for a full compliance review later — this milestone is **not** a compliant production launch.

### Explicitly out of scope — do not build unless asked
If a task seems to require any of these, stop and confirm with the user first — it's a scope-creep signal:
- PDF export of progress reports. The report prints via the same `.print-target` rule as prescriptions; no PDF library is wired up.
- Photo upload for food diary entries. The `FoodLog.photoUrl` column exists, but no blob/object storage provider is chosen, so nothing writes to it.
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
└── AGENTS.md
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

The `Assessment` model is domain-flexible by design (JSON `domainData` field). That paid off: adding the other five domains needed no migration at all — the `AssessmentDomain` enum already listed them and only the payload schemas were new.

| Model | Key fields |
|---|---|
| `User` | id, role (`ADMIN` \| `DIETITIAN` \| `PATIENT`), name, email, phone, passwordHash, status, createdAt |
| `DietitianProfile` | userId, licenseNumber, specialty, facility, approvalStatus |
| `PatientProfile` | userId, dietitianId, dateOfBirth, sex, contact, consentStatus |
| `Assessment` | id, patientId, dietitianId, date, domain (enum — all six domains now in use), domainData (JSON, shape per domain; for `ANTHROPOMETRIC` it is height/weight/bmi, and "weight history" is the ordered list of a patient's rows, not a field duplicated in the JSON). Zod schemas per domain live in `packages/types/src/assessments.ts` as a discriminated union on `domain`. |
| `Diagnosis` | id, patientId, dietitianId, assessmentId (nullable), domain (`INTAKE` \| `CLINICAL` \| `BEHAVIORAL_ENVIRONMENTAL`), problemCode (nullable — set when the problem came from the curated library), problem, etiology, signsSymptoms, evidence (JSON array of `{assessmentId, domain, field, label, value}`), status (`ACTIVE` \| `RESOLVED` \| `RULED_OUT`), aiGenerated (always `false` today) |
| `MealPlan` | id, patientId, dietitianId, name, meals (JSON: `[{mealType, time, items: [{foodExchangeItemId, foodName, exchangeGroup, portionSize, exchanges, macros}]}]` — food details copied in deliberately, see §2), calorieTarget, carbsTargetG, proteinTargetG, fatTargetG |
| `Intervention` | id, patientId, dietitianId, diagnosisId (**required**), carePlanDetails, mealPlanId (nullable, unique), prescription (JSON: `{energyKcal, carbsG, proteinG, fatG, fluidMl, restrictions, supplements, notes}`), status (`DRAFT` \| `ACTIVE` \| `COMPLETED` \| `DISCONTINUED`), aiGenerated (always `false` today) |
| `FollowUp` | id, patientId, dietitianId, date, diagnosisId (nullable), interventionId (nullable — at least one of the two is required), outcome (`RESOLVED` \| `IMPROVED` \| `UNCHANGED` \| `WORSENED`), notes. Only `outcome` and `notes` are editable after creation, so a visit note can't be re-pointed at a different diagnosis later |
| `FoodLog` | id, patientId, date, mealType (reuses `MealType`), items (JSON: `[{foodExchangeItemId?, foodName, exchangeGroup?, portionSize?, exchanges?}]` — ids optional so off-list foods can still be logged), description, photoUrl (unused, see §2), hungerBefore, fullnessAfter, symptoms. **No stored adherence flag** — adherence is a per-day aggregate against the meal plan, not a property of one entry, so it is computed on read |
| `AuditLog` | id, userId, action, entityType, entityId, timestamp |
| `Invite` | id, token, email, dietitianId, status (PENDING/ACCEPTED/EXPIRED), expiresAt, acceptedAt — backs the dietitian-invites-a-patient flow; not in the original guideline's entity list but required for the feature to function |
| `FoodExchangeItem` | id, foodName, exchangeGroup (enum), portionSize, calories, carbsG, proteinG, fatG — admin-managed reference data for the Nigerian Food Exchange List (§4.2.3 of the guideline). Admins own every write; dietitians read it through `GET /food-exchange-items` to build meal plans |

Every entity in the guideline's §7 list now exists except `MonitoringEntry`, which is not planned at all — see the Monitoring & Evaluation note in §2 for why.

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
- **Encrypt in transit and at rest.** TLS everywhere (deployment config). At-rest encryption of PII (DOB, contact, health data) is satisfied by deploying on a **managed Postgres host with encryption-at-rest enabled by default** (RDS, Supabase, Neon, Railway, Render, Cloud SQL all qualify) — decided 2026-08-28, no column-level/`pgcrypto` encryption planned for this milestone. This is a deployment-config requirement, not application code: before any real patient data is stored, whoever provisions the database **must confirm the chosen host actually has encryption-at-rest on** (most enable it by default, but confirm — don't assume). **Self-hosting Postgres (a bare VM, Docker without a managed disk layer) does not satisfy this constraint** unless disk/volume encryption is separately configured — treat that as blocking for real patient data, not just a nice-to-have.
- **Audit every access.** Every create, edit, and view of `PatientProfile` or `Assessment` writes an `AuditLog` row: who, what, when.
- **Consent before data collection.** A patient cannot complete registration without consent capture (NDPA 2023).
- **Label nothing as AI.** There are no AI features in this milestone — don't add "AI Suggested" badges or similar UI for anything that isn't actually AI-generated.

---

## 9. Open items (need a decision before or during this milestone)

- Confirm exact brand hex codes against DietHaven's brand sheet.
- Hosting provider not chosen yet — when it is, confirm it has encryption-at-rest enabled before storing real patient data (see §8; this is the only remaining step to close out that constraint).
- Nigerian Food Exchange List dataset source — not needed for Milestone 1, but worth sourcing now so Milestone 2 (Intervention) isn't blocked.
- AI provider/model choice — not needed until the AI milestone, but data-handling implications (sending patient data to a third-party API) need an early conversation.
- Subscription/billing model — affects `User`/account tiers, ideally decided before Milestone 2.