# RC4-2 Performance

- Server-side aggregation with paginated order fetches (`PAGE_SIZE=1000`, `MAX_ROWS=20000`)
- Date range capped at 93 days
- Helper indexes: `orders(branch_id, created_at, status)`, `payments(order_id, status)`
- Module snapshots computed once per request; Owner workspace iterates domain modules sequentially to avoid N+1 fan-out storms against Supabase
- Exports built from already-computed envelopes (no second browser pass)
- No client-side metric recalculation
