# Performance budgets

From `admin-performance-contract.ts`:

| Budget | Value |
| --- | --- |
| Public entry gzip max | ceil(251.58 × 1.02) KB |
| Largest lazy Admin route gzip soft max | 180 KB |
| Duplicate identical concurrent reads | 0 |
| Visible stale branch commits | 0 |
| KDS active pollers per workspace | 1 |
| Public imports Admin runtime | forbidden |
| Axe in Production bundle | forbidden |
| PII in post-logout storage allowlist | forbidden |

No unsupported Core Web Vitals guarantees.
