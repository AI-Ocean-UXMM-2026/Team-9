# FinTech Companion

A frontend prototype for everyday financial records in Myanmar. **M0 foundation only:** navigation and labelled placeholders are implemented; no financial data or feature engines are active. All future records are synthetic, OCR simulated, and insights/chat rule-based. Never enter real financial information.

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

`src/app` composes routing and layout; `src/components` shared UI; `src/features` placeholders; `src/store` future state; `src/domain` future pure financial logic; `src/services` injected service interfaces; `src/i18n` English and Burmese skeleton; `e2e` browser checks. React 18, TypeScript, Vite, Tailwind, React Router, lucide-react and react-i18next power M0. Planned form, storage, chart and Radix dependencies are deferred until used.

The navigation covers dashboard, transactions, upload/review, owed payments, schedules, forecast/insights, assistant, readiness and settings. Mobile uses an expandable menu. No fake balances, working upload/chat controls or live connections appear.

## Product behavior and next work

[Decisions](docs/DECISIONS.md) define a dated initial balance, automatic carry-forward, distinct net movement/recorded balance, one-time and monthly schedules, unconfirmed due-payment assumptions, same-occurrence corrections, single counting and user-controlled duplicate resolution. [Requirements](docs/FinTech_PRD_SRS.md) capture acceptance and the staged roadmap; [implementation guide](codex-master-prompt.md) keeps future work aligned. [Security](docs/SECURITY.md) describes boundaries. The [original diagram](docs/use-case-diagram-v3.png) is unchanged and has documented mismatches.

Next proposed milestone is **M1: data contracts, opening-reference rules, clock and validated persistence**, with focused invariant tests. M1 requires review before starting. No license has been selected by the owner.
