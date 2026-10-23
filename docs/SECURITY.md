# Account update - 2026-10-23

Registered users and per-user financial workspaces now live in a local Node/SQLite backend. Passwords are salted and hashed with scrypt; random session tokens are stored only as hashes and delivered in HttpOnly SameSite=Strict cookies, with Secure cookies in production mode. Mutation endpoints check Origin, use bounded JSON bodies and validated schemas, and authenticate the user independently of client-supplied IDs. Authentication is rate limited. SQL uses bound parameters. Logs exclude credentials and financial payloads. The server serves only dist files, not database files.

The database is `.data/fintech.sqlite`, ignored by Git. Record caches are scoped by user ID; previous anonymous records remain available only through an explicit import action. Signing out clears the active workspace. Password-confirmed deletion removes the account’s database rows and scoped local cache. Ask AI is a clearly labelled local demo with no external model connection. OCR still runs on-device and does not save image bytes.

Public deployment requires HTTPS, an explicit APP_ORIGIN, persistent DATA_DIR storage, backups, email recovery/verification and a production security review. This local implementation does not add MFA or at-rest encryption. These account decisions supersede the earlier no-accounts and local-only-records milestone notes below.

# Current boundaries - 2026-10-23

The app runs without provider API keys or AI chat. Real OCR processes selected images in a local Web Worker using same-origin engine and English/Burmese language assets. Model data can be cached by the browser; receipt images and detected text are not persisted. Only reviewed transaction fields are saved. The CSP permits WebAssembly compilation (`wasm-unsafe-eval`) and same-origin workers; it does not allow general script eval, remote OCR hosts or inline script execution.

Credit Readiness stores self-reported document availability, bank choice and optional applicant/business names in existing local browser storage. It does not upload KYC documents or connect to banks. PDF reports are rendered and downloaded locally from saved records. They are user-prepared summaries without bank verification, audit, official certification or creditworthiness scoring. Month coverage is disclosed, and missing records must not be interpreted as no financial activity.

There are no user accounts or encrypted record storage. Real multi-user deployment still needs identity, access isolation and appropriate data protection. Earlier security notes below describe the historical milestones and are superseded for OCR, AI chat and PDF export.

# Security boundaries

This is a local, synthetic-data frontend prototype. It has no accounts, backend, financial integrations, analytics or secrets. Dependencies are locked; CI runs `npm audit --audit-level=high`. Assets and fonts are local. The production HTML policy restricts scripts, styles, connections, images, forms and objects to the app origin, with browser-local blob/data images allowed for receipt preview. Vite's development server adds loopback HMR WebSocket and inline-style exceptions only while serving; the production build does not include them. `npm run verify:csp` checks the built policy. Frame embedding restrictions require host response headers (`frame-ancestors 'none'`) because meta CSP cannot enforce that directive. Configure those at deployment; deployment is outside this milestone.

The prototype validates inputs and persisted data, keeps images local with revoked object URLs, renders untrusted text as text, recovers visibly from storage errors, and does not log financial data. M4 validates JPEG/PNG/WebP type, non-empty size and a 5 MB maximum before previewing with an object URL; the URL is revoked on replacement/unmount and image bytes never leave the browser or enter persistence. The readiness checklist stores only user-selected yes/no status and never uploads document files. Assistant answers and category suggestions are deterministic local rules. Use synthetic records only; browser storage is not encrypted and is not suitable for real financial information.

Production is out of scope. Before real data: OIDC/MFA, per-user isolation, encrypted transit/storage, secret vault, audit trails, rate limits, upload scanning, backups, retention/deletion, prompt-injection defenses with vetted read-only tools, a production host CSP including `frame-ancestors 'none'`, and qualified review of applicable Myanmar financial/privacy requirements.
