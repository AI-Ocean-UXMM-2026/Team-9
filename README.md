# FinTech Companion

A frontend prototype for everyday financial records in Myanmar. M7 adds record-completeness checks, a user-controlled supporting-document checklist and optional keyword category suggestions. This describes record completeness only, not creditworthiness or loan approval. M8 completes browser acceptance coverage, security policy checks and a synthetic-data demo guide. Earlier milestones provide period reports, evidence-based insights, duplicate review, grounded chat, local receipt/screenshot review, manual records, and one-time/monthly schedules. Images stay in the browser tab and are discarded after review; no OCR service is used. Future schedule items remain forecast-only, and unpaid items stay unpaid across reloads. Records stay in validated, versioned browser storage. Never enter real financial information.

## Run locally

Requires Node 24 LTS and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. For production: `npm run build`, then `npm run preview`. Build output is `dist/`; deploy to a static host. Hash URLs work without server rewrite rules. No environment variables or secrets are needed.

## Verify

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run verify:csp
npx playwright install chromium
npm run test:e2e
```

CI runs these checks, audits high-severity dependency advisories and runs a separate Chromium navigation/responsiveness job. Tests cover the shell, direct links, unknown routes, mobile menu, banner, overflow at 360/768/1280 px, opening balance and manual transaction entry, one-time/monthly schedule lifecycles, receipt review, readiness, malformed-storage recovery and safe rendering of user text. The CSP check verifies the production HTML policy is stricter than the development policy.

The reviewer-ready acceptance cases for completed milestones are in [TEST_CASES.md](docs/TEST_CASES.md), including manual setup/steps, expected outcomes, automated coverage and current gaps. A short synthetic-data walkthrough is in [DEMO_GUIDE.md](docs/DEMO_GUIDE.md).

## Structure and scope

`src/app` composes routing and layout; `src/components` shared UI; `src/features` financial screens and remaining placeholders; `src/store` validated Zustand persistence; `src/domain` Zod data contracts and pure balance and schedule lifecycle logic; `src/services` injected clock; `src/i18n` English and Burmese skeleton; `e2e` browser checks. React 18, TypeScript, Vite, Tailwind, React Router, lucide-react, react-i18next, Zustand and Zod power the prototype.

The navigation covers dashboard, transactions, upload/review, owed payments, schedules, forecast/insights, assistant, readiness and settings. The dashboard and settings support the opening balance; transactions supports manual records, optional category suggestions and linked correction workflows; upload/review validates local image files, offers optional category suggestions and saves only user-confirmed fields; schedules supports one-time and monthly payments and the shared occurrence lifecycle; owed payments separates receivables and payables; forecast/insights shows projections, rule-based signals and duplicate review; the assistant answers a bounded set of questions from records; readiness shows record checks and a user-maintained document checklist without uploading documents or assessing creditworthiness. Mobile uses an expandable menu. No seeded financial figures or live connections appear.

## Product behavior and next work

[Decisions](docs/DECISIONS.md) define a dated initial balance, automatic carry-forward, distinct net movement/recorded balance, one-time and monthly schedules, unconfirmed due-payment assumptions, same-occurrence corrections, single counting and user-controlled duplicate resolution. [Requirements](docs/FinTech_PRD_SRS.md) capture acceptance and the staged roadmap; [implementation guide](codex-master-prompt.md) keeps future work aligned. [Security](docs/SECURITY.md) describes boundaries. The [original diagram](docs/use-case-diagram-v3.png) is unchanged and has documented mismatches.

M1 delivered validated contracts, occurrence and duplicate-review records, the opening-reference selector, injected clock and recovery-safe persistence. M2 delivers opening-balance setup and manual transactions. M3a delivered one-time schedules; M3b adds monthly occurrences, month-end clamping and catch-up with a rolling one-year occurrence window. M4 adds simulated local receipt review. M5 completes dashboard, outstanding views and the 14-day forecast. M6 adds rule-based insights, version-aware duplicate review and grounded chat. M7 delivers record checks, a user-maintained document checklist and optional keyword category suggestions. M8 completes browser coverage for recovery, readiness, schedule cancellation and safe text rendering; the development-only CSP exception is excluded from production builds, and the demo walkthrough is documented. No license has been selected by the owner.
