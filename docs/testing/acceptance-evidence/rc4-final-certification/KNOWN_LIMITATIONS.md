# RC4 known limitations

**As of:** 2026-08-02 — Production tip SHA `2f0e432`

## Blocking for RC4 certification

| ID | Limitation |
| --- | --- |
| SEC-1 | **Security rotation pending** — Owner password / exposed key replacement / revocation not evidenced (`SECURITY_CLOSEOUT.md`) |

## Non-blocking operational notes

| ID | Limitation | Notes |
| --- | --- | --- |
| OPS-1 | Free-plan Supabase | Logical dumps only; no PITR |
| OPS-2 | Local grants gap | Fresh local `supabase start` still needs public grants until migrations include them |
| OPS-3 | Render log export | Session often lacks Render API key; smoke uses authenticated API responses as operational evidence |
| OPS-4 | Some Analytics modules | Deferred/unavailable metrics remain honest (by design); not a schema 42703 |
| OPS-5 | Supplier A/B RLS matrix | Partial Production credential coverage historically noted in cutover RLS notes |

## Explicitly closed this cycle

| ID | Item | Resolution |
| --- | --- | --- |
| CUT-2 | Health-probe anon headers | PR #162 merged; live on `2f0e432` |
| CUT-4 | Analytics `order_items.name` 42703 | PR #163 merged+deployed; Production Analytics smoke PASS |
| CUT-HR | `employee_number` 42703 | Cutover smoke PASS |
| CUT-INV | `due_date` 42703 | Cutover smoke PASS |
