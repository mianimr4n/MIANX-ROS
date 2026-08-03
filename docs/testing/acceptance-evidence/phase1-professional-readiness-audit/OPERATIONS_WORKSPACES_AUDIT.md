# Phase 1.1 — Operations workspaces audit

| Workspace | Route | Maturity | Key honesty |
| --- | --- | --- | --- |
| Orders | `/admin/orders` | PARTIAL_LIVE | Transitions need order.manage; duplicate branch filter |
| Kitchen ERP | `/admin/kitchen` | PARTIAL_LIVE | Stations Planned for Phase 2 (filters) |
| Kitchen board | `/admin/kitchen-dashboard` | PARTIAL_LIVE | Role home KDS |
| Delivery | `/admin/delivery` | PARTIAL_LIVE | Assign/status LIVE; GPS/POD/COD/ETA/zones **deferred** (POLISH-03 collapsed chrome) |
| POS | `/admin/pos` | FOUNDATION | Draft/print Planned; Foundation header |
| Live floor | `/admin/floor` | FOUNDATION | Table service |
| Reservations / Waitlist | `/admin/reservations` `/admin/waitlist` | FOUNDATION | Manage perms |
| WhatsApp | `/admin/whatsapp` | PARTIAL_LIVE | Order-derived only; POLISH-03 attribution framing |

## Delivery distinction (required)

| Present (partial) | Deferred (Phase 2+) |
| --- | --- |
| Basic assignment, rider roster, status transitions | Full rider lifecycle, POD, COD, GPS, ETA, zones, SLA, shifts, return-to-branch |

## WhatsApp distinction (required)

| Present | Deferred |
| --- | --- |
| Orders with `order_source=whatsapp` | Provider connection, message store, inbox, unread, agent assign, templates, webhooks |

## Findings

| ID | Severity | Issue | Status |
| --- | --- | --- | --- |
| P11-OPS-01 | P1 | Delivery Phase 2 actions still visible as disabled buttons — prefer remove or collapse | **Resolved POLISH-03** |
| P11-OPS-02 | P1 | WhatsApp page can imply inbox; banner must stay primary | **Resolved POLISH-03** |
| P11-OPS-03 | P2 | Kitchen station filter “Planned” clutters filter bar | **Resolved POLISH-03** |
| P11-OPS-04 | P2 | Legacy `/ops/*` parallel surface vs Admin ERP — discoverability/confusion | Residual |

## Assessment

Operations are **usable for core flows** with honest Phase 2 stubs in many places; professionalization must reduce stub clutter and reinforce partial-system framing.
