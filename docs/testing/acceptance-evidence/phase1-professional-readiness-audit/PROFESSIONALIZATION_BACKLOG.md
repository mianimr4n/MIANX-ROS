# Phase 1.1 — Professionalization backlog

Sequenced after this audit PR. **No Phase 2 runtime** in these slices.

## POLISH-01 — Global shell & navigation

- Remove/replace dead global search & notifications controls
- Unify branch context labeling; reduce duplicate selectors
- Sidebar grouping / role defaults / active alias states
- Logout/session regression pack retained
- **Risk:** Low · Website-only · No migration

## POLISH-02 — Owner & Executive dashboards

- Above-fold hierarchy for 30-second questions
- Density, card consistency, trust-label presentation
- Mode progressive disclosure
- **Risk:** Low · Website-only

## POLISH-03 — Operations

- Orders/Kitchen/Delivery/POS/Floor/WA honesty chrome
- Collapse Phase 2 stub buttons
- Table overflow + filters
- **Risk:** Med · Avoid behavior changes to mutations

## POLISH-04 — Commerce & business admin

- Settings nav honesty (Available vs navigation-only)
- Mount readiness banners; HR header fix; inventory empty-state; purchasing caveat
- CRM/Loyalty/Finance/Reports label alignment
- **Risk:** Low–Med · Copy/state only preferred

## POLISH-05 — Shared states & design system

- Vocabulary components: loading/empty/unavailable/deferred
- Cards, badges, buttons, forms, tables tokens
- **Risk:** Low · Broad touch; visual regression tests

## POLISH-06 — Accessibility & responsive hardening

- Viewport matrix + axe on touched admin families
- critical=0 serious=0 gate
- **Risk:** Low

## POLISH-07 — Performance, security & privacy

- Bundle/regression budgets; refetch discipline
- PII export/masking review; post-logout matrix expansion
- **Risk:** Med

## POLISH-QA — Professional readiness certification

- Multi-role local matrix
- Public + Owner Production read-only smoke
- Gate document update
- **Risk:** Low · Docs + tests

Each PR: docs evidence pack, tests for touched honesty/UI, no migrations/providers/secrets/Prod SQL.
