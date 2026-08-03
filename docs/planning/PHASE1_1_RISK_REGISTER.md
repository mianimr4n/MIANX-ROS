# Phase 1.1 — Risk register

**Status:** Living  
**Date:** 2026-08-03

| ID | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R11-01 | Misleading Available/Ready labels → operator trust loss | High | High | POLISH-04 first |
| R11-02 | Dual branch selectors → wrong-branch actions | Med | High | POLISH-01 partial; residual filter dupes |
| R11-03 | Polish waves accidentally change mutations | Med | High | Scope UI/honesty; tests (POLISH-03 ops presentation-only) |
| R11-04 | Starting Phase 2 before polish | Med | High | Gate document |
| R11-05 | Docs drift (#193 unmerged) | Low | Med | **Mitigated** — #193 merged |
| R11-09 | Ops stub chrome implies Phase 2 ready | Med | Med | **Mitigated in POLISH-03** (Delivery/WA/Kitchen) |
| R11-06 | Perf regression from design tokens | Low | Med | Budgets in POLISH-07 |
| R11-07 | PII in evidence/PRs | Low | High | Ban screenshots; sanitize |
| R11-08 | Empty Prod data misread as outages | High | Med | State vocabulary |
