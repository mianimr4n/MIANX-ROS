# Phase 1.1 — Dependency map

```text
v1.5.0 release
    → audit evidence (this PR)
    → optional merge #193 anchor sync
    → POLISH-01 shell
         ↘ POLISH-02 Owner dashboard
    → POLISH-03 ops (parallel ok)
    → POLISH-04 honesty (parallel ok after audit)
    → POLISH-05 design system (after patterns emerge)
    → POLISH-06 a11y/responsive (after UI churn)
    → POLISH-07 perf/privacy
    → POLISH-QA gate
    → Phase 2 runtime authorization (Founder)
```

| Dependency | Blocks |
| --- | --- |
| Audit findings IDs | All polish PRs must cite IDs |
| No migrations | All polish website-only unless Founder expands |
| Owner smoke harness | POLISH-02 / QA |
| Role fixtures | POLISH-QA |
| Phase 1.1 gate PASS | Phase 2 start |
