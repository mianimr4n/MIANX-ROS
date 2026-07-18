# Future architecture — Telepizza Rewards / offers (not implemented)

**Status:** Design note only — **no migrations** in Sprint 4.5A.  
**UI:** My Telepizza shows “Coming soon” / “Offers will appear here” — no fake points.

## Suggested future model (when approved)

1. **Ledger** — `loyalty_accounts` (per customer) + `loyalty_ledger_entries` (earn/burn, order_id, reason)
2. **Offers** — `offers` catalog (window, branch scope, stack rules) + `offer_redemptions`
3. **Coupons** — replace free-text `couponCode` notes with validated codes tied to offers
4. **API** — read balance / eligible offers; redeem only via quote+create path (server prices)
5. **RLS** — customers read own ledger/redemptions; writes via service_role only

## Principles

- No client-authoritative points or discounts
- No % uplift claims in customer UI
- Guest checkout remains available without rewards
