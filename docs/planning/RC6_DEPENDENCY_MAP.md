# RC6 Dependency Map

**Status:** Planning
**Date:** 2026-08-02
**Baseline:** `v1.4.0` @ `96f1e803`

---

## Prerequisite graph

```text
RC6-DOC-01  (docs honesty)
    │
    ├──────────────► RC6-UI-01 (Admin labels)     [soft: avoid rewriting against stale governance]
    │
    ├──────────────► RC6-FIN-01 (finance UI)      [soft: same]
    │
    └──────────────► RC6-INV-01 (inventory residual) [soft]

RC6-QA-02  ──independent of DOC-01──► (can parallel after or with DOC-01)
RC6-A11Y-02 ──independent──►
RC6-CHK-01 ──depends on──► marketing coupon schema (exists) + checkout UX decision
RC6-QA-03 ──depends on──► OPS-01 privilege contract (done in RC5)

RC6-OPS-03 ──depends on──► stable Owner Playwright job (exists) + Founder GitHub admin
RC6-OPS-02 ──depends on──► Founder alert destinations (outside Git)
RC6-SEC-01 ──depends on──► Security ADR
RC6-SEC-02 ──depends on──► Founder-provided credential matrix coverage
RC6-PITR-01 ──depends on──► commercial Supabase plan approval
RC6-WA-01 / RC6-LOY-01 / RC6-AN-01 / RC6-AI-01 ──depend on──► provider/product ADRs
RC6-NB-01 ──depends on──► Founder go-live authorization
```

---

## Provider dependencies

| Slice | Provider |
| --- | --- |
| RC6-DOC-01, UI-01, QA-02, A11Y-02, FIN-01, INV-01, REL-01 | **None** |
| RC6-OPS-02 | Alert destination (email/Slack/Pager — TBD) |
| RC6-OBS-02 APM | APM vendor TBD |
| RC6-WA-01 | WhatsApp Business provider |
| RC6-LOY-01 | Loyalty/marketing send provider |
| RC6-PITR-01 | Supabase paid plan |

---

## Migration dependencies

| Slice | Migration class |
| --- | --- |
| DOC-01, UI-01, QA-02, OPS-02, OPS-03, A11Y-02, REL-01 | **NONE** |
| FIN-01, CHK-01, INV-01, SEC-02 | **EXISTING_SCHEMA_ONLY** (preferred) |
| SEC-01 | EXISTING_SCHEMA_ONLY or light additive metadata after ADR |
| WA/LOY/AN/AI depth | ADDITIVE_MIGRATION_LIKELY after ADR |
| Destructive finance year-end | HIGH_RISK — not early RC6 |

**Current tip:** `20260801180000` aligned local ↔ Production. No unapplied migrations on main.

---

## Recommended order

| Wave | Slices | Parallel? |
| --- | --- | --- |
| 0 | RC6-DOC-01 | Solo first |
| 1 | RC6-UI-01, RC6-QA-02, RC6-A11Y-02 | Yes |
| 1b | RC6-FIN-01 | After or with UI-01 |
| 2 | RC6-CHK-01, RC6-INV-01, RC6-SEC-02 | Partially |
| 3 | RC6-OPS-02, RC6-OPS-03, RC6-SEC-01 | Founder-gated |
| 4 | Providers / PITR / AI / NB | Founder + ADR |

---

## Parallelization notes

- Docs-only and CI-only slices do not block each other after Wave 0.
- UI label honesty and FIN-01 should not conflict if FIN-01 owns finance badges and UI-01 owns HR/Loyalty/grids.
- Never parallelize two Production cutovers on the same service without Founder sequencing.

---

## Explicit non-dependencies

- RC6 does **not** require a new Production website cutover to start DOC-01.
- RC6 does **not** require GitHub Release objects.
- RC6 does **not** require moving `v1.4.0`.
