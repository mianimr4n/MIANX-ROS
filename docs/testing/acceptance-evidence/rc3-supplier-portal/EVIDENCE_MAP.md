# RC3 Supplier Portal — Evidence Map (updated vs PR4 brief)

**Branch:** `feature/rc3-supplier-portal`
**Base:** `origin/main` @ `79e0674` (Loyalty+Marketing PR #146 MERGED)
**Confirmed:** not branched from loyalty/workforce/finance/kitchen feature branches
**Slice decision:** `SUPPLIER_PORTAL_SLICE_COMPLETE` (see `FINAL_REPORT.md`)

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
| Granular `supplier.*` permissions | portal.access, PO read/respond, documents, profile |
| `purchase_order_lines` / responses / delivery refs / documents | Foundation + hardening |
| Idempotency on responses | `uq_po_responses_idempotency` |
| `/api/v1/supplier-portal/*` | Separate action endpoints |
| `/supplier/*` shell + `/supplier/login` | Distinct from admin |
| `/admin/supplier-operations` | Staff response queue |
| Owner supplier attention | Unacked / delayed / mismatch |
| Receiving status summary on PO detail | Staff GRN status; line qty remains staff SoT |
| Local migrations applied | `npx supabase` + `migration up --local` |
| Supplier A/B seed + isolation matrix | `scripts/seed-rc3-supplier-portal.mjs`, `rc3-supplier-isolation-matrix.mjs` |
| Authenticated Playwright + axe | `scripts/rc3-supplier-portal-qa.mjs` → screenshots + `qa-report.json` |

## EXPLICITLY DEFERRED (not COMPLETE blockers)
| Gap | Status |
| --- | --- |
| Binary document upload | Honestly unavailable — URL reference only |
| Supplier-facing GRN line qty variance | Deferred; staff SoT; status summary shipped |

## DO NOT CREATE
Parallel PO/supplier masters, org table invention, fake scores, Production migrate/deploy.
