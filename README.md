# Shwe Taw Pyan Chi

A local financial records app for everyday bookkeeping in Myanmar. It provides income and expense records, one-time and monthly schedules, payment confirmation, budgets, forecasts and bank-specific Credit Readiness checklists. Receipt text recognition runs on the device in English and Burmese using Tesseract.js; every extracted record requires user review. Ask AI remains a demo interface using local record rules; there is no external AI API connection. Registration and sign-in use a Node backend and SQLite database with hashed passwords and cookie sessions. Financial records are saved per account, with a separate browser cache for each user.

## Hackathon submission

- [Demo video (MP4)](Video_and_Slide/video.mp4)
- [Pitching video (MP4)](Pitching_Video/Deck.mp4)
- [Presentation slides (PDF)](Video_and_Slide/Deck.pdf)

## Credit readiness

Choose **A Bank**, **Yoma Bank** or **MCB Bank** under More → Credit readiness. Each bank has six document preparation groups with independent saved status. Financial coverage updates from saved settled records; pending, future and assumed unconfirmed payments are excluded. Each group contributes equally to preparation progress. Document availability is self-reported, while supporting financial summaries use month coverage (12 months for A Bank/Yoma, 36 for MCB). Coverage indicates months containing records, not proof that accounts are complete.

**Export Loan Application Kit** downloads a one-page A4 PDF with the latest 12 months of recorded cash flow, the selected checklist, source counts and coverage. Applicant/business names are optional. Exports are generated locally; no provider API key is required. The PDF is a user-prepared supporting summary, without audit, bank verification, certification, guaranteed acceptance or a creditworthiness assessment. Keep original documents and confirm requirements with the branch. A Bank uses the owner's approved team draft; Yoma and MCB include links to published reference requirements.

## Run locally

Requires Node 24 LTS and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. `npm run dev` starts the account backend on port 3001 and the Vite frontend together. For the built app: `npm run build`, then `npm start` and open http://127.0.0.1:3001. Real accounts require the Node backend; static hosting alone cannot provide login or record sync. No provider API keys are needed. `predev` and `prebuild` copy the locked OCR engine and language packages into `public/ocr/`, so production scans use assets from the app origin without a CDN. The first scan loads the selected recognition data. Keep `dist/ocr/` with the deployed build.

## Accounts and database

### Vercel production deployment

The hosted app runs its frontend and `/api/*` endpoints together on Vercel. Production account data is stored in Neon Postgres (Singapore region), connected through Vercel Marketplace. `api/index.ts` exports the shared API handler; `vercel.json` routes API requests to this function. `server/database.ts` uses `DATABASE_URL` (or `POSTGRES_URL`) for Neon and keeps SQLite for local development when neither is configured. Existing local SQLite account data is not automatically uploaded to Neon.

Connect Neon to the Vercel project, set `APP_ORIGIN` to the exact public app origin (comma-separated for additional approved domains), then deploy with `npx vercel --prod`. The API initializes its tables automatically. `/api/health` reports database connectivity. Session cookies remain HttpOnly, SameSite=Strict and Secure in production; account data, session hashes and request limits persist in Postgres across function instances. Database credentials stay in Vercel environment variables; `.env*`, `.vercel/` and local SQLite files are excluded from Git and deployment uploads. Never use a `VITE_` variable for database credentials.

The Neon database is provisioned on its Free plan; its provider limits apply. A production database is configured for production and development, while preview deployments need a separate database connection and explicitly approved origin before account flows are available. Vercel's function request-size limit also applies to API uploads.

The header includes an **English / မြန်မာ** language selector for guest demos and account workspaces, also available on the public landing and sign-in pages. The choice persists in this browser. Burmese covers the main screens, categories, forms, controls and demo guide, with English fallback for remaining specialist copy. Brand and bank names, user-entered descriptions, dates and MMK amounts retain their original form. Exported bank preparation PDFs remain in English.

The landing page is public. Get started gathers the example transaction cards into the brand before revealing registration; Sign in opens the existing-account form. Account workspaces require a server session. Passwords use salted scrypt hashes; session tokens are random, stored as hashes on the server and sent in HttpOnly, SameSite=Strict cookies. Sign-out invalidates the session. Settings includes password-confirmed account deletion.

**Try Demo** opens a separate guest workspace without registration. It contains sample income, expenses, budgets, outstanding payments and monthly schedules from January 2025 onward, with the demo clock fixed to 23 October 2026. Its initial recorded balance is 16,200,000 MMK; receivables are 480,000 MMK and payables are 335,000 MMK. Demo changes stay in a separate browser storage key and are never saved to an account. Reset demo restores the sample workspace; Exit demo returns to the account flow. A skippable, user-paced guide explains the main pages and quick actions using rounded spotlights and short captions. Guide restarts the walkthrough. The interface uses lavender accents and shared custom date, month and date/time pickers.

SQLite stores users, sessions and each account’s financial workspace at `.data/fintech.sqlite` (ignored by Git). Keep this directory on persistent storage and back it up. Server records are separated by authenticated user ID. Existing pre-account browser records are preserved and offered for explicit import into an empty account. Pending local sync is retried on sign-in; the interface shows saving/failure status.

For deployment, serve the built frontend and API from the same origin, use HTTPS, set `NODE_ENV=production` and `APP_ORIGIN` to the exact public origin, and configure `API_HOST` / `API_PORT` for your host. The default API binds only to localhost. `DATA_DIR` can choose a persistent database directory. Email verification, password reset email, MFA and a production security review remain future deployment work.

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

The navigation covers dashboard, transactions, upload/review, owed payments, schedules, forecast/insights, credit readiness and settings. The dashboard and settings support the opening balance; transactions supports manual records, optional category suggestions and linked correction workflows; upload/review validates local image files, offers optional category suggestions and saves only user-confirmed fields; schedules supports one-time and monthly payments and the shared occurrence lifecycle; owed payments separates receivables and payables; forecast/insights shows projections, rule-based signals and duplicate review; credit readiness shows bank-specific document preparation, financial record coverage and a local PDF export. Mobile uses an expandable menu. New account workspaces start empty; sample financial figures appear only in Try Demo. There are no live bank connections.

## Product behavior and next work

[Decisions](docs/DECISIONS.md) define a dated initial balance, automatic carry-forward, distinct net movement/recorded balance, one-time and monthly schedules, unconfirmed due-payment assumptions, same-occurrence corrections, single counting and user-controlled duplicate resolution. [Requirements](docs/FinTech_PRD_SRS.md) capture acceptance and the staged roadmap; [implementation guide](codex-master-prompt.md) keeps future work aligned. [Security](docs/SECURITY.md) describes boundaries. The [original diagram](docs/use-case-diagram-v3.png) is unchanged and has documented mismatches.

M1 delivered validated contracts, occurrence and duplicate-review records, the opening-reference selector, injected clock and recovery-safe persistence. M2 delivers opening-balance setup and manual transactions. M3a delivered one-time schedules; M3b adds monthly occurrences, month-end clamping and catch-up with a rolling one-year occurrence window. M4 adds simulated local receipt review. M5 completes dashboard, outstanding views and the 14-day forecast. M6 adds rule-based insights, version-aware duplicate review and grounded chat. M7 delivers record checks, a user-maintained document checklist and optional keyword category suggestions. M8 completes browser coverage for recovery, readiness, schedule cancellation and safe text rendering; the development-only CSP exception is excluded from production builds, and the demo walkthrough is documented. No license has been selected by the owner.
