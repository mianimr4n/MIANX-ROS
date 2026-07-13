# BD-011 Discounts and Loyalty Rules — Acceptance Criteria Draft

## Record Information

- **Business decision:** BD-011
- **Status:** DRAFT
- **Requirement IDs:** REQ-LOY-RULE-001 through REQ-LOY-RULE-005
- **ID collision status:** CLEAR
- **Canonical files changed:** No
- **Decision dependency:** Earning ratios, redemption value, expiry, stacking and override policy remain unapproved
- **Implementation rule:** Existing loyalty and discount features SHALL NOT be treated as an approved commercial policy

---

# REQ-LOY-RULE-001 — Earning Rules

## Requirement

Loyalty earning SHALL be configurable by order, product, customer, channel and promotion context.

## Acceptance Criteria

### AC-LOY-001.1 — Controlled Earning Configuration

The platform SHALL support configurable earning rules based on:

- Order subtotal
- Product
- Category
- Channel
- Branch
- Customer segment
- Promotion
- Order type
- Payment method

### AC-LOY-001.2 — Approved Rule Only

Only approved earning rules SHALL be active in production.

### AC-LOY-001.3 — Eligible Order State

Points SHALL only be awarded after the order reaches the approved qualifying state.

Possible states MAY include:

- Paid
- Completed
- Delivered
- Closed

The final qualifying state remains policy-blocked.

### AC-LOY-001.4 — Cancelled Order Protection

A cancelled order SHALL NOT retain loyalty earnings unless the active policy explicitly allows partial retention.

### AC-LOY-001.5 — Refund Adjustment

A full or partial refund SHALL trigger the approved loyalty adjustment.

### AC-LOY-001.6 — Deterministic Earning

**Given** identical order inputs and the same rule version  
**When** loyalty earning is calculated  
**Then** the awarded points SHALL be identical.

### AC-LOY-001.7 — Calculation Breakdown

The earning response SHALL include:

- Eligible amount
- Earning ratio or rule
- Bonus points
- Excluded amount
- Final points
- Rule version
- Explanation code

### AC-LOY-001.8 — Excluded Items

The platform SHALL support excluding:

- Selected products
- Selected categories
- Delivery charges
- Taxes
- Tips
- Gift cards
- Discounted amounts

### AC-LOY-001.9 — Bonus Campaigns

Bonus-point campaigns SHALL support:

- Start and end date
- Customer segment
- Product or category scope
- Channel scope
- Branch scope
- Maximum award
- Approval status

### AC-LOY-001.10 — Rounding Policy

Points calculation SHALL use one approved rounding policy.

### AC-LOY-001.11 — No Duplicate Earning

Repeated processing of the same qualifying event SHALL NOT award duplicate points.

### AC-LOY-001.12 — Earning Audit

Each earning event SHALL record:

- Customer
- Order
- Rule
- Eligible amount
- Points awarded
- Timestamp
- Source channel
- Branch

---

# REQ-LOY-RULE-002 — Redemption Rules

## Requirement

Redemption SHALL follow approved eligibility, balance, scope and value rules.

## Acceptance Criteria

### AC-LOY-002.1 — Sufficient Balance

A redemption SHALL NOT exceed the customer’s available approved balance.

### AC-LOY-002.2 — Minimum Balance

The platform SHALL support a configurable minimum balance before redemption is allowed.

### AC-LOY-002.3 — Maximum Redemption

The platform SHALL support configurable redemption limits based on:

- Order value
- Customer segment
- Channel
- Branch
- Campaign
- Time period

### AC-LOY-002.4 — Eligible Products

Redemption eligibility SHALL support product and category restrictions.

### AC-LOY-002.5 — Channel Eligibility

Redemption SHALL be configurable for:

- Website
- Mobile application
- POS
- WhatsApp ordering
- Other approved channels

### AC-LOY-002.6 — Partial Redemption

The platform SHALL support policy-controlled partial redemption.

### AC-LOY-002.7 — Value Disclosure

Before order confirmation, the customer SHALL see:

- Points used
- Monetary value
- Remaining balance
- Final payable amount

### AC-LOY-002.8 — Atomic Redemption

Points SHALL NOT be permanently deducted unless the associated order action is successfully committed.

### AC-LOY-002.9 — Failed Checkout Recovery

If checkout fails before confirmation, reserved points SHALL be released.

### AC-LOY-002.10 — Cancellation Restoration

Cancelled orders SHALL restore or retain points according to the approved cancellation policy.

### AC-LOY-002.11 — Refund Recalculation

A refund SHALL update redeemed and earned points according to the approved policy.

### AC-LOY-002.12 — No Negative Balance

The platform SHALL prevent an unauthorized negative loyalty balance.

### AC-LOY-002.13 — Redemption Audit

