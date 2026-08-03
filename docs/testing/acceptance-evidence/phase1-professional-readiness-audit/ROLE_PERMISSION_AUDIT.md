# Phase 1.1 — Role & permission audit

**Roles (`staff-access.ts`):** super-admin, branch-manager, kitchen, cashier, rider, customer-support, host, waiter  
**Also:** admin (config), supplier (portal)

**Sources:** `admin-access.ts`, `RC6_COMMAND_CENTER_ROLE_MATRIX.md`, D4 e2e evidence

## Representative expectations

| Role | Visible emphasis | Hidden/ownerOnly | Mutations |
| --- | --- | --- | --- |
| super-admin | Full nav | — | Broad |
| branch-manager | Branch home, ops | ownerOnly modules | Branch-scoped |
| kitchen | Kitchen board/ERP | Commerce/finance | Ticket transitions |
| cashier | POS / cashier home | Most ERP | POS |
| rider | Delivery home | Most ERP | Delivery status |
| host/waiter | Floor/reservations | Commerce | Floor |
| customer-support | Staff home | ownerOnly | Limited |
| supplier | `/supplier/*` | Admin ERP | PO respond |

## Findings

| ID | Severity | Issue |
| --- | --- | --- |
| P11-ROLE-01 | P2 | UI hide vs API deny must stay paired — add POLISH-QA matrix |
| P11-ROLE-02 | P2 | `admin` role omitted from some seeded UI lists |
| P11-ROLE-03 | P1 | Do not assume Super Admin UX equals all roles |

Local headed multi-role certification = POLISH-QA (not completed as Production mutation-free deep matrix in this docs audit).
