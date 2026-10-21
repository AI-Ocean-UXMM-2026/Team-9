# Decisions and reconciliation

Updated 21 October 2026. The user's latest pasted request is authoritative; supplied documents are reference material. M0 and M1 are complete; M2 requires review before work begins.

## Agreed product decisions

1. First use collects an opening balance and reference date/time. Carry forward automatically; do not ask for daily balances. Net cash movement means recorded income minus recorded expenses in a period. Recorded available balance means opening balance plus applicable movements after its reference point, not a verified bank balance.
2. One-time and monthly recurring schedules are required product scope. Both create payment occurrences through the same lifecycle. Recurrence is delivered incrementally before the forecast milestone, not postponed as an optional P1 extra.
3. Before due, an occurrence is Scheduled: forecast only, excluded from cash totals. When due, record an assumed payment on its original due date and show **Auto-recorded · Unconfirmed**. It counts in cash totals; affected balances must disclose unconfirmed assumptions. It is not proof of payment.
4. Process due occurrences on app load; browser-only processing does not run while closed. Catch-up preserves scheduled dates. Stable occurrence IDs and idempotent generation prevent duplicates.
5. Confirm, correct amount/payment date/status, or mark unpaid using the existing transaction ID. Preserve due date and lightweight history. Changing 5 November rent to paid on 8 November moves the same expense to 8 November. Unpaid removes cash movement and restores the obligation/forecast. Recalculate affected periods, later balances, forecasts and insights.
6. Count an occurrence once. A rule is a template, an occurrence an obligation, its linked payment the sole cash movement. Assumed/confirmed payments must not also appear as future scheduled flows.
7. Flag possible duplicates without merging or deleting. The user chooses which redundant record to remove or Keep both. Persist review outcomes against record versions/fingerprints so unchanged legitimate pairs do not repeatedly warn; changed pairs can be reviewed again. Linked corrections bypass duplicate creation.
8. Manual category selection works independently. Forecasts work from recorded obligations; recurring rules add occurrences by the same mechanism. Credit readiness measures record completeness, never creditworthiness or approval. MMK 180,000 is a calculated seed regression case, never a fixed dashboard value.
9. Frontend and synthetic data only. Simulated OCR requires review; insights/chat are rule-based and labelled. No real OCR, AI, financial integrations or backend in this delivery.

## Implementation assumptions (not new product decisions)

- Store the opening reference as an instant plus Asia/Rangoon business timezone. With date-only payments before the reference day, exclude them from available-balance accumulation; after the day, include them. On the opening day explicitly distinguish already-in-opening from after-reference movements. A date alone cannot establish ordering: require that choice rather than guessing. Timestamped payments count strictly after the reference instant; equality is included in opening. Period cash reporting can still show historical payments without adding them twice to available balance. M1 must encode/test this contract before financial UI.
- M1 persistence contract: one versioned Zustand record validates opening balance, transactions, rules, occurrences, duplicate outcomes and checklist with Zod. A monthly occurrence ID is the rule ID plus its original due date; each recorded occurrence links to exactly one matching recurring transaction. Invalid, corrupt, oversized or unknown-version data resets to empty demo state and exposes a dismissible notice. A schema version change resets synthetic state until a tested migration is added.
- Monthly dates absent in a month clamp to its final day, retaining the rule's original day for the next month. Calendar dates use the business timezone. Test this when scheduling is implemented.
- M0 uses hash routing for static hosting, a desktop sidebar and mobile expandable navigation. No fake financial cards, data, storage, forms or engines.
- Node 24 LTS baseline (local runtime 24.20.0); React 18, TypeScript, Vite, React Router, Tailwind, lucide-react, react-i18next, ESLint, Prettier, Vitest/RTL and Playwright. Install Zustand, Zod, React Hook Form, Recharts, date-fns and shadcn/Radix components only when actually used.

## Reference conflicts resolved

| Older wording                                                    | Resolution                                                                                                          |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Wait for first reply/milestone permission                        | Explicit authorization to implement M0 now; review before M1                                                        |
| Net balance / all-time paid totals plus optional opening balance | Separate net movement and dated recorded available balance; reference rules above                                   |
| Paid/pending only, auto-log as paid                              | Scheduled, assumed unconfirmed, confirmed paid, explicitly unpaid; payment confirmation is separate from OCR review |
| Recurrence P1 after forecast; weekly/monthly                     | Required one-time and monthly scheduling before forecast; weekly is not added to agreed scope                       |
| Add transaction includes auto-categorize                         | Manual category independent, optional suggestion                                                                    |
| Forecast adds rules and payments separately                      | Expand to stable occurrences, count each once                                                                       |
| Fixed demo warning                                               | Seed test only; live calculations from current synthetic records                                                    |
| Optional real OCR adapter                                        | Mock only for this prototype                                                                                        |

## Diagram mismatch

The supplied PNG has no editable source in the empty repository. It is preserved unchanged as `docs/use-case-diagram-v3.png`; it is historical, not reconciled. Required changes: add opening-balance setup and carry-forward; one-time schedule; promote monthly scheduling to required scope; replace auto-log with due occurrence processing labelled unconfirmed; add confirm/correct/mark unpaid and duplicate review/Keep both; remove mandatory include from Add transaction to auto-categorize. Keep upload review mandatory and external OCR/AI/scheduler simulated. Do not depict processing while closed. The README's approximate Mermaid is not the editable source of this PNG.
