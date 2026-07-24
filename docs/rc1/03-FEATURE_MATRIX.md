# RC1 Feature Matrix

Legend: **C** = Complete for RC1 · **P** = Partial · **F** = Foundation UI · **X** = Placeholder / Missing

| Capability | Customer | Owner | Branch Manager | Kitchen | Cashier | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Browse menu | Yes | — | — | — | — | C |
| Place order (WhatsApp / site path) | Yes | — | — | — | — | P |
| Track / guest order access | Yes | — | — | — | — | P |
| Admin login / shell | — | Yes | Yes | Yes | Yes | C |
| RBAC nav + gates | — | Yes | Yes | Yes | Yes | C |
| Operations dashboard | — | Yes | Limited | No | No | P |
| Orders list / transition | — | Yes | Scoped | View via kitchen | Scoped | P |
| Kitchen tickets | — | ERP board | Shared API | KDS | Denied | P |
| POS create order | — | Yes | Policy | No | Yes | P |
| Delivery dispatch | — | Yes | Yes | No | Limited | P |
| CRM / Loyalty / WhatsApp admin | — | Derived | Limited | No | No | P |
| Menu catalog read | — | Yes | — | — | POS | P |
| Menu write / publish | — | No API | — | — | — | X |
| Inventory / Purchasing / Finance / HR ledgers | — | Foundation UI | Foundation tiles | — | — | F |
| Settings persistence | — | Foundation | — | — | — | F |
| AI Command Center | — | ComingSoon | — | — | — | X |
| Promotions / Support admin | — | ComingSoon | — | — | — | X |
| KDS bump / recall / stations | — | — | — | No | — | X |
| Quality gate `pnpm rc1:gate` | — | — | — | — | — | C |

## Honesty rule

Foundation and ComingSoon surfaces must not be described as fully operational ERP in release communications.
