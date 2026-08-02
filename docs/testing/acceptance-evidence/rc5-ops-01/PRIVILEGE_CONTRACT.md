# RC5-OPS-01 — Privilege contract

**Baseline SHA:** `1a3e61ff08d8dd521158c765f3867b89136d0b1e`  
**Empirical status:** `FRESH_LOCAL_PRIVILEGE_CONTRACT_PASS`

## Layers

| Order | Migration | Intent |
| --- | --- | --- |
| 1 | `20260714120000_grant_public_access.sql` | Baseline: `USAGE` on `public`; table SELECT/INSERT/UPDATE/DELETE; sequence USAGE/SELECT; default privileges for future objects — for `anon`, `authenticated`, `service_role` |
| 2 | `20260718130000_p0_harden_grants_and_definer_execute.sql` | Harden: revoke TRUNCATE/REFERENCES/TRIGGER from clients; catalog SELECT-only for anon/authenticated; lock down identity/ops tables; selective authenticated SELECT; service_role DML; DEFINER EXECUTE lockdown; tighten default privileges |
| 3 | Later feature migrations | Selective per-table / function grants compatible with harden design |

## Operator rules

1. Fresh local start/reset applies migrations automatically.
2. Normal workflow does **not** include blanket manual `GRANT`.
3. Persistent `42501` after clean reset → investigate; do not paper over.
4. Production privilege changes require Founder authorization + migration review.

## Roles (intended access summary)

| Role | Intended surface (high level) |
| --- | --- |
| `anon` | Public catalog read (e.g. branches/menu); no ops/identity writes; no TRUNCATE |
| `authenticated` | Broader SELECT where granted; limited profile UPDATE; no blanket ops writes |
| `service_role` | Service/API privileged DML (backend) |

Exact table matrix evolves with feature migrations; harden migration is the client-surface baseline.
