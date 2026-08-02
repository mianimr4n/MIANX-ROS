# RC6-QA-03 — Security & privacy review

## Auth / authorization

- OCC is admin-only; public routes must not import `OwnerCommandCenter`, `what-changed/`, or `eod-pack/` (static test #9).
- Post-logout revisit of `/admin/dashboard` must not show OCC (Playwright journey step 18).
- Finance posted data remains permission-gated (`canLoadFinance` → `financeEnabled`).
- Drill-downs rely on existing admin route guards — no new privilege widening.

## Data / PII

| Surface | Rule |
| --- | --- |
| What Changed storage | `telepizza.admin.whatChanged.v1` — aggregates/timestamps; never tokens |
| Timeline titles | No customer phone/address, employee names/salary, rider GPS, bank details |
| EOD exports | Local print/CSV/JSON preview; no provider send |
| URLs | No PII query keys; no fabricated `branchId` |

## Mutations & providers

- Integrated panels: no Acknowledge / Approve / Finalize / Close Day.
- No OpenAI, WhatsApp, SendGrid, Resend in OCC.
- No migrations, Production SQL, or secret changes in QA-03.

## Playwright / CI hygiene

- Loopback base URL enforced in config + tests.
- No committed storageState tokens; artifacts on failure only (existing RC5-QA policy).
- Evidence files contain no credentials, cookies, or dumps.

## Residual

- Unified SoD / approval execution still deferred.
- Production website not cut over — do not treat this pack as Production security certification.
