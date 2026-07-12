# 📖 BUSINESS RULES

> Official business rules for the Telepizza Platform.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Business Documentation |
| Document | BUSINESS_RULES.md |
| Version | 1.0.0 |
| Status | Draft |
| Last Updated | 07 July 2026 |

---

# Purpose

⚠️ **Status note:** Most rules below are sound *system design* (how orders/branches/inventory should logically work) and don't need Telepizza's input — they're good defaults. A few (marked below) encode specific business decisions — like payment methods — that are still unconfirmed. Treat unmarked rules as reasonable system logic; treat marked ones as pending real decisions.

This document defines the business rules used across every application within the Telepizza Platform.

These rules apply to:

- Website
- Mobile App
- Admin Panel
- POS
- Kitchen Dashboard
- Rider App
- AI Agents
- Future Integrations

---

# Order Rules

## BR-001

Every order must belong to one branch.

---

## BR-002

A customer cannot checkout with an empty cart.

---

## BR-003

Every order receives a unique Order Number.

Example

TP-20260707-000001

---

## BR-004

An order must contain at least one menu item.

---

## BR-005

The customer must choose one order type:

- Delivery
- Takeaway
- Dine-In

---

## BR-006

An order cannot be edited after Kitchen Confirmation.

---

## BR-007

Cancelled orders cannot be restored.

A new order must be created.

---

# Customer Rules

## BR-101

A customer may checkout as:

- Guest
- Registered User

---

## BR-102

One mobile number should represent one customer account.

---

## BR-103

Customers can save multiple delivery addresses.

---

## BR-104

Customers can view complete order history.

---

## BR-105

Customers may rate completed orders only.

---

# Branch Rules

## BR-201

Every order belongs to exactly one branch.

---

## BR-202

A branch has independent:

- Inventory
- Kitchen
- Riders
- Employees
- Reports

---

## BR-203

Only Head Office can view all branches.

---

## BR-204

Branch Managers can only manage their own branch.

---

# Menu Rules

## BR-301

Only active products appear online.

---

## BR-302

Out-of-stock products cannot be ordered.

---

## BR-303

Price changes apply only after approval.

---

## BR-304

Every menu item belongs to a category.

---

## BR-305

Products may include optional add-ons.

Examples

- Extra Cheese
- Stuffed Crust
- Extra Sauce

---

# Payment Rules

## BR-401

📋 **Founder working assumption (Mianx.ai decision, 2026-07-10) — not yet validated with Telepizza's actual operations.** If this platform is ever handed to Telepizza's real ownership, confirm this matches how they actually want to accept payment before launch.

Payment methods for V1:

- **Cash on Delivery** — primary method, matches current phone-order practice
- **JazzCash** — low integration cost, dominant mobile wallet in Pakistan
- **EasyPaisa** — same rationale as JazzCash, widely held alongside it

Deferred to later phase:

- **Card payment** — adds payment gateway integration cost/complexity; not worth it until COD + wallets prove the order volume justifies it

---

## BR-402

Payment status must be tracked.

Statuses

- Pending
- Paid
- Failed
- Refunded

---

## BR-403

Refunds require manager approval.

---

# Coupon Rules

## BR-501

Coupons have:

- Start Date
- Expiry Date

---

## BR-502

Expired coupons are invalid.

---

## BR-503

Coupon usage may be limited.

Examples

- One time per customer
- One time per order

---

# Loyalty Rules

## BR-601

Customers earn points only after completed orders.

---

## BR-602

Cancelled orders earn no points.

---

## BR-603

Refunded orders reverse awarded points.

---

# Kitchen Rules

## BR-701

Kitchen receives only confirmed orders.

---

## BR-702

Kitchen Status

- Pending
- Preparing
- Ready

---

## BR-703

Kitchen cannot mark cancelled orders as completed.

---

# Rider Rules

## BR-801

Only Ready orders can be assigned.

---

## BR-802

One order can have only one active rider.

---

## BR-803

Order Status

- Assigned
- Picked Up
- Delivered

---

# Inventory Rules

## BR-901

Inventory reduces only after order confirmation.

---

## BR-902

Negative inventory is not allowed.

---

## BR-903

Low stock generates alerts.

---

# AI Rules

## BR-1001

AI cannot change prices without approval.

---

## BR-1002

AI cannot delete customer records.

---

## BR-1003

AI recommendations require human approval where configured.

---

## BR-1004

AI can generate reports automatically.

---

# Security Rules

## BR-1101

Every user must authenticate.

---

## BR-1102

Permissions are role-based.

Roles

