# Telepizza Business Decision Register

## Record Information

- **Status:** OPEN
- **Purpose:** Consolidate unresolved business decisions before requirements and architecture approval
- **Decision authority:** Founder and Telepizza operational ownership, depending on decision type
- **Source audit:** Business Open-Decision Audit
- **Rule:** No open decision in this register may be silently hard-coded as permanent production behavior

---

## Decision Status Definitions

| Status | Meaning |
|---|---|
| OPEN | Decision has not yet been approved |
| WORKING_ASSUMPTION | Temporary V1 value may be used if configurable |
| CONFIRM_WITH_BUSINESS | Requires verification from Telepizza ownership or operations |
| APPROVED | Formally decided and ready to propagate |
| DEFERRED | Intentionally moved outside current release |

---

## Open Decision Register

| ID | Decision | Classification | Current Position | Required Authority | Implementation Impact | Status |
|---|---|---|---|---|---|---|
| BD-001 | Northern Bypass branch operating hours | Operational fact | Hours are not yet known | Telepizza Operations | Branch availability, ordering windows, delivery estimates | CONFIRM_WITH_BUSINESS |
| BD-002 | Small Pizza price | Commercial fact | Price not documented | Telepizza Ownership | Menu, POS, website, tax and promotion calculations | CONFIRM_WITH_BUSINESS |
| BD-003 | Large Pizza price | Commercial fact | Price not documented | Telepizza Ownership | Menu, POS, website, tax and promotion calculations | CONFIRM_WITH_BUSINESS |
| BD-004 | Zinger Burger price | Commercial fact | Price not documented | Telepizza Ownership | Menu, POS, website, tax and promotion calculations | CONFIRM_WITH_BUSINESS |
| BD-005 | Delivery-charge model | Commercial policy | Delivery-charge approach is not finalized | Founder plus Telepizza Ownership | Checkout, pricing engine, promotions and delivery zones | OPEN |
| BD-006 | Production payment methods | Operational policy | COD, JazzCash and EasyPaisa are V1 assumptions; card is deferred | Founder plus Telepizza Ownership | Checkout, reconciliation, integrations and refunds | WORKING_ASSUMPTION |
| BD-007 | Refund and complaint policy | Customer policy | No approved policy exists | Founder plus Telepizza Ownership | Support workflow, refunds, credits, audit and customer promises | OPEN |
| BD-008 | Order-cancellation policy | Order policy | Cancellation window and conditions are undefined | Founder plus Telepizza Operations | Order state machine, kitchen flow, refund handling and rider assignment | OPEN |
| BD-009 | Peak-hour order handling | Operations policy | Order pause and capacity rules are undefined | Founder plus Branch Management | Ordering availability, ETAs, kitchen load and customer messaging | OPEN |
| BD-010 | Multi-branch order routing | Operations policy | Routing strategy is undefined | Founder plus Telepizza Operations | Branch assignment, delivery zones, stock and capacity | OPEN |
| BD-011 | Discount and loyalty rules | Commercial policy | Eligibility, stacking, redemption and expiry are undefined | Founder plus Telepizza Ownership | Pricing engine, CRM, customer accounts and reporting | OPEN |
| BD-012 | Free-delivery threshold | Configurable working assumption | Threshold will be based on live average-order-value data | Founder | Checkout configuration and promotional rules | WORKING_ASSUMPTION |

---

## Required Founder Decisions

### BD-005 — Delivery-Charge Model

Choose one initial model:

1. Flat delivery fee
2. Distance-based fee
3. Zone-based fee
4. Free delivery above a threshold
5. Hybrid model

The selected model should remain configurable.

### BD-007 — Refund and Complaint Policy

Define:

- Eligible complaint categories
- Evidence requirements
- Refund, replacement, store credit or rejection outcomes
- Approval authority
- Resolution target
- Customer communication process

### BD-008 — Order Cancellation

Define:

- Customer cancellation window
- Cancellation after preparation starts
- Refund behavior by payment method
- Manager override authority
- Rider-assignment implications

### BD-009 — Peak-Hour Handling

Decide whether authorized staff may:

- Extend preparation estimates
- Restrict selected menu items
- Pause delivery orders
- Pause all digital orders
- Require manager approval before pausing

### BD-010 — Multi-Branch Routing

Select one or more routing criteria:

- Delivery-zone ownership
- Nearest eligible branch
- Stock availability
- Branch capacity
- Estimated preparation time
- Estimated delivery time
- Customer-selected branch

### BD-011 — Discounts and Loyalty

Define:

- Eligibility
- Points or reward model
- Redemption rules
- Expiry
- Discount stacking
- Branch-specific promotions
- Manager overrides

---

## Telepizza Confirmation Checklist

- [ ] Confirm Northern Bypass operating hours
- [ ] Confirm Small Pizza price
- [ ] Confirm Large Pizza price
- [ ] Confirm Zinger Burger price
- [ ] Confirm current delivery-charge practice
- [ ] Confirm accepted production payment methods
- [ ] Confirm operational refund practice
- [ ] Confirm operational cancellation practice
- [ ] Confirm whether branches pause orders during overload
- [ ] Confirm any existing informal discounts or loyalty treatment

---

## V1 Governance Constraints

1. Unconfirmed prices SHALL NOT be published as verified commercial data.
2. Working assumptions SHALL remain configurable.
3. Open policies SHALL NOT be presented to customers as approved guarantees.
4. Architecture SHALL distinguish approved rules from temporary configuration.
5. Requirements depending on an open decision SHALL reference the relevant `BD-xxx` identifier.
6. Production launch SHALL require closure or explicit deferral of all launch-blocking decisions.

---

## Next Action

The next audit stage will trace these business decisions into:

1. Functional requirements
2. Non-functional requirements
3. Order state transitions
4. Pricing and payment architecture
5. Branch and delivery routing architecture
6. Customer-support workflows
