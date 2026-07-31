# COGS Integration

Consumes RC4-9 `inventory_cogs_events` (`cogs_ready` / `cogs_reverse_ready`).

| Field | Value |
| --- | --- |
| Debit / Credit | COGS ↔ Inventory (`cogs` / `inventory_asset` mappings) |
| Amount | Event amount from `cost_price` — refuse if null (no fabrication) |
| Idempotency | Event `idempotency_key` + finance_postings |
| Failure | Leave/mark exception `cogs_event_pending`; safe retry |
