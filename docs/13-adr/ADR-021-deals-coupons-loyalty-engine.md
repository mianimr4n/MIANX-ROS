# ADR-021: Deals, Coupons & Loyalty Promotion Engine

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-16
**Implemented in:** `v2.1.0` (closes Phase 6 — Admin and ERP Core, Deals/Promotions surface)

---

## Context

Telepizza's promotions surface grew organically across three
subsystems, each with its own schema, RPCs, and admin endpoints:

1. **Coupons** (single-use discount codes) — added in Sprint "RC3"
   (`20260730250000_coupons_foundation.sql`, `20260731100000_coupon_redemptions.sql`).
2. **Marketing campaigns & consent** (bulk WhatsApp/SMS/email/push
   campaigns with explicit suppression management) — added in
   `20260731110000_marketing_campaigns_consent.sql` and deepened in
   RC4-11 (`20260801180000_rc4_loyalty_marketing_depth.sql`).
3. **Loyalty program** (points ledger, tier definitions, reward
   catalogue) — added in `20260730240000_loyalty_foundation.sql`,
   completed in `20260731090000_loyalty_ledger_complete.sql`, and
   deepened in RC4-11.

The three subsystems are deliberately separate. They share no tables,
no RPCs, and no admin endpoints. This ADR formally accepts that
architecture as the canonical Phase 6 decision: **three independent
engines, each with idempotent atomic RPCs, honest provider states,
and a shared audit table**.

The fourth "deals" surface — menu-level deal SKUs (e.g. "Family Deal"
at 2250 PKR) — is **not** a separate engine. A deal SKU is just a
`menu_items` row with `product_type = 'deal'`, governed by ADR-020.
This ADR covers only the three promotional engines above.

## Decision

### 1. Three independent engines, no shared table

```text
┌─────────────────┐   ┌─────────────────────────┐   ┌─────────────────┐
│     Coupons     │   │  Marketing Campaigns    │   │     Loyalty     │
│                 │   │                         │   │                 │
│ coupons         │   │ marketing_campaigns     │   │ loyalty_accounts│
│ coupon_redemptions│ │ marketing_campaign_     │   │ loyalty_        │
│                 │   │   submissions           │   │   transactions  │
│                 │   │ marketing_suppressions  │   │ loyalty_rewards │
│                 │   │ marketing_segments      │   │ loyalty_reward_ │
│                 │   │ marketing_templates     │   │   redemptions   │
│                 │   │ marketing_attribution_  │   │ loyalty_tier_   │
│                 │   │   links                 │   │   definitions   │
│                 │   │ loyalty_marketing_      │   │ loyalty_tier_   │
│                 │   │   audit_events          │   │   history       │
│                 │   │                         │   │ loyalty_expiry_ │
│                 │   │                         │   │   policies      │
└─────────────────┘   └─────────────────────────┘   └─────────────────┘
       ↓                          ↓                          ↓
   marketing.manage         marketing.manage           loyalty.manage
   permission               permission                  permission
```

Each engine owns its own schema, RPCs, and admin routes. The only
shared artifact is the `loyalty_marketing_audit_events` table, which
both the marketing and loyalty engines write to (it predates
`domain_events` / ADR-012; future work will mirror these events into
`domain_events`).

### 2. Coupons — read-only validation, single-write redemption

| Table | Purpose |
|---|---|
| `coupons` | Code catalog: `code` (unique, uppercase), `discount_type ∈ {percent, fixed}`, `discount_value`, `min_order`, `expiry_date`, `max_redemptions`, `per_customer_limit`, `branch_id` (null = global) |
| `coupon_redemptions` | Per-order redemption ledger: `coupon_id`, `order_id` (unique — one redemption per order), `branch_id`, `customer_id`, `code` (snapshot), `discount_type/value/applied` (snapshot), `order_subtotal`, `status ∈ {applied, reversed}` |

The validation RPC is **read-only** and can be called from the quote
path (before order creation) without writing anything:

```text
coupon_validate_discount(
  p_code        TEXT,
  p_branch_id   UUID,
  p_subtotal    NUMERIC,
  p_customer_id UUID
)
RETURNS TABLE(
  valid          BOOLEAN,
  reason         TEXT,        -- COUPON_NOT_FOUND | COUPON_INACTIVE | COUPON_EXPIRED | COUPON_BRANCH_MISMATCH | COUPON_MIN_ORDER_NOT_MET | COUPON_MAX_REDEMPTIONS | COUPON_PER_CUSTOMER_LIMIT
  discount_applied NUMERIC,
  coupon_id      UUID
)
```

The redemption write happens on order creation, in the same
transaction as the order. `coupon_redemptions.order_id` is UNIQUE —
an order can have at most one coupon, and a coupon can be redeemed at
most once per order.

