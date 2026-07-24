# RC1 Architecture Summary

## Positioning

```text
Telepizza Pakistan
        ↓
Enterprise Restaurant Operating System (flagship)
        ↓
Powered by Mianx.ai (reusable platform direction)
```

RC1 implements Telepizza as the first production-shaped tenant surface. Multi-tenant packaging for other verticals remains a platform direction, not an RC1 deliverable.

## Runtime topology

| Layer | Location | Role |
| --- | --- | --- |
| Customer + Admin UI | `apps/website` (React 19 + Vite) | Browser app; Admin ERP + customer site |
| Backend API | `backend/api` (Express) | Thin authenticated layer over Supabase |
| Data | `supabase/` (Postgres + Auth + RLS) | Source of truth for ops and identity |
| Quality | `scripts/rc1*`, `tests/website`, Vitest | RC1 verification |

## Trust boundaries

1. **Browser** holds session tokens; UI gates are UX only.
2. **API** verifies JWT / principal and enforces role/permission + branch scope.
3. **Supabase service_role** is used by the backend for privileged operations; RLS remains defense-in-depth for PostgREST clients.
4. **Guest order track/cancel** uses phone proof + rate limits (residual risk documented).

## Admin workspace model

| Persona | Home | Scope |
| --- | --- | --- |
| Owner / Super-admin | Owner ERP modules | Broad permissions; all-branch where policy allows |
| Branch Manager | `/admin/branch` | Assigned branch ops; shared kitchen API access |
| Kitchen Manager | `/admin/kitchen-dashboard` | Branch-scoped KDS |
| Cashier | POS / order capabilities | Kitchen execution denied |
| Customer / Anonymous | Public site | Admin APIs denied |

## AI posture (RC1)

Governed AI (Recommendation → Human Approval → Audited Action) is the **product direction**. RC1 ships **rule-based insight panels** only. `/admin/ai-command-center` is ComingSoon. No autonomous agent runtime in RC1.
