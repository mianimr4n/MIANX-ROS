# RC6-DASH-01 — Exception data contract

Central builder: `apps/website/client/src/lib/exception-center/build-exceptions.ts`
Types: `apps/website/client/src/lib/exception-center/types.ts`

## OwnerException fields

id, type, domain, severity (`CRITICAL|WARNING|INFORMATION`), title, summary, count, branchId, branchName, source, trustState, observedAt, freshnessState (`LIVE|FRESH|STALE|UNAVAILABLE`), oldestAt, drillDown, limitation

## Rules

- Presentational components never read raw kitchen/delivery/ops rows.
- Counts only from successful source payloads.
- Source failure ≠ count 0 / all-clear.
- No customer phone, employee PII, rider GPS, payroll, or cash amount detail in summary cards (counts only for cash variance closes).
- Finance source omitted from required set when `financeEnabled` is false (permission), not treated as failure.
- Thresholds: kitchen prep guide `PREP_TARGET_MINUTES` (20); ops pending/preparing/ready ages from backend management service.
