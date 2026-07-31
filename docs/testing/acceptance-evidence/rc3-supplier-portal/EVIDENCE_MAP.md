# RC3 Supplier Portal — Evidence Map (updated vs PR4 brief)

**Branch:** `feature/rc3-supplier-portal`
**Base:** `origin/main` @ `79e0674` (Loyalty+Marketing PR #146 MERGED)
**Confirmed:** not branched from loyalty/workforce/finance/kitchen feature branches

## REUSE
| Asset | Notes |
| --- | --- |
| `suppliers`, `purchase_orders`, GRN, invoices/payments | Admin procurement LIVE |
| Auth JWT + `AuthPrincipal` | Same stack; never trust metadata |
| Staff createUser pattern | Portal provisioning (new accounts only) |
| Branch scope | No `organizations` table — supplier scope = `suppliers.branch_id` |

## IMPLEMENTED
| Asset | Notes |
| --- | --- |
| `supplier_portal_users` + lifecycle | invited/active/suspended/deactivated (hardening) |
| Granular `supplier.*` permissions | portal.access, po read/respond, documents, profile |
| `purchase_order_lines` / responses / delivery refs / documents | Foundation + hardening |
| Idempotency on responses | `uq_po_responses_idempotency` |
| `/api/v1/supplier-portal/*` | Separate action endpoints |
| `/supplier/*` shell + `/supplier/login` | Distinct from admin |
| `/admin/supplier-operations` | Staff response queue |
| Owner supplier attention | Unacked / delayed / mismatch |

## STILL MISSING / BLOCKERS FOR COMPLETE
| Gap | Impact |
| --- | --- |
| Local Supabase migration apply | `supabase` CLI not available on this Windows host |
| Authenticated supplier Playwright journeys | No supplier fixture identity in RC1 handover |
| Screenshot matrix (390/768/1440) for all supplier states | Blocked on supplier auth fixture + running stack |
| Live RLS isolation matrix (Supplier A vs B) | Requires applied migrations + live DB |
| Binary document upload | Honestly unavailable (URL reference only) |
| Full receiving quantity summary on portal PO detail | GRN line variance not fully projected to supplier UI |

## DO NOT CREATE
Parallel PO/supplier masters, org table invention, fake scores, Production migrate/deploy.
