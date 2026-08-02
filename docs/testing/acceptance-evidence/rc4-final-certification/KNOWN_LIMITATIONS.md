# RC4 known limitations

**As of:** 2026-08-02 — Production tip SHA `e5c6daf`

## Blocking for RC4 certification

None. Security closeout is complete — see `SECURITY_CLOSEOUT.md`.

## Non-blocking operational notes

| ID | Limitation | Notes |
| --- | --- | --- |
| OPS-1 | Free-plan Supabase | Logical dumps only; no PITR |
| OPS-2 | Local grants gap | Fresh local `supabase start` still needs public grants until migrations include them |
| OPS-3 | Render log export | Session often lacks Render API key; smoke uses authenticated API responses |
| OPS-4 | Some Analytics modules | Deferred/unavailable metrics remain honest (by design) |
| OPS-5 | Supplier A/B RLS matrix | Partial Production credential coverage historically noted |

## Closed this cycle

| ID | Item | Resolution |
| --- | --- | --- |
| SEC-1 | Security rotation | `SECURITY_CLOSEOUT_COMPLETE` |
| CUT-2 | Health-probe anon headers | PR #162 |
| CUT-4 | Analytics `order_items.name` 42703 | PR #163 |
| AUTH-1 | Password recovery landing | PR #165 @ `e5c6daf` |
