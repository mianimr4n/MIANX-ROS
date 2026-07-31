# RC4-9 COGS Integration

## Decision: **B — COGS-ready domain event (DEFERRED GL posting)**

Finance account mapping has no `cogs` / inventory asset purpose. Creating half-working journals was rejected.

## Seam

Table `inventory_cogs_events`:

- `cogs_ready` / `cogs_reverse_ready`
- Idempotency keys
- Optional amount from `cost_price` when available
- `status = deferred` + `posting_deferred_reason`

Finance Phase 2 can consume these events later with balanced debit COGS / credit Inventory.