Each redemption SHALL record:

- Customer
- Order
- Points used
- Monetary value
- Rule version
- Timestamp
- Channel
- Branch

---

# REQ-LOY-RULE-003 — Discount Stacking

## Requirement

The pricing engine SHALL apply an approved discount-stacking policy.

## Acceptance Criteria

### AC-LOY-003.1 — Discount Types

The platform SHALL support compatibility rules among:

- Coupon
- Loyalty redemption
- Promotional discount
- Employee discount
- Manager discount
- Birthday reward
- Free delivery
- Product-specific offer

### AC-LOY-003.2 — Compatibility Matrix

The platform SHALL support an approved matrix defining which discount combinations are:

- Allowed
- Not allowed
- Approval-required
- Mutually exclusive

### AC-LOY-003.3 — Precedence

When multiple eligible discounts exist, the pricing engine SHALL apply the approved precedence.

### AC-LOY-003.4 — Deterministic Pricing

**Given** identical cart and discount inputs with the same rule version  
**When** pricing executes  
**Then** the final discount result SHALL be identical.

### AC-LOY-003.5 — Maximum Discount Protection

The total discount SHALL NOT exceed approved limits.

### AC-LOY-003.6 — Minimum Payable Protection

The platform SHALL support a configurable minimum payable amount.

### AC-LOY-003.7 — Free-Delivery Interaction

Free delivery SHALL be evaluated according to the approved interaction with:

- Coupons
- Loyalty redemption
- Promotional discounts
- Order subtotal threshold

### AC-LOY-003.8 — Customer Disclosure

Before confirmation, checkout SHALL disclose:

- Each applied discount
- Each rejected discount
- Rejection reason
- Final discount
- Final payable amount

### AC-LOY-003.9 — Manual Override

A manual discount override SHALL require:

- Authorized role
- Reason
- Audit record
- Optional approval
- Final customer-visible amount

### AC-LOY-003.10 — No Silent Removal

A previously displayed discount SHALL NOT disappear without recalculation and customer-visible explanation.

### AC-LOY-003.11 — Promotion Revalidation

Discount eligibility SHALL be revalidated when:

- Cart changes
- Branch changes
- Address changes
- Channel changes
- Payment method changes
- Customer identity changes

### AC-LOY-003.12 — Stacking Audit

The confirmed order SHALL retain:

- Eligible discounts
- Applied discounts
- Rejected discounts
- Precedence result
- Rule version
- Final totals

---

# REQ-LOY-RULE-004 — Expiry and Reversal

## Requirement

The platform SHALL support controlled expiry, reversal and adjustment of loyalty value.

## Acceptance Criteria

### AC-LOY-004.1 — Points Expiry

Points SHALL only expire according to an approved expiry rule.

### AC-LOY-004.2 — Expiry Disclosure

The customer SHALL be able to view:

- Current balance
- Expiring balance
- Expiry date
- Expiry source, when applicable

### AC-LOY-004.3 — Reward Expiry

Rewards and coupons SHALL support independent expiry dates.

### AC-LOY-004.4 — Expiry Notification

The platform SHALL support configurable notifications before points or rewards expire.

### AC-LOY-004.5 — Refund Reversal

Refund-related reversals SHALL reference the original earning or redemption event.

### AC-LOY-004.6 — Cancellation Reversal

Cancellation-related reversals SHALL follow the approved cancellation policy.

### AC-LOY-004.7 — Partial Refund Recalculation

A partial refund SHALL only reverse the approved proportional or item-specific loyalty value.

### AC-LOY-004.8 — Manual Adjustment

Manual balance adjustments SHALL require:

- Authorized role
- Reason
- Amount or points
- Related customer
- Approval, when required
- Audit record

### AC-LOY-004.9 — No Destructive History

Loyalty history SHALL retain original and reversing entries instead of silently overwriting balances.

### AC-LOY-004.10 — Idempotency

Repeated processing of the same reversal event SHALL NOT duplicate the adjustment.

### AC-LOY-004.11 — Negative Balance Governance

If a reversal would create a negative balance, the platform SHALL apply the approved negative-balance or recovery policy.

### AC-LOY-004.12 — Adjustment Reporting

Authorized reporting SHALL support:

- Expired points
- Reversed points
- Manual adjustments
- Refund-related reversals
- Cancellation-related reversals
- Branch
- Acting user
- Financial equivalent

---

# REQ-LOY-RULE-005 — Governance

## Requirement

Loyalty and discount rule changes SHALL be versioned, approved and auditable.

## Acceptance Criteria

### AC-LOY-005.1 — Rule Versioning

Each loyalty or discount rule SHALL record:

- Version
- Status
- Effective date
- Expiry date, when applicable
- Scope
- Author
- Approver
- Change reason

