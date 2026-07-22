# Development Environment Checklist (Founder)

**Date:** 2026-07-22  
**Change control:** No commit / push / PR / merge / deploy / production mutation  

| Item | Result | Evidence |
| --- | --- | --- |
| Cloud disconnected (env files) | **PASS** | `pnpm local:guard` → loopback bindings |
| Production safe (no cloud mutation from seed) | **PASS** | Seed refuses `*.supabase.co` |
| Local auth | **PASS** | Local GoTrue + seeded staff |
| Local database | **PASS** | `supabase start` migrations applied |
| Local storage service | **PASS** | Storage container up with stack |
| Local realtime service | **PASS** | Service up; app uses polling (WARNING for channel UX) |
| Seed working | **PASS** | `pnpm local:seed` — 6 accounts + 5 orders |
| Kitchen testing possible | **PASS** | Queued ticket on `LOCAL-CONFIRMED-001` |
| Cashier testing possible | **WARNING** | Cashier role seeded; deep POS fixtures partial |
| Delivery testing possible | **WARNING** | Assigned delivery on ready sample; full rider loop partial |
| Inventory testing possible | **WARNING** | No full stock ledger seed |
| Finance testing possible | **WARNING** | No full ledger seed |
| OMS confirmation possible | **PASS*** | *Requires API `/readyz` on loopback after restart |
| Everything local | **WARNING** | Env+DB local; process restart discipline required |
| Mail / WhatsApp / Payments live disabled | **PASS** | Mailpit; no outbound WA/payment gateways in API |
| Documentation set | **PASS** | `docs/infrastructure/*` |

## Blocking until operator confirms

After rewriting env, **API must be restarted** so `/readyz.supabaseUrl` is `http://127.0.0.1:54321`.  
If `/readyz` still shows `*.supabase.co`, treat OMS/Kitchen confirm as **FAIL — unsafe**.
