# Northern Bypass — D3 Floor & Table Service Setup Checklist

> Status: **BLOCKED — awaiting founder inputs and on-site validation.**
> No production values are invented here. Fill the Founder Input Template, then a
> configuration engineer will enter values through the Admin Floor Plan / Table
> Management workspaces (never by seeding migrations).

Branch: `northern-bypass` (currently `status = coming-soon`, so live seating is
correctly rejected with `BRANCH_NOT_OPERATIONAL` until the branch is switched to
`operating`).

## Configuration steps (once inputs exist)
1. Set branch operating hours and `branch_booking_policies` (booking interval,
   default dining duration, min advance, max advance days, same-day cutoff,
   cancellation cutoff, grace period, no-show threshold, max online party size).
2. Create floors (`POST /admin/floor/floors`).
3. Create service areas per floor.
4. Create physical tables (number, capacity min/max, shape, position, accessible,
   high-chair) — via Floor Plan workspace.
5. Define permitted table combinations.
6. Add any launch blackout periods.
7. Provision staff: host/front-desk, waiters, cashier, kitchen users, manager,
   with `northern-bypass` branch membership and correct roles.
8. Generate QR labels where applicable.
9. Flip branch `status` to `operating` only after on-site validation.

---

## Founder Input Template (required — do not guess)

```yaml
northern_bypass:
  timezone:                  # IANA, e.g. Asia/Karachi — REQUIRED (no hard-coded assumption)
  floors: []                 # e.g. [{ code, display_name }]
  service_areas: []          # per floor: [{ floor_code, code, display_name }]
  tables: []                 # [{ floor_code, area_code, table_number, capacity_min, capacity_max, shape, accessible, high_chair }]
  combinations: []           # [{ code, table_numbers: [], min_party, max_party }]
  booking_policy:
    booking_enabled:
    online_booking_enabled:  # required true before /book accepts creates
    min_advance_minutes:
    max_advance_days:
    booking_interval_minutes:
    default_dining_minutes:
    max_online_party_size:
    same_day_cutoff:
    cancellation_cutoff_hours:
    grace_period_minutes:
    no_show_threshold_minutes:
    deposit_required:
    deposit_amount:
  notification_settings:
    email_enabled:
    email_from_address:
    email_from_name:
    provider_mode:           # disabled | sandbox | live | dev_smtp
  operating_hours: []
  blackout_periods: []
  staff:
    manager:
    hosts: []
    waiters: []
    cashiers: []
    kitchen: []
  payment_terminals: []      # device refs for card_terminal settlements
  devices: []
  qr_labels: []
```

Until every required value above is supplied and validated on site, Northern
Bypass production remains **BLOCKED**.

## Isolated local E2E (this pass)

| Check | Status |
| --- | --- |
| Temporary activate → seat → close | READY WITH LIMITATIONS (fixture only) |
| Restore `coming-soon` | READY |
| Production-ready claim | BLOCKED |
| Founder inputs complete | BLOCKED |
