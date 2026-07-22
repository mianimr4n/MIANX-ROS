# Local Health Check

## Command

```bash
pnpm local:health
# → node scripts/local-health-check.mjs
# → writes docs/testing/acceptance-evidence/local-health-check.json
```

## Status meanings

| Status | Meaning |
| --- | --- |
| PASS | Verified OK for local development |
| FAIL | Blocker — local ERP testing unsafe or unavailable |
| WARNING | Usable with documented limitation |
| UNKNOWN | Not probed / needs manual confirmation |

## Checks covered

- Env guard (cloud binding detection)
- Backend / website Supabase URL class (loopback vs cloud)
- Key presence (not values)
- `GET /healthz`, `GET /readyz`
- Website `:3000`
- Local Supabase REST `:54321`, Studio `:54323`
- Realtime usage honesty (polling vs channels)
- Storage / payments / WhatsApp / email notes

## Founder gate

Local ERP testing requires:

1. `pnpm local:guard` → PASS  
2. `/readyz` → `supabaseUrl` is `http://127.0.0.1:54321` (or localhost)  
3. Local Studio reachable  
4. Seed accounts exist (`pnpm local:seed`)

If API process was started before rewriting `.env.local`, restart the API — file change alone does not reload Node env.
