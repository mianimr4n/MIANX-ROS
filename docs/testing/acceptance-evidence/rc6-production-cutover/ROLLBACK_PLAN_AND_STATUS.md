# RC6 Phase 1 — Rollback plan and status

| Field | Value |
| --- | --- |
| Current active deployment | `dpl_Hi35GYuauM5W9hdomkPEhppmuV6D` |
| Current active SHA | `b14163ccbc82fca0b2856ea137bddb746ed5716b` |
| Rollback target deployment | `dpl_HhvEuMZERVSLi7KK694cfeizcC7R` |
| Rollback target SHA | `bf5912c91826efce1d097c2ba1a5a0f9c37157ee` |
| Rollback executed | **No** |
| Backend/DB rollback expected | No |

## Triggers (unchanged)

Public fatal render, Owner login failure caused by candidate, dashboard failure, chunk storms, authz/PII/mutation defects, severe a11y regression.

## Rollback procedure (website only)

1. Promote `dpl_HhvEuM…` (`bf5912c…`) to Production alias via Vercel.
2. Re-run public + Owner smoke on rollback SHA.
3. No migration rollback required (no DB changes in RC6 range).

## Status

Production stable on `b14163c…`; rollback target retained and not exercised.
