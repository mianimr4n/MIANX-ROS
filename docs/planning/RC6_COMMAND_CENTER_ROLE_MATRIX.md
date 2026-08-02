# RC6 Command Center Role Matrix

**Status:** Proposed planning contract (RC6-DASH-00)
**Baseline tip:** `da99875…`
**Authority note:** Backend authz + RLS are enforcement; this matrix is product intent.

Legend: V=view · D=drill-down · C=create draft · A=approve · E=execute · F=configure · X=export · U=audit · S=sensitive field · B=branch-scoped only

---

## Roles in scope

Owner · Branch Manager · Kitchen Manager · Delivery Manager · Dispatcher · Cashier · HR · Finance · Support Agent · Auditor · Rider

---

## Domain matrix (summary)

| Domain | Owner | BM | Kitchen | Deliv Mgr | Dispatcher | Cashier | HR | Finance | Support | Auditor | Rider |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Exception Center | V D C A | V D C B | V D B | V D B | V D B | V limited B | V D | V D A | V D | V U | — |
| Sales/Orders KPIs | V D X | V D B | — | — | — | V limited | — | V D X | — | V U | — |
| Kitchen live | V D | V D B | V D E B | — | — | — | — | — | — | V | — |
| Delivery live | V D | V D B | — | V D E B | V D E B | — | — | — | V D | V | V E self |
| Rider roster | V D | V D B | — | V D E B | V D B | — | V | — | — | V | V self |
| Cash / COD | V D A | V D A B | — | V D | — | V C E B | — | V D A X | — | V U | V self COD |
| Inventory | V D | V D E B | V limited | — | — | — | — | V | — | V | — |
| Purchasing | V D A | V D C B | — | — | — | — | — | V A | — | V U | — |
| HR / attendance | V D | V D B | — | — | — | — | V D E | — | — | V U S | — |
| Payroll | V A | — | — | — | — | — | V C | V A | — | V U S | — |
| Finance GL | V D | limited | — | — | — | — | — | V D E | — | V U S | — |
| Refunds | V A | V C B | — | — | — | V C B | — | V A | V C | V U | — |
| Settings low-risk | V F | V F B | — | F delivery B | — | — | — | — | — | V U | — |
| Settings high-risk (tax/roles/providers) | V F A | — | — | — | — | — | — | F tax A | — | V U | — |
| AI recommendations | V C | V C B | — | — | — | — | — | — | — | V | — |
| Audit export | V X | limited | — | — | — | — | — | V X | — | V X U | — |

---

## Separation of duties (required)

| Flow | Rule |
| --- | --- |
| Refunds | Initiator ≠ approver above threshold |
| Cash variance | Counter ≠ approver above limit |
| Payroll | Preparer ≠ approver |
| Purchasing | Requester ≠ approver above threshold |
| Tax mapping | Dual control for Production activate |
| High-value configuration | Re-auth + dual approval |
| Role/permission changes | Owner + audit; no self-escalation without second party **PROPOSED** |
| Rider cash settlement | Rider ≠ final approver |

---

## Current enforcement anchors

- `admin-access.ts` / seeded permissions (`admin.access`, `delivery.*`, …)
- API middleware authz
- Deliveries RLS (select policies; writes via API/service role)

Gaps in Settings Users & Access (READ-ONLY) mean role **administration** must not be claimed complete.
