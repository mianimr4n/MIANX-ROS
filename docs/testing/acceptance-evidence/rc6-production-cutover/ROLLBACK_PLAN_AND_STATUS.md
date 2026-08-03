# RC6 Phase 1 — Rollback plan and status

| Field | Value |
| --- | --- |
| Current active deployment | `dpl_BtPH8AvtUsKHwjJaQAf7gEVMMpom` |
| Current active SHA | `830dbc8b5916cc0a724a0d7489a0e34387a26f78` |
| Preferred rollback (feature tip) | `dpl_Hi35GYuauM5W9hdomkPEhppmuV6D` / `b14163c…` |
| Earlier rollback candidate | `dpl_HhvEuMZERVSLi7KK694cfeizcC7R` / `bf5912c…` |
| Rollback executed | **No** |
| Backend/DB rollback expected | No |

## Triggers (unchanged)

Public fatal render, Owner login failure caused by candidate, dashboard failure, chunk storms, authz/PII/mutation defects, severe a11y regression.

## Rollback procedure (website only)

1. Promote retained prior deployment (`dpl_Hi35GY…` or earlier `dpl_HhvEuM…`) to Production alias via Vercel.
2. Re-run public + Owner smoke on rollback SHA.
3. No migration rollback required (no DB changes in RC6 range).

## Status

Production stable on `830dbc8…` / `dpl_BtPH8…` (website files ≡ `b14163c…`); rollback targets retained and not exercised.
