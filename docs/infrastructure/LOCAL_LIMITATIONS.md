# Local Limitations

## Documented limitations (honest)

| Area | Limitation |
| --- | --- |
| One-command startup | `pnpm local` is a **checklist orchestrator**, not a full process supervisor that starts Supabase+API+Vite in one daemon |
| API env reload | Changing `.env.local` does not hot-reload Node; restart API after rewrite |
| Realtime channels | Local Realtime service runs, but Admin Kitchen/OMS use **polling**, not Supabase channel subscriptions |
| Storage uploads | Local Storage available; most menu assets are catalog/static — full upload UX not universally wired |
| Email | Local Auth uses **Mailpit** (`:54324`). No customer marketing SMTP |
| WhatsApp | No outbound WhatsApp Business API client. Customer site uses `wa.me` links. Admin WhatsApp is Foundation/order-derived |
| Payments | No Stripe/JazzCash/Easypaisa live clients in API source — treat as mock/Foundation |
| Inventory / Finance / HR / Loyalty deep seeds | Not fully interconnected in `local:seed` yet |
| Edge Functions | Not required for core admin smoke; empty by default |
| Windows analytics | Supabase analytics may warn about Docker TCP on Windows — non-blocking for ERP |
| Imgproxy / pooler | May show as stopped locally — non-blocking for core API path |
| Forced password rotation | Not enforced by product |
| Cloud backups | Prior cloud `.env.local` moved under `.tmp/` — operator must restore manually if needed |

## Unsupported / out of scope for this phase

- Replacing repository architecture with Docker Compose app stack  
- Production/staging mutation  
- Live payment charging  
- Live customer email / WhatsApp blast  
- Dashboard feature development (blocked until local env operational per phase charter)

## What is supported

- Isolated Local Supabase with migrations  
- Local Auth staff accounts  
- Local OMS confirm → kitchen ticket path (once API bound to loopback)  
- Env guard preventing accidental cloud ERP tests  
- Health report artifact for Founder review
