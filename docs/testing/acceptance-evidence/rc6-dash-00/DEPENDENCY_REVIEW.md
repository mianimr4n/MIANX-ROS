# RC6-DASH-00 — Dependency review

## Prerequisite completion

| Slice | Status |
| --- | --- |
| RC6-DOC-01 | Merged #177 |
| RC6-UI-01 | Merged #178 |
| RC6-QA-02 | Merged #179 |
| RC6-A11Y-02 | Merged #180 → `da99875…` |

## Graph (summary)

```text
DASH-00 (docs)
  → DASH-01 (next runtime, prefer no migration/provider)
  → DASH-02…08
  → DEL/RIDER/CASH sequences
  → SET-01…10
FIN-01 / CHK-01 / INV-01 / SEC-02 retained parallel
```

## Migration / provider

| Family | Class |
| --- | --- |
| DASH-00 | NONE (docs only) |
| DASH-01 | Prefer NONE / existing sources |
| DASH-08, DEL-02+, CASH-01, SET-08, POD | Additive migration likely later |
| DASH-01–05 preferred | No external provider |

## Founder decisions deferred

- AI execution boundaries (AI-01)
- Provider enablement (WA/LOY/maps/APM)
- PITR commercial
- Branch-protection / GitHub Release objects
- Northern Bypass go-live
