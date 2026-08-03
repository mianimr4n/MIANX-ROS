# POLISH-03 — Operations workspace contract

Shared presentation contract for restaurant operations Admin routes.

## Components

- `OperationsWorkspaceHeader` — eyebrow, title, description, active branch, maturity badge, primary task, live label, actions
- `OperationsDeferredNote` — single collapsed disclosure for deferred Phase 2 capabilities
- Maturity values: `LIVE` | `PARTIAL_LIVE` | `FOUNDATION`

## Per-page requirements (presentation)

| Element | Rule |
| --- | --- |
| Title | One clear workspace name (shell owns `h1`; header uses styled title) |
| Primary task | Exactly one operational task statement |
| Branch | Active branch from POLISH-01 shell context |
| Maturity | Honest LIVE / Partial live / Foundation |
| Deferred | One note; not repeated stub buttons |
| States | Rely on existing `OperationalStatusBanner` + domain empty/error patterns |

## Applied routes

Orders, Kitchen ERP, Kitchen board/KDS, Delivery, POS, Live Floor, Reservations, Waitlist, WhatsApp (attribution header).
