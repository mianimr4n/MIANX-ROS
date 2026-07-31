# RC4-9 Consumption Event Decision

## Decision

**Sole consume trigger: kitchen ticket → `preparing`** via `kitchen_ticket_set_preparing_atomic`.

## Why

- Already implemented (REQ-KIT-012)
- Idempotent when ticket already preparing
- Order `completed` / kitchen `ready`/`completed` would double-consume if also hooked

## Not consumed on

- Order create/confirm/complete
- Kitchen accepted/ready/completed
- Payment void alone

## Semantics

- Unmapped menu items: skipped + `missing_recipe` exception row
- Insufficient stock: whole transition rolls back (`INSUFFICIENT_STOCK`); negative stock not allowed
- Consumption event idempotency key: `kitchen_ticket:{id}:consume`
