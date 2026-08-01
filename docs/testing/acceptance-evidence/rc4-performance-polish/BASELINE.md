# RC4-7 Performance & Polish — Baseline (before changes)

| Item | Value |
| --- | --- |
| Branch | `feature/rc4-performance-polish` |
| Start SHA | `ff0327e20a555ee3e04e69584fa12d84bd5ac836` |
| Measured at | local `pnpm --filter telepizza-pakistan build` (pre-change) |

## Frontend production build (before)

| Asset | Raw | Gzip |
| --- | --- | --- |
| `index-*.js` (single chunk) | **2,129.50 kB** | **524.18 kB** |
| `index-*.css` | 178.46 kB | 27.56 kB |
| HTML | 1.51 kB | 0.68 kB |

Vite warning: chunks larger than 500 kB — **no `React.lazy` / route splitting** in `App.tsx` (all admin, supplier, ops, and account pages eagerly imported).

### Route chunk observation (before)

| Surface | Separate chunk? |
| --- | --- |
| Admin initial | No — inside monolith |
| Supplier Portal | No — inside monolith |
| Analytics / Reports | No — inside monolith |
| Finance | No — inside monolith |
| Payroll / HR | No — inside monolith |
| Loyalty / Marketing | No — inside monolith |
| Customer marketing (Home/Menu) | Same monolith |

## API / query observations (before)

- Most admin list routes: `limit` 1–100 (some menu/inventory 200; loyalty up to 500).
- Loyalty liability snapshot selected up to **20,000** transaction rows in one payload (`select points, type`).
- No shared HTTP cache layer (no React Query/SWR); operational surfaces use `useOperationalData` + polling.

## Copy / placeholder observations (before)

- Owner nav shows Support / AI Command Center / Integrations as disabled “Soon”.
- CRM loyalty drawer still said “Planned for Phase 2” despite RC4-11 ledger LIVE on `/admin/loyalty`.
- HR KPI “Payroll status” still said no payroll runs despite RC4-3 payroll LIVE.

## Stash note

`stash@{0}` (RC4-11 Playwright evidence refresh) preserved; not applied in this slice.
