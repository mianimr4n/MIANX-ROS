# Database V2 Roadmap

**Date:** 2026-07-18  
**Prerequisite:** Database V1 Freeze must be **LOCKED** before starting V2 schema programs  
**Mode:** Roadmap design only

---

## Principles

1. After V1 freeze, schema changes are rare, forward-only, and owner-gated.  
2. Prefer API/application evolution over table churn.  
3. Do not smuggle V2 tables into freeze PRs.  
4. Multi-branch remains logical (`branch_id`), not physical DB-per-branch.

---

## Horizon A — Immediately after freeze (feature phase)

Still **SAFE FOR FEATURE PHASE** relative to freeze, but high product value:

| Theme | Candidate schema | Depends on |
|---|---|---|
| Cashier shifts | `pos_sessions` (if deferred at freeze) | R6 bills |
| Multi-station kitchen | `kitchen_stations`, order×station tickets, optional `menu_item_kitchen_stations` | R5 |
| Waiter floor ops | waiter FK / assignment table | R4 sessions |
| Table merge / move | event + group tables | R3/R4 |
| Bill split / multi-tender | `payment_splits`; nullable `payments.restaurant_bill_id` | R6 + payments |
| QR TTL / issue audit | `qr_expires_at` / token issue log | R3 |
| Scheduled orders | `orders.scheduled_for`, hold status | Orders core |
| Branch settings | `branch_settings` key-value | Branches |
| Tax / service charge rules | small config tables | Orders money fields |
| Global audit | `audit_events` | — |
| Notification outbox | `notification_outbox` | — |

---

## Horizon B — Commerce & CRM (V2)

| Domain | Tables (indicative) | Class |
|---|---|---|
| Coupons | `coupons`, `coupon_redemptions` | V2 / NOT REQUIRED FOR V1 |
| Promotions | `promotions`, `promotion_rules` | V2 |
| Loyalty | `loyalty_accounts`, `loyalty_ledger` | V2 |
| Wallet | `wallets`, `wallet_transactions` | V2 |
| Reviews / feedback | `reviews`, `feedback_tickets` | V2 |
| Customer addresses | `customer_addresses` | V2 or late feature |

---

## Horizon C — Supply chain & finance (V2+)

Inventory, stock movements, purchase orders, vendors, recipe/BOM, COGS, tip pools, fiscal printers, multi-currency — **out of V1**. Introduce only with ERP phase ownership.

---

## Horizon D — Platform scale (V2+)

| Capability | Approach |
|---|---|
| Analytics warehouse | ETL to separate store; keep OLTP lean |
| Multi-region reads | Replicas; pin writes to primary |
| Offline POS sync | Dedicated sync tables + device identity |
| Partner webhooks | Signed outbox + delivery attempts |
| Per-country fiscalization | Jurisdiction packs, not core order rewrite |

---

## Mapping from 50-domain audit

Domains **11–14, 33–37, 38–39, 47–49** are primarily **V2**.  
Domains **25–32** dine-in/POS deepen in **Horizon A** after freeze.  
Domains **1–10, 15–24, 40** are largely V1-complete or V1-foundation-dependent.

---

## Governance

| Gate | Rule |
|---|---|
| Post-freeze migration | Owner written approval + dry-run + PITR |
| Breaking change | Forbidden without versioned expand/contract |
| Naming | Keep aliases documented; no duplicate junctions |
| War Room | Block polluted PRs (lesson from #71) |

---

## Success definition for V2 entry

- V1 freeze **OFFICIALLY DECLARED AND LOCKED**  
- R3–R6 live and migration history aligned  
- Delivery/pickup regression green  
- Dine-in QR → session → kitchen → bill path smoke-tested in staging/prod  

Until then, this roadmap stays planning-only.
