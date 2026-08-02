# RC5-OBS-01 — Operator access proof

**Result:** `OPERATOR_ACCESS_PROVEN` (Render dashboard correlation + Supabase unified-log searches)
**Operator runbook:** `COMPLETE` — `docs/10-devops/PRODUCTION_LOGS_AND_ALERTING.md`
**Alerts:** `PROPOSED_NOT_ENABLED`
**Bulk log export:** `NOT_PROVEN` / `NOT_CLAIMED`
**Full APM or paging:** `NOT IMPLEMENTED`

No screenshots, raw Production logs, full request IDs, IPs, user-agents, user IDs, emails, tokens, cookies, or Authorization headers are included.

---

## A. Render dashboard correlation (OPERATOR_ACCESS_PROVEN)

| Field | Sanitized value |
| --- | --- |
| Platform / service | Render — Production API service `telepizza-api` |
| Endpoint | `GET /readyz` |
| HTTP status | **200** |
| Partial request ID | `obs-20260802…4853Z` |
| Matching Render log found | **YES** |
| Structured JSON confirmed | **YES** |
| Sensitive token observed in matched log | **NO** |
| Production mutation | **NONE** |

**Correlation result:** `OPERATOR_ACCESS_PROVEN`

Application `requestId` from the probe was located in Render Log Explorer for `telepizza-api`. The matched line was structured JSON. No sensitive token was observed in the reviewed log fields. Full request ID was not committed.

---

## B. Supabase unified-log access (OPERATOR_ACCESS_PROVEN)

| Field | Sanitized value |
| --- | --- |
| Reviewed UTC window | **2026-08-02 07:45Z–07:55Z** (exact window only) |
| Access method | Supabase Production project unified / product Logs (Dashboard) |
| `42703` results | **0** |
| `42P01` results | **0** |
| `42501` results | **0** |

**Zero results apply only to the exact reviewed UTC window** `2026-08-02 07:45Z–07:55Z`. They are not a claim about other time ranges or about “no schema errors ever.”

**Search result:** `OPERATOR_ACCESS_PROVEN`

---

## C. Explicit non-claims

| Item | Status |
| --- | --- |
| Bulk log export API / automated export in repo | `NOT_PROVEN` / `NOT_CLAIMED` |
| Platform alerts enabled | `PROPOSED_NOT_ENABLED` |
| Full APM or paging | `NOT IMPLEMENTED` |
| Screenshots / raw logs in Git | Not included |

---

## D. Operator attestation

| Statement | Attestation |
| --- | --- |
| Read-only `/readyz` probe used for correlation | **Yes** |
| Render Log Explorer correlation executed | **Yes** |
| Supabase Logs search executed for SQLSTATE codes | **Yes** (window above only) |
| Production data mutated | **No** |
| Credentials / tokens / cookies committed | **No** |
| Alerts enabled on platform | **No** |

---

## E. Earlier probe note (superseded for proof status)

An earlier public probe at ~2026-08-02T07:03:20Z recorded `/healthz` and `/readyz` HTTP 200 without Dashboard correlation. That session lacked operator credentials and is **not** the proving event. The proving event is §A–§B above.
