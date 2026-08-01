# RC4 Production Cutover — Execution Plan

**Status:** Prepared — **awaiting Founder authorization**
**Do not apply migrations until all stop conditions are clear and GO is issued.**
**Do not use SQL Editor for ad-hoc schema changes.**
**Do not deploy new features in this operation.**

---

## Identity

| Field | Value |
| --- | --- |
| Repository | `mianimr4n/telepizza` |
| Certification branch | `feature/rc4-final-certification` |
| Preparation HEAD | `1c8894d81b7b738b2f125494c94794c383b300bb` |
| `origin/main` | `1d648950a8ea5bfb982713a203bacc6c7dd93ec1` |
| Ancestry | `origin/main` ⊆ certification branch (**verified**) |
| Currently deployed API SHA | `1d64895…` (see baseline) |
| Approved migration source SHA | **TBD by Founder GO** (must contain pending files through `20260801180000`; preparation tip `1c8894d` qualifies) |
| Linked project ref | **`pyeowxvacgypohrbvgee`** (exact match required) |
| Pending range | `20260731010000` → `20260801180000` (23 migrations) |
| Remote tip (pre) | `20260730290000` |
| Local tip | `20260801180000` |
| Operator (prep) | Cursor agent session (Mian supervising) |
| Named release / DB / rollback / smoke / T+60 owners | **TBD — Founder GO** |
| Start time | **TBD — maintenance window** |
| Expected duration | 15–45 minutes migrate + smoke (extend if index builds slow) |

---

## Backup attestation

See [BACKUP_VERIFICATION.md](./BACKUP_VERIFICATION.md).

| Artifact | SHA-256 |
| --- | --- |
| `01-roles.sql` | `25873CEC56A2CC6514E204F420231777F85C03DA818CAA7090CDCDFA89776ECD` |
| `02-schema.sql` | `8F0E7ACC5A9BB1E1738E3E6BFF304D6CAB0C21E9D20232A3EEC994BC3B47ED72` |
| `03-data.sql` | `DC21EC70CD3B145B94E562B7DE1D61054AF3A9EAF14A0D2D3D3ACF01B9197699` |

Path: `.local-backups/rc4-production-cutover/20260801-210850/` (gitignored).

---

## Stop conditions (abort before migrate)

1. Backup missing, empty, hash mismatch, or restore verification regresses to unverified
2. Migration history divergence (remote-only orphans / conflicting versions)
3. Destructive migration not approved (DROP TABLE/COLUMN, TRUNCATE, DISABLE RLS, destructive casts)
4. Linked project ref ≠ `pyeowxvacgypohrbvgee`
5. Linked remote migration tip changes during preparation without re-review
6. Missing Founder / operator approval (`FOUNDER_PRODUCTION_GO` + `EXECUTE_PRODUCTION_MIGRATIONS`)
7. Outside approved maintenance window
8. Working tree / SHA no longer contains the reviewed pending migration set

---

## Migration command (authorized window only)

Re-confirm immediately before apply:

```text
npx supabase projects list          # linked == pyeowxvacgypohrbvgee
npx supabase migration list --linked
# Remote tip must still be 20260730290000 (or documented re-baseline)
```

Apply **ordered** pending migrations via approved CLI path only, for example:

```text
npx supabase db push --linked
```

(or the project’s equivalent forward-only apply that records versions in remote history)

**Forbidden:** SQL Editor ad-hoc DDL; partial out-of-order applies; skipping dump verification.

---

## Post-migration validation

1. `npx supabase migration list --linked` — remote tip **`20260801180000`**; no pending in range
2. Confirm columns exist: `supplier_invoices.due_date`, `hr_employees.employee_number`
3. API smoke (read-only + safe authenticated checks per smoke-test owner):
   - `/healthz`, `/readyz`
   - `/api/v1/branches`, `/api/v1/menu/catalog`
   - Prior `42703` admin paths for invoices / HR employees
4. Unauthenticated admin still **401**
5. Optional: redeploy health-probe fix (`1c8894d` or merge) under separate deploy authorization — **not required to complete schema alignment**

---

## Rollback decision tree

```text
Migrate fails mid-way
  → STOP further applies
  → Capture CLI error (redact secrets)
  → Assess: remote history versions applied vs failed
  → Prefer forward-fix if remaining migrations are safe and DB consistent
  → Else Founder+rollback owner: restore from logical dump into recovery path
       (Free plan: no PITR — logical restore only; expect downtime)

Post-migrate app errors
  → If schema tip correct but app old: keep schema; fix/redeploy app
  → If bad data mutation (none expected in this range): restore from dump
  → If extension/index lockout: wait/cancel backend queries; do not DROP blindly

App redeploy/restart
  → Render API: restart/redeploy only if authorized
  → Vercel frontend: no feature deploy; restart only if needed for config
  → Health-probe fix: separate authorize-to-deploy after schema GO if desired
```

---

## Smoke-test sequence (post-GO)

1. Frontend home **200**
2. `/healthz` **200**, `/readyz` **200**
3. Branches + menu catalog **200**
4. Admin without token **401**
5. Authenticated Owner/admin: supplier invoices list (no `due_date` 42703)
6. Authenticated HR: employees list (no `employee_number` 42703)
7. Spot finance/loyalty read endpoints previously green
8. Watch error logs **T+60** (named on-call)

---

## App redeploy / restart plan

| Component | Prep recommendation |
| --- | --- |
| Database | Apply migrations only after GO |
| API (Render) | Stay on `1d64895` unless separate deploy authorized; restart if poolers sticky after migrate |
| Website (Vercel) | No feature deploy |
| Health probe fix | Validate locally (done); deploy only with explicit authorization |

---

## Preparation gates (this session)

| Gate | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm check` | PASS |
| `pnpm test` | PASS (db + backend 613) |
| `pnpm test:db` | PASS (798) |
| `pnpm rc1:gate` | PASS |
| `git diff --check` | PASS |
| Pending migration review | `SAFE_TO_APPLY_ORDERED` |
| Backup verification | `BACKUP_VERIFIED` |
| Migration history | Behind, not diverged |
| Production migrate applied | **NO** |

---

## Working tree classification (prep)

| Change | Class |
| --- | --- |
| `.gitignore` → `.local-backups/` | Intentional (keep) |
| `docs/testing/acceptance-evidence/rc4-production-cutover/*` | Evidence pack |
| RC4-7 Playwright screenshot/json dirty files | **Noise — do not commit** |
| Stashes `stash@{0}` RC4-7 / `stash@{1}` RC4-11 | **Preserved** |

---

## Authorization required next

Exact Founder block (fill real values), then separately:

```text
EXECUTE_PRODUCTION_MIGRATIONS
```

during the approved window, with project ref and backup hashes re-confirmed.
