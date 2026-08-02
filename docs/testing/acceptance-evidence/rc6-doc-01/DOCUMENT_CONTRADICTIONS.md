# RC6-DOC-01 — document contradictions

**Slice:** RC6-DOC-01
**Branch:** `docs/rc6-doc-01-living-status-honesty`
**Baseline (post–PR #176):** `25960eb2b69d2c390fe0ce364458c9cb3feeac0c`

| File / section | Current claim (before DOC-01) | Repository evidence | Correct canonical truth |
| --- | --- | --- | --- |
| `REPOSITORY_STATUS.md` tip | Main = `152ce40…` | `origin/main` after #176 = `25960eb…` | Tip is `25960eb…`; Prod website remains `152ce40…` |
| `REPOSITORY_STATUS.md` release | Proposed `v1.4.0` not created; `v1.3.0` last tag | Annotated tag `v1.4.0` → `96f1e803…` | `v1.4.0` released (no GitHub Release) |
| `REPOSITORY_STATUS.md` GRN | GRN does not post stock / Coming Soon | `create_goods_receiving_with_stock_atomic` + `grn-stock-posting-atomic.test.ts` | Repo-implemented; **not** Prod-verified |
| `REPOSITORY_STATUS.md` HR | No deactivate lifecycle | `POST /hr/employees/:id/deactivate` in `hr.ts` | Deactivate exists in repo; not full lifecycle / not Prod-verified |
| `REPOSITORY_STATUS.md` Finance | Implied LIVE with other ERP (no PARTIAL callout) | `RC6_CAPABILITY_TRUTH.md` → PARTIAL_LIVE | Record **PARTIAL_LIVE**; UI badges → RC6-UI-01 / FIN-01 |
| `RELEASE_HISTORY.md` | Main `152ce40…`; latest tag `v1.3.0`; proposed `v1.4.0` | Tag + tip evidence above | Update anchors; add RC6 planning section |
| `RELEASE_HISTORY.md` next actions | Review RC5 closeout / create `v1.4.0` | Closeout merged; tag exists | RC6-DOC-01 then RC6-UI-01 |
| `RC5_BASELINE.md` | `v1.4.0` recommendation-only | Tag exists post-closeout | Add supersession note; keep historical body |
| `RC5_RISK_REGISTER.md` R-15 | Tag not created by closeout | Tag exists | Note tag exists; package.json still diverges |
| `RC6_BASELINE.md` | Main = tag peel `96f1e803…` | Main advanced with #176 | Main = `25960eb…`; tag peel separate |
| `PROJECT_STATUS.md` HR | No directory/attendance/payroll APIs | HR/payroll routers + deactivate | Repo APIs exist; Prod unverified; UI → RC6-UI-01 |
| `rc5-final-closeout/RESIDUAL_LIMITATIONS.md` | Proposed `v1.4.0` not created | Historical at closeout | Supersession note only (do not rewrite as if known earlier) |

## Deliberately unchanged (out of DOC-01)

| Item | Reason |
| --- | --- |
| Admin UI banners/badges (`HRStatusBanner`, finance LIVE badges, etc.) | **RC6-UI-01** |
| Historical RC5 closeout FINAL_REPORT / RELEASE_RECOMMENDATION bodies | Historical evidence at closeout time |
| Application/runtime code | Docs-only slice |
| Production website SHA | Still `152ce40…` — no new deploy |
