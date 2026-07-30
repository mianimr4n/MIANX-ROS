# Production Release Certification Audit — Telepizza ROS

**Audit date:** 2026-07-30  
**Auditor role:** QA & Release Engineering  
**Certified scope:** `main` @ `975fcb92a580ea059ec7927d0f36cd44eaf05695`  
**Expected baseline note:** Requested `e5c39107bf59a6dfdadb6d09cea38ccb7bd76393`; local `main` fast-forwarded to newer tip after `git pull origin main`.  
**Final verdict:** **NOT CERTIFIED**

---

## Executive summary

Four of five gates pass (or pass with documented notes). **Gate 3 fails with a production blocker:** migration `20260730220000_atomic_inventory_and_grn_stock` exists locally on `main` but is **not applied on the linked remote database**. Until that migration is pushed and verified remote, inventory atomic adjust / GRN stock posting RPCs are absent in production DB while application code on `main` expects them.

---

## Gate results

| Gate | Result | Notes |
| --- | --- | --- |
| 1 — Fresh main verification | **PASS** | Clean tree; HEAD = latest `origin/main` (`975fcb9`), not the older pin `e5c3910` |
| 2 — Full build & test | **PASS** | `pnpm check` 0 errors; tests 0 failures; `pnpm build:website` succeeded |
| 3 — Migration history | **FAIL (BLOCKER)** | `20260730220000` is **LOCAL ONLY** |
| 4 — Security & RBAC | **PASS WITH LIMITATIONS** | No privileged write found without auth; intentional guest writes + broad `admin.access` / role-based gates |
| 5 — Production smoke | **PASS** | Website + API health/ready + public branches/catalog OK |

---

## Gate 1 — Fresh Main Clone Verification

| Check | Result |
| --- | --- |
| `git checkout main && git pull origin main` | OK (fast-forward `2b775bc` → `975fcb9`) |
| HEAD | `975fcb92a580ea059ec7927d0f36cd44eaf05695` |
| Matches requested `e5c3910`? | No — **newer** main includes atomic inventory/GRN merge |
| `git status` | Clean (`nothing to commit, working tree clean`) |

**Gate 1: PASS**

---

## Gate 2 — Full Build & Test

| Step | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Completed with store-reinstall confirmation prompt; proceeded; workspace usable |
| `pnpm check` | **0 errors** (website `tsc` + backend `tsc`) |
| `pnpm test` | **0 failures** |
| `pnpm build:website` | **Succeeded** (Vite client + esbuild server) |

### Exact test counts

| Suite | Command slice | Passed | Failed |
| --- | --- | --- | --- |
| Static / DB / website / catalog / menu | `pnpm test:db` (`node --test …`) | **690** | **0** |
| Backend API | `pnpm test:backend` (Vitest) | **504** | **0** |
| **Combined `pnpm test`** | `test:db && test:backend` | **1194** | **0** |

Backend Vitest: **63** test files passed.  
Website production build: client bundle written; chunk-size warning only (non-blocking).

**Gate 2: PASS**

---

## Gate 3 — Migration History Verification

Command: `npx supabase migration list --linked`

### Ledger (local vs remote)

| Version | Local | Remote | Status |
| --- | --- | --- | --- |
| `20260713190000` … `20260730210000` (52 versions) | Present | Present | Synced |
| `20260730220000` | Present | **Missing** | **LOCAL ONLY — BLOCKER** |

Synced remote head: **`20260730210000`** (`pos_z_report_events`).  
Local head: **`20260730220000`** (`atomic_inventory_and_grn_stock`).

### Full version list (53 local files)

```
20260713190000  20260713191000  20260714100000  20260714120000
20260715120000  20260715153000  20260716010000  20260716020000
20260716100000  20260716101000  20260716102000  20260716103000
20260716120000  20260716140000  20260716150000  20260716160000
20260718120000  20260718130000  20260718130100  20260718130200
20260718140000  20260718150000  20260718160000  20260718170000
20260718171000  20260718180000  20260719090000  20260719100000
20260719110000  20260725050000  20260725100000  20260725101000
20260725110000  20260725120000  20260725130000  20260725140000
20260726120000  20260728180000  20260729010000  20260729020000
20260729030000  20260729140000  20260729150000  20260729220000
20260730120000  20260730130000  20260730160000  20260730170000
20260730180000  20260730190000  20260730193000  20260730210000
20260730220000  ← LOCAL ONLY
```