`status = 'reversed'` is set when an order is cancelled; the
redemption row is preserved for audit (no DELETE).

### 3. Loyalty ledger — atomic, idempotent, double-entry-shaped

The loyalty ledger is structurally similar to the accounting ledger
(ADR-011) but scoped to points, not currency.

| Table | Purpose |
|---|---|
| `loyalty_accounts` | Per-customer account: `customer_id` (unique), `points_balance ≥ 0`, `tier ∈ {member, silver, gold, platinum}` |
| `loyalty_transactions` | Append-only ledger: `type ∈ {earn, burn, adjust, expire, reverse}`, `points` (signed, ≠ 0), `order_id`, `note`, `actor_user_id`, `reverses_transaction_id`, `expires_at`, `idempotency_key` |

Three unique indexes enforce idempotency:

| Index | Scope | Effect |
|---|---|---|
| `loyalty_transactions_earn_order_uidx` | `(loyalty_account_id, order_id) WHERE type = 'earn'` | One earn per order — duplicate earn RPC is a no-op |
| `uq_loyalty_txn_idempotency` | `(loyalty_account_id, idempotency_key)` | Burn/adjust/expire/reverse replay is a no-op |
| `uq_loyalty_txn_reverse_once` | `(reverses_transaction_id)` | One reverse per original transaction |

Five atomic RPCs (each opens a `FOR UPDATE` lock on the
`loyalty_accounts` row, validates balance non-negativity, inserts the
ledger row, and updates the balance in a single transaction):

```text
loyalty_earn_for_order_atomic(p_order_id, p_actor_user_id)
loyalty_burn_atomic(p_account_id, p_points, p_reason, p_idempotency_key, p_actor_user_id, p_order_id DEFAULT NULL)
loyalty_adjust_atomic(p_account_id, p_points_delta, p_reason, p_idempotency_key, p_actor_user_id)
loyalty_expire_atomic(p_account_id, p_points, p_reason, p_idempotency_key, p_actor_user_id)
loyalty_reverse_atomic(p_original_transaction_id, p_reason, p_actor_user_id)
```

Earn rate: `floor(order.total_amount / 100)` points (1 point per 100
PKR spent). Tier multipliers (silver ×1.1, gold ×1.25, platinum ×1.5)
are applied at earn time, not retroactively.

### 4. Loyalty rewards catalogue + approval workflow

`loyalty_rewards` is a catalogue of redeemable rewards. Each reward
has:

| Field | Values |
|---|---|
| `reward_type` | `fixed_discount`, `percentage_discount`, `free_item`, `category_reward`, `delivery_fee_waiver` |
| `points_cost` | Points required to redeem |
| `monetary_value` | PKR value (for liability reporting) |
| `product_ref` / `category_ref` | For `free_item` / `category_reward` types |
| `per_customer_limit` | Max redemptions per customer |
| `global_redemption_limit` | Max total redemptions |
| `min_order_amount` | Minimum order subtotal for redemption |
| `approval_status` | `draft` → `awaiting_approval` → `approved` (or `rejected`) |
| `is_active` | Soft-active flag (only `approved AND is_active` rewards are redeemable) |
| `valid_from` / `valid_to` | Time window |

Approval workflow: `draft → awaiting_approval → approved` (or
`rejected`). Only `approved` rewards with `is_active = true` and
within the validity window appear in the customer-facing redemption
list. Super-admin and branch-manager can approve; other roles can
create drafts only.

`loyalty_reward_redemptions` records each redemption, linking to the
`loyalty_transactions` burn row via `loyalty_transaction_id`. The
redemption is idempotent per `(loyalty_account_id, idempotency_key)`.

### 5. Loyalty tier definitions + qualification rules

`loyalty_tier_definitions` (RC4-11) formalizes the tier system:

| Tier | Threshold (lifetime earned points) | Earning multiplier |
|---|---|---|
| `member` | 0 | ×1.000 |
| `silver` | 500 | ×1.100 |
| `gold` | 2,000 | ×1.250 |
| `platinum` | 5,000 | ×1.500 |

Qualification rule (`qualification_rule` column):
`lifetime_earned_points` (default) or `rolling_earned_points` (with
`rolling_period_days` window). Tier transitions are audited in
`loyalty_tier_history`.

`loyalty_expiry_policies` defines when unused points expire
(`expire_after_days`) and the valuation rule for liability reporting
(none / configured_rate with `points_to_pkr_rate`).

### 6. Marketing campaigns — honest provider states only

Marketing campaigns send bulk messages via WhatsApp/SMS/email/push.
The submission ledger (`marketing_campaign_submissions`) records
**only** honest provider states — there is no "delivered" status
that the platform cannot verify:

