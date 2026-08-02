# RC6-QA-02 — Owner path matrix

**Baseline:** `1b3a44a9512be21d5a346b8e707a379ead4b3497`

## Previous vs expanded

| Path / behavior | RC5-QA-01 | RC6-QA-02 |
| --- | --- | --- |
| `/admin/login` | Yes | Yes |
| `/admin/dashboard` | Yes | Yes |
| `/admin/branch` | No | Yes (shell + heading) |
| `/admin/orders` | No | Yes (shell + heading) |
| `/admin/kitchen` | No | Yes (shell + heading) |
| `/admin/delivery` | No | Yes (shell + heading) |
| `/admin/kitchen-dashboard` | No | Yes (KDS shell landmarks) |
| `/admin/reports` | Deferred | **Included** |
| Session refresh on protected route | No | Yes (`/admin/orders`) |
| Sign out → login | No | Yes |
| Post-logout protected gate | No | Yes (login **or** Staff access required) |
| Authenticated dashboard axe spot-check | No | Yes (critical/serious) |

## Assertion style

- Accessible roles / stable headings / landmarks
- No volatile counts, order numbers, timestamps, seed IDs, or customer details
- No mutation clicks (create/place order, menu update, inventory, etc.)
- Network/pageerror guards on app/API/auth 5xx

## Excluded (intentionally)

| Path / area | Reason |
| --- | --- |
| Finance / HR / Loyalty deep panels | Out of QA-02 acceptance; higher flake / mutation risk |
| POS / CRM / Inventory write flows | Mutation workflows excluded (Q-04) |
| Production Owner smoke | Forbidden — local ephemeral only |

## Post-logout gate note

Product behavior after Sign out + revisit `/admin/dashboard` may settle on `/admin/login` **or** show AdminShell **Staff access required** (often at `/admin/home/staff`). Suite asserts absence of authenticated Admin modules nav and Owner Command Center heading.
