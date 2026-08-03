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
- **Status:** Merged — evidence `phase1-polish-03/` (#197 → `936c5a3`)

## POLISH-04 — Commerce & business admin

- Settings nav honesty (Available vs navigation-only)
- Mount readiness banners; HR header fix; inventory empty-state; purchasing caveat
- CRM/Loyalty/Finance/Reports label alignment
- **Risk:** Low–Med · Copy/state only preferred
- **Status:** Merged — evidence `phase1-polish-04/` (#198 → `7fa2c8b`)

## POLISH-05 — Shared states & design system

- Vocabulary components: loading/empty/unavailable/deferred
- Cards, badges, buttons, forms, tables tokens
- **Risk:** Low · Broad touch; visual regression tests
- **Status:** Merged — evidence `phase1-polish-05/` (#199 → `944eb8f`)

## POLISH-06 — Accessibility & responsive hardening

- Viewport matrix + axe on touched admin families
- critical=0 serious=0 gate
- **Risk:** Low
- **Status:** Merged — evidence `phase1-polish-06/` (#200 → `c7b91bf`)

## POLISH-07 — Performance, security & privacy

- Bundle/regression budgets; refetch discipline
- PII export/masking review; post-logout matrix expansion
- **Risk:** Med
- **Status:** Merged — evidence `phase1-polish-07/` (#201 → `a29e8d7`)

## POLISH-QA — Professional readiness certification

- Multi-role local matrix
- Headed axe + responsive + Owner ×3
- Gate remains pending Production certification
- **Risk:** Low · Docs + tests + narrow QA fixes
- **Status:** In PR — evidence `phase1-polish-qa/`

Each PR: docs evidence pack, tests for touched honesty/UI, no migrations/providers/secrets/Prod SQL.