### AC-LOY-005.2 — Status Lifecycle

Rules SHALL support statuses such as:

- DRAFT
- REVIEW
- APPROVED
- ACTIVE
- SUSPENDED
- EXPIRED
- RETIRED

### AC-LOY-005.3 — Approval Gate

A rule SHALL NOT become `ACTIVE` without required approval.

### AC-LOY-005.4 — Future Scheduling

Approved rules SHALL support future activation and expiry.

### AC-LOY-005.5 — Scope Control

Rules SHALL support scope by:

- Branch
- Channel
- Customer segment
- Product
- Category
- Campaign
- Region

### AC-LOY-005.6 — Conflict Detection

The platform SHALL detect conflicting active rules within the same scope.

### AC-LOY-005.7 — Historical Order Protection

Changing a rule SHALL NOT alter loyalty or discount values already confirmed on past orders.

### AC-LOY-005.8 — Emergency Suspension

Authorized personnel SHALL be able to suspend a rule without a code deployment.

### AC-LOY-005.9 — Change Audit

Every material change SHALL record:

- Previous value
- New value
- Acting user
- Approver
- Reason
- Timestamp
- Effective scope

### AC-LOY-005.10 — Customer Impact Review

Rule activation SHALL support recording whether customer-facing terms, messages or notices require updates.

### AC-LOY-005.11 — Reporting

Authorized reporting SHALL support:

- Rule usage
- Discount cost
- Points issued
- Points redeemed
- Breakage
- Customer participation
- Branch performance
- Campaign performance
- Override activity

### AC-LOY-005.12 — Access Control

Only authorized roles SHALL create, approve, activate, suspend or retire loyalty and discount rules.

---

## Cross-Decision Dependencies

This policy interacts with:

- `BD-005` — Delivery-Charge Model
- `BD-006` — Production Payment Methods
- `BD-007` — Refund and Complaint Policy
- `BD-008` — Order Cancellation
- `BD-010` — Multi-Branch Routing
- `BD-012` — Free-Delivery Threshold

Loyalty and discount behavior SHALL remain consistent with pricing, payment, refund, cancellation, branch and delivery rules.

---

## Policy-Blocked Values

The following values remain unresolved and SHALL NOT be invented:

1. Earning ratio
2. Monetary value per point
3. Qualifying order state
4. Minimum redemption balance
5. Maximum redemption percentage
6. Eligible products and categories
7. Delivery-charge earning eligibility
8. Tax earning eligibility
9. Discounted-amount earning rule
10. Points rounding policy
11. Points expiry duration
12. Reward expiry duration
13. Expiry notification schedule
14. Birthday reward
15. Discount compatibility matrix
16. Discount precedence
17. Maximum total discount
18. Minimum payable amount
19. Free-delivery stacking behavior
20. Refund-related reversal method
21. Cancellation-related reversal method
22. Partial-refund reversal method
23. Negative-balance treatment
24. Manual adjustment authority
25. Employee discount rules
26. Manager discount limits
27. Branch-specific promotion rights
28. Customer-segment eligibility
29. Campaign approval matrix
30. Emergency suspension authority

---

## Readiness Assessment

| Requirement | Behavior testable | Values blocked by policy |
|---|---:|---:|
| REQ-LOY-RULE-001 | Yes | Earning ratio, scope and qualifying states |
| REQ-LOY-RULE-002 | Yes | Redemption value, limits and eligibility |
| REQ-LOY-RULE-003 | Yes | Compatibility, precedence and caps |
| REQ-LOY-RULE-004 | Yes | Expiry, reversal and negative-balance policy |
| REQ-LOY-RULE-005 | Yes | Approval matrix and governance roles |

---

## Recommended Canonical Destinations

After business approval and cross-document review:

- `docs/02-requirements/Core/REQUIREMENTS.md`
- `docs/02-requirements/Business/CRM_REQUIREMENTS.md`
- `docs/02-requirements/Applications/ADMIN_PANEL_REQUIREMENTS.md`
- `docs/02-requirements/Applications/WEBSITE_REQUIREMENTS.md`
- `docs/02-requirements/Applications/MOBILE_APP_REQUIREMENTS.md`
- `docs/02-requirements/Applications/POS_REQUIREMENTS.md`
- `docs/02-requirements/Operations/ORDER_MANAGEMENT_REQUIREMENTS.md`
- `docs/02-requirements/Security/PAYMENT_GATEWAY_REQUIREMENTS.md`
- `docs/02-requirements/Security/SETTINGS_REQUIREMENTS.md`
- `docs/02-requirements/Security/AUDIT_LOG_REQUIREMENTS.md`
- `docs/02-requirements/Security/NOTIFICATION_REQUIREMENTS.md`

The canonical requirements SHALL explicitly reference `BD-011`.
