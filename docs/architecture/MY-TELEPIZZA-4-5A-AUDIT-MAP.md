# Sprint 4.5A — Repository audit map (My Telepizza)

Concise inventory used for implementation. Status: **available** / **partial** / **missing**.

| Area | Status | Notes / files |
|---|---|---|
| Auth + return path | available | `AuthContext`, `auth-redirect.ts`, `/login?next=` |
| Users/profile API | partial | `/auth/me` profile; `customers` not hub-linked |
| Addresses DB/API | missing | Device drafts only; proposal docs |
| Preferred branch DB | missing | Device `BranchContext` only; proposal docs |
| Orders + status logs | available | Create/quote/track; hub list still device/phone-matched |
| Branches | available | `GET /branches`, navbar picker |
| Account Center (PRs #57–59) | available → elevated | Reused as `/my-telepizza` |
| Tracking | available | `/track`, guest phone gate preserved |
| Cart/checkout | available | Guest path preserved |
| Catalog API | available | Reorder price refresh via `lib/reorder.ts` |
| Payment prefs | missing | Honest “not live” for JazzCash/EasyPaisa/cards |
| Notifications prefs | missing | Coming soon toggles |
| Loyalty/coupons | missing | Coming soon + future architecture note |
| Nav | updated | Home / Menu / Deals / Cart / My Telepizza |
| WhatsApp | available | Support + order messaging (`0304-1110495`) |

**Risks deferred honestly:** cloud addresses, preferred-branch sync, cross-device order history, loyalty ledger.
