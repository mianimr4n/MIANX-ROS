# RC6 Phase 1 — Deployment classification

**Range:** `v1.4.0` (`96f1e80…`) → Production website commit `830dbc8…`
**Feature tip:** `b14163c…` (PR #191 QA-04)
**Closeout:** `830dbc8…` (PR #192 docs/evidence; `apps/website` empty vs tip)

| Surface | Classification | Evidence |
| --- | --- | --- |
| Website runtime files | YES (through QA-04) | Owner logout guard on `apps/website` (`AdminDashboard.tsx`) |
| Website closeout commit | docs-only vs tip | empty `apps/website` diff |
| Backend runtime | NO intentional change | `backend/api` empty in RC6 range; Render observed SHA tracks `main` |
| Database migration | NO | `supabase/migrations` empty in RC6 range |
| Production SQL | NO | none |
| Provider / secrets | NO | none |
| Vercel website (current) | READY production | alias → `dpl_BtPH8…` → `830dbc8…` |
| Vercel website (QA-04 historical) | `ALREADY_ACTIVE` then | alias → `dpl_Hi35GY…` → `b14163c…` |
| Render/API deploy by Phase 1 | NOT PERFORMED | observed SHA may track `main`; no RC6 backend code delta |
| Authenticated Owner smoke | PASS | `ok: true`, `failCount: 0` |

**Conclusion:** Website-only cutover; `BACKEND_RUNTIME_UNCHANGED` for RC6 Phase 1 intent; released as `v1.5.0`.
