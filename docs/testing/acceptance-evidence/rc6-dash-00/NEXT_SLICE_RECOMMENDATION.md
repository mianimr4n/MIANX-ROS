# RC6-DASH-00 — Next slice recommendation

## Selected next runtime slice

**RC6-DASH-01 — Owner Exception Center read-only foundation**

## Preferred scope

- **Zone:** What Needs Attention Now
- **Sources:** Existing trusted attention / ops APIs only
- **Display:** severity, branch, age, freshness, trust/source label
- **States:** empty / stale / error / denied — no fake zeros
- **Navigation:** drill-down to existing admin routes with preserved filters
- **Mutations:** none for acknowledgement unless an existing schema already supports it safely
- **Out of scope:** AI, new external providers, new migration if avoidable, Approval Inbox depth, KPI profitability, What Changed timeline, delivery POD/COD

## Why this slice

- Highest operator value after honesty wave
- Uses repository-supported sources
- Testable with static + Owner Playwright extensions
- Low blast radius; no Production SQL by default
- Unblocks DASH-02+ without pretending full Command Center exists

## Implementation brief (do not implement in DASH-00)

1. Map catalogue subset (`EXC-*`) to existing attention endpoints
2. Present read-only list/cards on Command Center Zone 1
3. Label trust + freshness per KPI Trust Registry
4. Wire drill-downs to current routes
5. Add acceptance evidence `rc6-dash-01/` + gate criteria from `RC6_ACCEPTANCE_CRITERIA.md`
6. Keep analytics `exception_center` naming distinct

## Acceptance preview

Criteria E-01…E-06 in `docs/planning/RC6_ACCEPTANCE_CRITERIA.md`.
