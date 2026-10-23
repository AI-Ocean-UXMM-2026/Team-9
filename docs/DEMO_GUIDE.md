# Shwe Taw Pyan Chi demo guide

Use synthetic information only. This local prototype does not connect to a bank, wallet, OCR service or AI service. A full walkthrough takes about 6–8 minutes.

## Prepare

From the repository root, run `npm ci` and `npm run dev`, then open the local Vite address. To start with an empty workspace, open the browser developer console, run `localStorage.clear()`, and reload. Keep the demo disclosure visible throughout the walkthrough.

## Walkthrough

1. On Dashboard, enter an opening balance of **470,000 MMK**. The reference defaults to the current time in Asia/Rangoon. Explain that this is a synthetic starting point, not a verified bank balance.
2. Open Transactions and add a pending income record for **400,000 MMK**, description “Demo invoice”, dated today and due in two days. If the opening-day timing question appears, choose “after the opening balance time.” Add a pending expense for **650,000 MMK**, description “Demo bill”, dated today and due in three days, with the same timing choice. In Forecast & insights, show the expected-date low point and the delayed-inflow shortfall. The result is calculated from the entries; it is not a fixed alert.
3. In Transactions, type “Taxi delivery” as a description and show the optional transport suggestion. Apply it, then change the category manually to demonstrate that the user controls the final category.
4. In Upload & review, select a harmless sample JPEG, PNG or WebP file, run “Simulate sample extraction,” and review the fields. Point out the explicit confirmation step and the notice that the image is not stored. The sample values are illustrative; they are not extracted from image pixels.
5. In Record readiness, show the record checks and mark one or two synthetic document checklist items available. Explain that the app stores only checklist status, not document files, and does not assess creditworthiness or loan approval.
6. In Ask AI, ask “What are my expenses this month?” and then “Will I get a loan?” Show the record-backed answer and the refusal to predict approval.

## Reset after the demo

Run `localStorage.clear()` in the browser console and reload to remove the synthetic workspace. Receipt images are held only in the current tab and are discarded when the review flow ends.
