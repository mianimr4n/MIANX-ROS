# Rollback plan (DRAFT — do not execute)

## Triggers

Public fatal error; Owner login failure; protected dashboard failure; repeated chunk-load errors; unexpected auth/API 5xx; cross-branch auth defect; financial/PII exposure; false mutation; severe a11y regression; dashboard unusable across modes.

## Preferred rollback

| Item | Value |
| --- | --- |
| Method | Restore previous verified Vercel Production deployment/alias |
| Documented prior deployment (RC5 cutover) | `dpl_7xaV34uyAEdMLvWckWKQASPAxJ7r` @ `152ce409609dc78e48d0d2b6b0c34a35d6338c24` |
| Prior-prior rollback (RC5 notes) | `dpl_FriiC2PsK3bEYrXbXLVuNSXv3G3y` (`795efee…`) |
| DB rollback | **Not expected** |
| Backend rollback | **Not expected** for this website-only package |
| Migration rollback | **Not expected** |

**Drift note:** GitHub Production env already lists SHAs after `152ce40…` (incl. `bf5912c…`). Founder must confirm the true live alias `dpl_` before choosing rollback target.

## Post-rollback verification

Public routes `/`, `/menu`, `/admin/login`; Owner login gate; `/healthz` + `/readyz`; bounded log recheck.
