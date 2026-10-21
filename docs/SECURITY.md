# Security boundaries

M0 has no data entry, persistence, uploads, secrets, external services or analytics. Dependencies are locked; CI audits high-severity advisories. Static assets and fonts are local. Production CSP is in index.html; frame embedding restrictions require host response headers (`frame-ancestors 'none'`) because meta CSP cannot enforce that directive. Configure those at deployment; no deployment is part of M0.

Later prototype work must validate inputs and persisted data, keep images local with revoked object URLs, render untrusted text as text, recover visibly from storage errors, and never log financial data. Only synthetic records are allowed.

Production is out of scope. Before real data: OIDC/MFA, per-user isolation, encrypted transit/storage, secret vault, audit trails, rate limits, upload scanning, backups, retention/deletion, prompt-injection defenses with vetted read-only tools, and qualified review of applicable Myanmar financial/privacy requirements.
