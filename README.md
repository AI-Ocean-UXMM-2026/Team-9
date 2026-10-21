# FinTech Companion

A frontend prototype for everyday financial records in Myanmar. **M2 manual-record milestone:** opening-balance setup, manual income and expense entry, categories, pending due dates, search, filters, corrections in place, and delete with undo are implemented. The dashboard separates recorded available balance from net cash movement. Records stay in validated, versioned browser storage. Future records are synthetic, OCR simulated, and insights/chat rule-based. Never enter real financial information.

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
npx playwright install chromium
npm run test:e2e
```

CI runs these checks and a separate Chromium navigation/responsiveness job. Tests cover the shell, direct links, unknown routes, mobile menu, banner and overflow at 360/768/1280 px. Full financial workflows are not implemented or tested yet.

## Structure and scope

`src/app` composes routing and layout; `src/components` shared UI; `src/features` financial screens and remaining placeholders; `src/store` validated Zustand persistence; `src/domain` Zod data contracts and pure opening-balance logic; `src/services` injected clock; `src/i18n` English and Burmese skeleton; `e2e` browser checks. React 18, TypeScript, Vite, Tailwind, React Router, lucide-react, react-i18next, Zustand and Zod power the prototype.

The navigation covers dashboard, transactions, upload/review, owed payments, schedules, forecast/insights, assistant, readiness and settings. The dashboard and settings support the opening balance; transactions supports manual records and linked correction workflows. Other screens remain placeholders. Mobile uses an expandable menu. No seeded financial figures or live connections appear.

## Product behavior and next work

[Decisions](docs/DECISIONS.md) define a dated initial balance, automatic carry-forward, distinct net movement/recorded balance, one-time and monthly schedules, unconfirmed due-payment assumptions, same-occurrence corrections, single counting and user-controlled duplicate resolution. [Requirements](docs/FinTech_PRD_SRS.md) capture acceptance and the staged roadmap; [implementation guide](codex-master-prompt.md) keeps future work aligned. [Security](docs/SECURITY.md) describes boundaries. The [original diagram](docs/use-case-diagram-v3.png) is unchanged and has documented mismatches.

M1 delivered validated contracts, occurrence and duplicate-review records, the opening-reference selector, injected clock and recovery-safe persistence. M2 delivers opening-balance setup, manual transactions, same-ID corrections, payment status and due dates, opening-day classification, filtering, and delete/undo. Next is **M3a: one-time and monthly schedules with the shared payment occurrence lifecycle**, followed by receipt review, forecast and other analysis flows as staged in the requirements. No license has been selected by the owner.
