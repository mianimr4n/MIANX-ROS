# RC4 Production Cutover — Backup Verification

**Backup timestamp (directory):** `20260801-210850`
**Project ref:** `pyeowxvacgypohrbvgee`
**CLI version:** Supabase CLI `2.111.0`
**Plan:** Free (no PITR / automatic backup) — logical dump required
**Gitignore:** `.local-backups/` (confirmed via `git check-ignore`)
**Verdict:** `BACKUP_VERIFIED` (disposable local restore spot-checks passed)

## Artifacts (not committed)

Directory: `.local-backups/rc4-production-cutover/20260801-210850/`

| File | Bytes | SHA-256 | Dump exit |
| --- | ---: | --- | --- |
| `01-roles.sql` | 297 | `25873CEC56A2CC6514E204F420231777F85C03DA818CAA7090CDCDFA89776ECD` | 0 |
| `02-schema.sql` | 503729 | `8F0E7ACC5A9BB1E1738E3E6BFF304D6CAB0C21E9D20232A3EEC994BC3B47ED72` | 0 |
| `03-data.sql` | 435404 | `DC21EC70CD3B145B94E562B7DE1D61054AF3A9EAF14A0D2D3D3ACF01B9197699` | 0 |

Companion stderr logs from dump/restore are local only and must not be committed (may contain tooling noise; never paste connection secrets into evidence).

## Commands used (intent)

```text
npx supabase db dump --linked --role-only  -f .local-backups/.../01-roles.sql
npx supabase db dump --linked --schema-only -f .local-backups/.../02-schema.sql
npx supabase db dump --linked --data-only   -f .local-backups/.../03-data.sql
```

Do not use `--dry-run` in shared logs (CLI may print connection material).

## Static dump checks

| Check | Result |
| --- | --- |
| Files exist and non-empty | PASS |
| Hashes recorded | PASS |
| Directory gitignored | PASS |
| Schema contains `orders`, `users`, `suppliers`, `supplier_invoices`, `hr_employees`, `loyalty_accounts`, `journal_entries` | PASS |
| Schema dump mentions `due_date` / `employee_number` | **0** (matches Production drift) |
| Data dump uses `COPY ... FROM stdin` | PASS |

## Disposable restore verification

Performed into temporary database `rc4_cutover_backup_verify` on local Docker Postgres (`supabase_db_telepizza-platform`), then dropped.

Method: `docker cp` SQL files into container + `psql -f` (avoids PowerShell pipe corruption).

Prereq: create empty `extensions`/`auth`/… schemas before schema dump (Supabase dump assumes them).

| Spot check | Result |
| --- | --- |
| Schema restore error count (`^ERROR:`) | **0** (after prereq schemas) |
| Data restore error count (`^ERROR:`) | **0** |
| Public tables present (orders, users, suppliers, supplier_invoices, hr_employees, loyalty_accounts, journal_entries) | PASS |
| `supplier_invoices.due_date` | **absent** |
| `hr_employees.employee_number` | **absent** |
| Row counts observed | orders=3, users=1, branches=2; suppliers/invoices/hr/loyalty/journals=0 |
| Migration history table in dump | Not present in public schema dump (history remains via Supabase CLI / dashboard) |
| Production restore | **Not performed** |

## Documented restore command (disaster only — not for this prep)

```text
# 1) Provision empty Postgres 17+ (or temporary Supabase DB)
# 2) Create prerequisite schemas (extensions, auth, storage, …) as needed
# 3) psql -f 01-roles.sql
# 4) psql -f 02-schema.sql
# 5) psql -f 03-data.sql
# Prefer docker cp + psql -f over shell pipes on Windows.
```

Production restore requires Founder + rollback-owner decision; Free plan has no PITR.
