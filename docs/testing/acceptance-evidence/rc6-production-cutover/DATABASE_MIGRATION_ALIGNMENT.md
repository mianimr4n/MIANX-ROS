# RC6 Phase 1 — Database / migration / RLS alignment

| Field | Value |
| --- | --- |
| Expected Production migration tip | `20260801180000` |
| Latest repository migration | `20260801180000_rc4_loyalty_marketing_depth.sql` |
| Migrations in `v1.4.0..830dbc8` (incl. tip `b14163c`) | **none** |
| Production SQL by Phase 1 | **none** |
| Migration performed by Phase 1 | **none** |
| `pnpm test:db` (local, prior candidate) | PASS on `bf5912c…` |

## Repository RLS / grants (no Production SQL)

- RC6 Command Center is website aggregation over existing admin-readable contracts.
- No new tables/columns/policies introduced in the RC6 range.
- Finance/HR/purchasing remain permission-gated in website + existing API contracts.

**Conclusion:** `DATABASE_ALIGNED_NO_ACTION_REQUIRED`

API process does not expose migration tip (`unavailable`); tip alignment is by repository tip + empty migration diff vs expected Production tip `20260801180000`.
