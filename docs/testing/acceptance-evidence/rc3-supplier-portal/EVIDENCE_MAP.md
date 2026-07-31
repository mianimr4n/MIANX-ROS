# RC3 Supplier Portal — Evidence Map

**Branch:** `feature/rc3-supplier-portal`  
**Base:** `origin/main` @ `79e0674` (Loyalty+Marketing PR #146 merged; CI Typecheck and test PASS)  
**Finance / Workforce / Loyalty+Marketing:** not modified on this branch beyond merged main  

## REUSE
| Asset | Notes |
| --- | --- |
| `suppliers`, `purchase_orders`, GRN, invoices/payments | Admin procurement LIVE via `purchasing.manage` |
| `backend/api/src/services/purchasing/management.ts` | Keep admin path; portal is separate module |
| Auth JWT + `AuthPrincipal` | Same stack as staff/rider; never trust metadata for role |
| Staff invite createUser pattern | Portal provisioning mirrors service-role user create |

## NEW (verified gaps)
| Asset | Why |
| --- | --- |
| `users.user_type = supplier` + `supplier` role / `supplier.portal` | No supplier identity today |
| `supplier_portal_users` | Link auth user ↔ supplier with isolation |
| `purchase_order_lines` | PO items/qty/price missing (header-only) |
| `purchase_order_responses` | No acknowledge/accept/amend/reject |
| `supplier_documents` | No portal document metadata |
| `purchase_order_delivery_refs` | No supplier dispatch/invoice reference |
| `supplier_portal_events` | Audit for responses/docs/provisioning |
| `/api/v1/supplier-portal/*` | Supplier-scoped APIs (not admin purchasing) |
| `/supplier` UI | No supplier-facing portal |

## DO NOT CREATE
Parallel supplier masters, fake performance scores, supplier self-approval of POs, Production migration apply.
