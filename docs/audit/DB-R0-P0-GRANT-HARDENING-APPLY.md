# DB-R0 apply record — P0 grant / DEFINER hardening

**Applied:** 2026-07-18 (UTC+5 session)  
**Linked project:** `pyeowxvacgypohrbvgee` (Telepizza)  
**Branch:** `fix/db-r0-p0-grant-hardening`  
**Migration:** `supabase/migrations/20260718130000_p0_harden_grants_and_definer_execute.sql`  
**Owner gate:** Formally approved for DB-R0 / P0 only

## Freeze position (unchanged)

```text
DATABASE FREEZE: BLOCKED — CORE RESTAURANT FOUNDATIONS REQUIRED
```

R0 complete does **not** unfreeze. Still blocked on DB-R1…R7 (profiles retirement, modifiers prod apply, restaurant tables/QR, dine-in, kitchen, POS foundations, RLS extensions).

## Pre-apply safety

- Confirmed linked ref = `pyeowxvacgypohrbvgee`
- Read-only grants snapshot via `npx supabase db query --linked` against `information_schema.role_table_grants` / `routine_privileges` (no credentials, no row data)
- Skipped `npx supabase db dump --linked --data-only` — dumps table rows, not privilege state; unsuitable for grants audit and risks shipping production data into the repo

### Pre-apply privilege counts (public tables)

| Grantee | TRUNCATE | REFERENCES | TRIGGER | INSERT | UPDATE | DELETE | SELECT |
|---|---:|---:|---:|---:|---:|---:|---:|
| anon | 13 | 13 | 13 | 13 | 13 | 13 | 13 |
| authenticated | 17 | 17 | 17 | 13 | 13 | 13 | 17 |
| service_role | 20 | 20 | 20 | 20 | 20 | 20 | 20 |

DEFINER helpers (`auth_user_email_exists`, `ensure_customer_profile_for_auth_user`, `finalize_staff_invite_acceptance`, `current_*`, etc.) were executable by `anon` before apply.

## Dry-run / isolation

Full dry-run would have pushed **two** local-only migrations:

1. `20260718120000_product_modifier_system.sql` (DB-R2 — **not** approved this turn)
2. `20260718130000_p0_harden_grants_and_definer_execute.sql` (DB-R0)

**Method used:** temporarily moved the modifiers file out of `supabase/migrations/`, dry-ran and pushed **P0 only**, then restored the modifiers file. No migration history repair.

Post-list:

| Version | Local | Remote |
|---|---|---|
| `20260718120000` (modifiers) | present | **not applied** (intentional) |
| `20260718130000` (P0) | present | **applied** |

Note for DB-R2: remote history has a version gap (P0 after modifiers timestamp). When applying modifiers, use an isolated/reviewed path; do not blindly `db push` without owner approval.

## Post-apply verification

- No `TRUNCATE` / `REFERENCES` / `TRIGGER` for `anon` or `authenticated` on any public table
- `anon`: catalog `SELECT` only on `branches`, `menu_categories`, `menu_items`, `menu_item_variants`; residual DML only on unmanaged `profiles` (DB-R1)
- `authenticated`: catalog + orders family `SELECT`; `users` `SELECT`/`UPDATE`; `roles`/`user_roles` `SELECT`; residual DML on `profiles` (DB-R1)
- Listed DEFINER helpers: **zero** `anon`/`PUBLIC` `EXECUTE` rows
- Privileged helpers executable by `service_role` only (plus designed `authenticated` for `current_*` helpers)

## Smoke (production)

| Check | Result |
|---|---|
| `GET https://telepizza-api.onrender.com/healthz` | 200 |
| `GET https://telepizza-api.onrender.com/readyz` | 200, `issues: []` |
| `GET https://telepizza-api.onrender.com/api/v1/menu/catalog` | 200 |
| `GET https://telepizza-website.vercel.app/` | 200 |

No `403` / `42501` observed on these read paths.

## Next step

**DB-R1** — retire unmanaged `public.profiles` + dead `handle_new_user` — pending separate owner approval. Do not apply modifiers (DB-R2) or restaurant foundation slices without explicit approval.