- Super Admin
- Branch Manager
- Cashier
- Kitchen
- Rider
- Customer

---

# Audit Rules

Every important action must be logged.

Examples

- Login
- Order Created
- Payment Received
- Price Changed
- Refund Processed

---

# Business Rule Priority

Critical

- Payment
- Inventory
- Orders

High

- Kitchen
- Delivery
- Customer

Medium

- Marketing
- Loyalty
- Analytics

---

# Future Rules

Future versions may include:

- Franchise Rules
- Dynamic Pricing
- AI Inventory Optimization
- Subscription Plans
- Corporate Accounts
- Catering Rules

---

# Related Documents

- DELIVERY_POLICY.md
- PRICING_STRATEGY.md
- LOYALTY_PROGRAM.md
- REQUIREMENTS.md
- DATABASE_SCHEMA.md

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai
---

## Migrated Operating Facts, Working Assumptions, and Open Decisions

**Migration source:** `business-rules.md`  
**Migration classification:** Legacy business knowledge consolidation  
**Decision authority:** Founder validation required where explicitly stated  
**Canonical authority:** This section is subordinate to the approved rules defined elsewhere in this document.

> **Note:** This section preserves useful business knowledge from a legacy duplicate file. Operating facts, working assumptions, and unresolved decisions are intentionally separated so that assumptions are not misrepresented as final business policy.

### Confirmed Operating Information

The following information was recorded during the project's earlier business research:

| Business rule area | Recorded value |
|---|---|
| Branch 1 operating hours | 10:00 AM to 2:30 AM, daily |
| Supported service types | Dine-in, takeaway, delivery, contactless delivery, and curbside pickup |
| Cuisine scope | Fast food, Chinese, and cafe |
| Indicative price tier | Mid-range; approximately PKR 1,000 to PKR 2,000 per person, with bundle deals previously observed near PKR 1,899 |

> **Governance note:** These values SHALL be verified with Telepizza ownership before production launch or publication as contractual customer information.

### Founder Working Assumptions

The following decisions were adopted as V1 working assumptions on 2026-07-10. They are suitable for planning and initial implementation but require operational confirmation before production release.

#### Delivery Minimum

- Delivery MAY be free above a configurable order-value threshold.
- The threshold SHALL be finalized after real average order-value data becomes available.
- V1 does not assume a separate hard minimum order unless subsequently approved.

#### Delivery Radius and Zones

- Branch 1 MAY initially serve an approximate five-kilometre radius around Royal Orchard.
- Delivery zones SHALL remain configurable.
- Branch 2 coverage SHALL be defined before that branch becomes operational.

#### Payment Methods

V1 is planned to support:

- Cash on delivery
- JazzCash
- EasyPaisa

Card payment is deferred from the initial release unless a later approved requirement changes this decision.

### Unresolved Business Decisions

The following items remain open and SHALL NOT be treated as finalized policy:

- [ ] Refund and complaint policy
- [ ] Order-cancellation window and cancellation conditions
- [ ] Peak-hour kitchen capacity and order-pause policy
- [ ] Multi-branch order-routing logic
- [ ] Discount and loyalty eligibility rules

### Required Decision Details

#### Refund and Complaint Policy

The business must define:

- Eligible complaint categories
- Evidence requirements
- Refund, replacement, credit, or rejection outcomes
- Approval authority
- Resolution time target
- Customer communication process

#### Order-Cancellation Policy

The business must define:

- Customer cancellation window
- Cancellation after kitchen preparation begins
- Refund eligibility by payment method
- Branch cancellation authority
- Rider-assignment implications

#### Peak-Hour Handling

The business must decide whether the system may:

- Extend estimated preparation times
- Restrict selected menu items
- Pause delivery orders
- Pause all digital orders
- Require manager approval before order suspension

#### Multi-Branch Routing

Before Branch 2 launches, the business must choose and approve one or more routing strategies:

- Nearest eligible branch
- Delivery-zone ownership
- Customer-selected branch
- Branch capacity
- Stock availability
- Estimated preparation and delivery time

#### Discounts and Loyalty

The business must define:

- Loyalty earning model
- Reward-redemption rules
- Discount stacking
- Branch-specific promotions
- Customer eligibility
- Expiry rules
- Manual manager overrides

### Implementation Constraint

Architecture, database design, API contracts, customer interfaces, POS workflows, and kitchen operations SHALL distinguish between:

1. Approved business rules
2. Configurable working assumptions
3. Unresolved business decisions

Unresolved decisions SHALL NOT be silently hard-coded as permanent production behavior.

