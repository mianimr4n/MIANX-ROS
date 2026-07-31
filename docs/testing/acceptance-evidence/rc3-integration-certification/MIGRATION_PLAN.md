# RC3 Integration — Migration Plan

## Scope

All repository migrations under `supabase/migrations/`, with RC3-era focus on:

- `2026073013*` … `2026073029*` foundations (HR, inventory, purchasing, loyalty, finance, AP, matching)
- `2026073101*` … `2026073113*` RC3 slice migrations (finance ops, workforce, loyalty ledger, coupons, marketing, supplier portal)

## Path A — Clean install

```bash
npx supabase db reset --local
```

Then re-apply role grants (known repo gap until migrated):

```sql
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
```

Evidence: `migration-clean-install.log`, `schema-validation.json`, `migration-certification.json`

## Path B — Upgrade

Ideal: restore latest pre-RC3 baseline dump, apply only RC3 sequence.

On this certification host: **no pre-RC3 dump restored**. Upgrade path recorded as **STATIC_ADDITIVE_REVIEW** of RC3 SQL (no DROP TABLE without IF EXISTS, no TRUNCATE, no DISABLE RLS in RC3 files) plus clean-install success as primary proof.

## Path C — Repeatability

Second `db reset --local` must succeed deterministically.

## Production

**Do not apply.** See `PRODUCTION_RUNBOOK.md`.

Estimated Production risk: **medium-high** (interdependent RPCs, finance posting, loyalty ledger, supplier RLS). Requires backup + maintenance window + smoke tests.
