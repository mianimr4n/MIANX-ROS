# Request inventory (summary)

| Family | Mechanism | Poll | Cancel | Notes |
| --- | --- | --- | --- | --- |
| Owner dashboard | Multiple `useOperationalData` | mixed 30–120s | Abort on deps | Distinct endpoints — not identical duplicates |
| Orders | `useOperationalData` | none | Abort | Filter/branch deps |
| KDS / Kitchen | tickets poll 8s | yes | Abort + hidden pause | One poller per hook instance |
| Delivery | assignments 8s | yes | Abort + hidden pause | |
| Menu/Inventory/Purchasing/CRM/HR/Finance/Reports/Settings | operational reads | mostly none | Abort | |
| Auth `/auth/me` | AuthContext generation id | n/a | stale ignore | |

Identical concurrent coalescing: `shareIdenticalRead(key, factory)` — opt-in; distinct branch/date keys never shared.
