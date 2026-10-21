# FinTech Companion — implementation guide

The user's explicit instructions take precedence. The latest agreed business contract is [docs/DECISIONS.md](docs/DECISIONS.md); the reconciled requirements and milestone order are [docs/FinTech_PRD_SRS.md](docs/FinTech_PRD_SRS.md). Read both before changes. The original supplied drafts are superseded by these reconciled documents.

M0, M1, M2, M3a and M3b are complete. M3a adds one-time schedules. M3b adds monthly occurrence generation with original-day month-end clamping, app-load catch-up, a rolling one-year forecast window, and cancellation of future occurrences. Both use stable occurrence IDs, unconfirmed assumed payments, and same-occurrence confirmation, correction and unpaid handling. Next is M4 simulated upload and review. Continue to follow the milestone order in the requirements.

Use React 18, strict TypeScript, Vite, React Router, Tailwind, lucide-react and react-i18next. Add planned Zustand/persist, React Hook Form, Zod, Recharts, date-fns and shadcn/Radix when used. Vitest/RTL and Playwright validate implemented behavior. Node 24 LTS and npm lockfile; ESLint, Prettier, typecheck, tests and build in CI.

Keep UI in features/components, composition in app, state in store, pure logic in domain, and injected ports/adapters in services. Do not aggregate financial values in components. Use an injected clock and deterministic tests for all date-dependent rules. No secrets, backend, live integrations, real AI or real OCR. All visible copy belongs in locale resources. All synthetic/simulated behavior must be labelled.

Later acceptance must cover dated opening balance and opening-day inclusion, automatic carry-forward, one-time/monthly occurrences, app-load catch-up, stable identities, unconfirmed assumptions, linked corrections, explicit unpaid preservation, single counting in totals/forecasts, duplicate Keep both persistence, and dynamic seed regression. Payment confirmation and OCR review are independent. Do not treat assumptions as verified evidence. Do not add weekly scheduling or other unrequested features.

Keep changes focused and dependencies used. Run applicable format, lint, typecheck, tests and production build each milestone; document gaps candidly. Do not claim the supplied diagram is updated; see its mismatch record. Do not start the next milestone without user review.