| Status | Meaning |
|---|---|
| `queued` | Campaign queued the recipient for sending |
| `suppressed` | Recipient is on suppression list or lacks consent |
| `submitted` | Provider accepted the request |
| `provider_accepted` | Provider confirmed acceptance (provider-specific) |
| `provider_rejected` | Provider rejected (invalid number, etc.) |
| `failed` | Submission failed (network error, etc.) |

**No `delivered` status.** WhatsApp / SMS providers cannot reliably
report per-message delivery (especially across carriers). The platform
reports only what it can verify: that the submission was accepted by
the provider. Read receipts, if available, are stored as separate
`provider_*` fields, not as a status transition.

`marketing_suppressions` is the canonical consent record. A customer
on the suppression list for a channel is never queued for that
channel, regardless of segment membership. Suppression reasons:
`customer_request`, `bounce`, `complaint`, `manual`.

### 7. Marketing segments — deterministic, documented

`marketing_segments` (RC4-11) pre-seeds 10 deterministic segments:

| Code | Definition |
|---|---|
| `new_customers` | First order within last 30 days |
| `returning_customers` | ≥2 orders, last order within 60 days |
| `inactive_customers` | No orders in last 90 days |
| `loyalty_members` | Has a `loyalty_accounts` row |
| `tier_members` | Loyalty tier ≥ silver |
| `high_frequency` | ≥4 orders in last 30 days |
| `high_spend` | Total spend ≥ 10,000 PKR in last 90 days |
| `coupon_users` | Has ≥1 `coupon_redemptions` row |
| `lapsed_customers` | No orders in 180 days (but had ≥1 prior) |
| `consented_audiences` | Not on `marketing_suppressions` for the channel |

Each segment row carries a `formula` (SQL fragment), an
`authoritative_source` (table(s) queried), a `time_window`, and
`exclusions` (other segments to subtract). Segments are computed
at query time — no materialized view, no cron job.

### 8. Attribution — explicit links only