### Blocker action required

```bash
npx supabase db push --linked
npx supabase migration list --linked   # confirm Local = Remote through 20260730220000
```

Until applied, production code paths calling `adjust_inventory_stock_atomic` / `create_goods_receiving_with_stock_atomic` will fail against the live DB.

**Gate 3: FAIL (BLOCKER)**

---

## Gate 4 — Security & RBAC Verification

### Findings (summary)

1. **No global `/admin` middleware** — each admin sub-router applies JWT (`createRequireAuth`) + principal load + permission/role checks.
2. **Write routes:** domain permissions (`order.manage`, `menu.write`, `inventory.manage`, `purchasing.manage`, etc.) and/or `admin.access`; kitchen/bills/opening/staff often use **service-layer role asserts** after auth.
3. **Anonymous access (intentional):** `GET /healthz`, `GET /readyz`, `GET /api/v1/menu/catalog`, `GET /api/v1/branches`, guest order quote/create/cancel, public booking create/cancel, dine-in QR resolve, auth invite accept. Rate limits / tokens apply where designed.
4. **No privileged write found with zero auth.**

### Security concerns (non-blocking for this gate, release-relevant)

| ID | Concern | Severity |
| --- | --- | --- |
| S1 | `admin.access` seeded to branch-manager; OR-gates grant broad BM capability | Medium |
| S2 | Dual RBAC: some domains permission-coded; opening/staff/kitchen/bills role-coded | Medium |
| S3 | Intentional anonymous guest order / public booking writes (abuse residual) | Medium (accepted product design) |
| S4 | Legacy `requireRole` (`x-telepizza-role`) still on 501 stub `GET /admin/controls` | Low |
| S5 | Org settings `PUT` gated by `admin.access` only | Low (intentional) |

**Gate 4: PASS WITH LIMITATIONS**

---

## Gate 5 — Production Smoke Test

| Check | Result | Detail |
| --- | --- | --- |
| `https://telepizza-website.vercel.app` | **200** | HTML shell served |
| `https://telepizza-api.onrender.com/healthz` | **200** | `ok: true` |
| `https://telepizza-api.onrender.com/readyz` | **200** | `ok: true`; `safetyBlockers: []`; `envClass: production` |
| `GET /api/v1/branches` | **200** | **2 branches** (`royal-orchard` operating, `northern-bypass` coming-soon) |
| `GET /api/v1/menu/catalog` | **200** | **26 categories / 125 items** (aggregated from catalog payload) |

**Gate 5: PASS**

---

## Known limitations (from this audit + repo honesty)

1. **BLOCKER:** Production DB missing `20260730220000` (atomic inventory + GRN stock RPCs).
2. **Docs lag:** `docs/00-governance/REPOSITORY_STATUS.md` still describes GRN non-posting / adjustment atomicity risk as open gaps, while `main` code + local migration implement atomic adjust/GRN posting (not yet remote-applied).
3. **Z-Report:** no starting float / counted cash variance.
4. **HR:** directory LIVE; update/deactivate lifecycle thin.
5. **AI:** foundation LIVE; no production agent runtime loop.
6. **Northern Bypass:** remains `coming-soon`.
7. **Loyalty / kitchen recipe consume / marketing coupons:** present on `feature/final-launch-certification`, **not** on this audited `main` tip — out of certification scope for this report.
8. **RBAC limitations:** broad `admin.access`, role-based opening/kitchen/bills gates (see Gate 4).

---

## Final verdict

# NOT CERTIFIED

**Reason:** Gate 3 migration blocker — `20260730220000_atomic_inventory_and_grn_stock` is local-only on linked production.

**Re-certify when:**

1. `npx supabase db push --linked` applies `20260730220000`
2. `migration list --linked` shows Local = Remote through that version
3. Smoke: inventory adjust + GRN create with mapped line succeeds against production (authenticated)
4. Optionally reconcile `REPOSITORY_STATUS.md` to repository evidence after remote apply

---

## Audit evidence stamps

| Item | Value |
| --- | --- |
| Branch | `main` |
| Commit | `975fcb92a580ea059ec7927d0f36cd44eaf05695` |
| Tests | 1194 passed / 0 failed |
| Typecheck | 0 errors |
| Website build | success |
| Remote migration head | `20260730210000` |
| Local migration head | `20260730220000` |