`marketing_attribution_links` records explicit attribution via
coupon code, campaign ID, reward ID, or provider message ID. There
is no timing-based inference ("customer received campaign X then
ordered 2 hours later, therefore the campaign caused the order").
Attribution is opt-in: a coupon redemption links the order to the
coupon; a campaign-specific link click (if tracked) links the
customer to the campaign.

### 9. Shared audit table (transitional)

`loyalty_marketing_audit_events` is the shared audit table for both
the loyalty and marketing engines. It records: `actor_user_id`,
`request_id`, `organization_id`, `branch_id`, `customer_id`,
`entity_type`, `entity_id`, `action`, `before_state`, `after_state`,
`reason`, `provider_ref`.

This table predates `domain_events` (ADR-012) and is structurally
similar. A future workstream will add mirror triggers to forward
loyalty/marketing events into `domain_events` for unified
cross-domain correlation. Until then, this table is the authoritative
audit trail for the promotions surface.

## Consequences

### Positive

- **Idempotent everywhere.** Every write RPC (earn, burn, adjust,
  expire, reverse, coupon redemption, reward redemption) is
  idempotent via a unique index. Network retries are safe.
- **Honest provider states.** No fake "delivered" status for
  marketing campaigns. The platform reports only what it can verify.
- **Loyalty ledger is double-entry-shaped.** Reversals create an
  explicit `reverse` transaction linked to the original, not a
  silent UPDATE. The ledger is reconstructable from the audit trail.
- **Approval workflow for rewards.** Reward catalogue changes
  require explicit approval before going live — no accidental
  publication of a misconfigured reward.
- **Segment definitions are documented and deterministic.** No
  "magic" segment that depends on a cron job or a stale
  materialized view. Segments are computed live from authoritative
  sources.
- **Attribution is honest.** No timing-based inference. Attribution
  is explicit (coupon code, campaign link) or absent.

### Negative

- **Three subsystems, three admin surfaces.** Staff must learn three
  separate admin UIs (marketing, loyalty, and the implicit "deals as
  menu items" via menu admin). This is intentional (each engine has
  distinct semantics) but increases training cost.
- **No unified promotions search.** "Show me all active promotions
  for Branch X" requires querying `coupons` + `loyalty_rewards` +
  `marketing_campaigns` separately. A future unified view is
  possible but not yet required.
- **`loyalty_marketing_audit_events` is not yet mirrored into
  `domain_events`.** Cross-domain correlation (e.g. "show me every
  event related to customer X") requires joining both tables. The
  mirror trigger is a future workstream.
- **No retroactive tier demotion.** If a customer's rolling-earned
  points drop below a tier threshold, the tier is not automatically
  demoted. Tier transitions are earned (upward) only; demotion
  requires a future ADR to define the policy.

## Alternatives Considered

- **Unified `promotions` table covering coupons, loyalty rewards,
  and campaign-tracked deals.** Rejected: the three engines have
  distinct lifecycles (single-use coupon vs recurring loyalty reward
  vs bulk campaign), distinct validation logic (coupon_validate_discount
  vs reward redemption vs campaign queueing), and distinct audit
  requirements. A unified table would force a lowest-common-denominator
  schema that loses semantics.
- **Materialized view for loyalty tier computation.** Rejected:
  tiers change infrequently (only on earn/burn), and the
  `loyalty_accounts.tier` column is updated atomically with the
  ledger write. A materialized view would add a refresh lag without
  benefit.
- **Timing-based attribution inference.** Rejected: dishonest. A
  customer who received a campaign and ordered 2 hours later may
  have ordered anyway. Explicit attribution (coupon code, link
  click) is the only honest signal.
- **Loyalty points as currency (convertible to PKR).** Rejected:
  points are a discount mechanism, not a currency. They cannot be
  withdrawn, transferred, or used outside the Telepizza system.
  Treating them as currency would create financial-regulatory
  exposure.
- **`delivered` status for marketing campaigns via webhook.**
  Rejected: WhatsApp Business API does provide delivery webhooks,
  but SMS/email providers vary wildly in their delivery-report
  reliability. Reporting `delivered` for some channels and not
  others would create an inconsistent UX. The honest path is to
  report only what every provider can confirm: submission acceptance.

## As-Built Verification (2026-08-16)

`scripts/phase_6_verify.py` confirms Production Supabase has:

- ✅ 2 coupon tables: `coupons`, `coupon_redemptions`
- ✅ 7 marketing tables: `marketing_campaigns`, `marketing_campaign_submissions`,
  `marketing_suppressions`, `marketing_segments`, `marketing_templates`,
  `marketing_attribution_links`, `loyalty_marketing_audit_events`
- ✅ 8 loyalty tables: `loyalty_accounts`, `loyalty_transactions`,
  `loyalty_rewards`, `loyalty_reward_redemptions`, `loyalty_tier_definitions`,
  `loyalty_tier_history`, `loyalty_expiry_policies`, (plus
  `loyalty_marketing_audit_events` shared with marketing)
- ✅ `coupon_validate_discount` RPC exists and returns proper reason codes
- ✅ 5 loyalty atomic RPCs: `loyalty_earn_for_order_atomic`,
  `loyalty_burn_atomic`, `loyalty_adjust_atomic`, `loyalty_expire_atomic`,
  `loyalty_reverse_atomic`
- ✅ 3 unique idempotency indexes on `loyalty_transactions`
- ✅ 4 tier definitions seeded (member/silver/gold/platinum)
- ✅ 10 marketing segments seeded
- ✅ `marketing.manage` and `loyalty.manage` permissions seeded
- ✅ Honest provider states enforced (no `delivered` in
  `marketing_campaign_submissions.status` CHECK)

**Result: see `PHASE6_FINAL_GATE.md` for full verification matrix.**

## References

- [`docs/13-adr/ADR-011-accounting-immutability.md`](./ADR-011-accounting-immutability.md) — accounting ledger (structurally similar to loyalty ledger)
- [`docs/13-adr/ADR-012-domain-event-audit.md`](./ADR-012-domain-event-audit.md) — domain events (future mirror target)
- [`docs/13-adr/ADR-020-canonical-single-price-menu-catalog.md`](./ADR-020-canonical-single-price-menu-catalog.md) — menu catalog (deal SKUs live here)
- [`docs/13-adr/ADR-004-whatsapp-conversation-ownership.md`](./ADR-004-whatsapp-conversation-ownership.md) — WhatsApp provider boundary (campaigns use this)
- [`backend/api/src/services/marketing/coupons.ts`](../../backend/api/src/services/marketing/coupons.ts) — `MarketingService`
- [`backend/api/src/services/marketing/depth.ts`](../../backend/api/src/services/marketing/depth.ts) — RC4-11 depth (segments, templates, attribution)
- [`backend/api/src/services/loyalty/management.ts`](../../backend/api/src/services/loyalty/management.ts) — `LoyaltyService`
- [`backend/api/src/services/loyalty/depth.ts`](../../backend/api/src/services/loyalty/depth.ts) — RC4-11 depth (rewards, tiers, expiry)
- [`backend/api/src/modules/admin/marketing.ts`](../../backend/api/src/modules/admin/marketing.ts) — admin endpoints (25+ routes)
- [`backend/api/src/modules/admin/loyalty.ts`](../../backend/api/src/modules/admin/loyalty.ts) — admin endpoints
- Migrations: `20260730240000_loyalty_foundation.sql`, `20260730250000_coupons_foundation.sql`, `20260731090000_loyalty_ledger_complete.sql`, `20260731100000_coupon_redemptions.sql`, `20260731110000_marketing_campaigns_consent.sql`, `20260731140000_loyalty_schema_compatibility.sql`, `20260801180000_rc4_loyalty_marketing_depth.sql`
