# BD-012 Free-Delivery Threshold — Acceptance Criteria Draft

## Record Information

- **Business decision:** BD-012
- **Status:** DRAFT
- **Requirement IDs:** REQ-PRICE-FD-001 through REQ-PRICE-FD-004
- **ID collision status:** CLEAR
- **Canonical files changed:** No
- **Decision dependency:** Initial threshold, calculation basis, review frequency and promotion interaction remain unapproved
- **Implementation rule:** The system SHALL support configuration without inventing a permanent threshold value

---

# REQ-PRICE-FD-001 — Threshold Configuration

## Requirement

The free-delivery threshold SHALL be configurable by operational and commercial scope.

## Acceptance Criteria

### AC-FD-001.1 — Configurable Threshold

An authorized user SHALL be able to configure a free-delivery threshold without a code deployment.

### AC-FD-001.2 — Branch Scope

The threshold SHALL support branch-specific configuration.

### AC-FD-001.3 — Delivery-Zone Scope

The threshold SHALL support delivery-zone-specific configuration.

### AC-FD-001.4 — Channel Scope

The threshold SHALL support independent configuration for:

- Website
- Mobile application
- POS
- WhatsApp ordering
- Other approved channels

### AC-FD-001.5 — Customer-Segment Scope

The platform SHALL support threshold rules by approved customer segment.

### AC-FD-001.6 — Promotion Scope

The threshold SHALL support temporary promotional overrides with:

- Start date
- End date
- Scope
- Approval status
- Rule priority

### AC-FD-001.7 — Effective Period

Each threshold configuration SHALL support:

- Effective date and time
- Expiry date and time, when applicable
- Time zone
- Status

### AC-FD-001.8 — Status Lifecycle

Threshold configurations SHALL support statuses such as:

- DRAFT
- REVIEW
- APPROVED
- ACTIVE
- SUSPENDED
- EXPIRED
- RETIRED

### AC-FD-001.9 — Approval Gate

A threshold SHALL NOT become active without required approval.

### AC-FD-001.10 — No Overlapping Ambiguity

The platform SHALL detect conflicting active threshold rules for the same scope.

### AC-FD-001.11 — Historical Protection

Changing the threshold SHALL NOT alter the delivery charge of already confirmed orders.

### AC-FD-001.12 — Configuration Audit

Each threshold configuration SHALL record:

- Value
- Currency
- Scope
- Status
- Version
- Effective period
- Acting user
- Approver
- Reason

---

# REQ-PRICE-FD-002 — Threshold Basis

## Requirement

The platform SHALL define the qualifying order-value basis used for free-delivery evaluation.

## Acceptance Criteria

### AC-FD-002.1 — Supported Calculation Bases

The platform SHALL support configurable evaluation using:

- Gross subtotal
- Net subtotal
- Subtotal before discount
- Subtotal after discount
- Subtotal before tax
- Subtotal excluding tax
- Subtotal excluding delivery charge
- Eligible-item subtotal

### AC-FD-002.2 — One Active Basis

For a given threshold rule, one approved calculation basis SHALL be authoritative.

### AC-FD-002.3 — Deterministic Evaluation

**Given** identical cart inputs and the same active rule version  
**When** threshold eligibility is evaluated repeatedly  
**Then** the result SHALL be identical.

### AC-FD-002.4 — Delivery-Charge Exclusion

The delivery charge SHALL NOT count toward the free-delivery threshold unless explicitly approved.

### AC-FD-002.5 — Tax Treatment

The platform SHALL support approved inclusion or exclusion of tax from the qualifying amount.

### AC-FD-002.6 — Discount Treatment

The platform SHALL define whether discounts reduce the qualifying amount.

### AC-FD-002.7 — Coupon Treatment

Coupon effects SHALL be evaluated according to the approved discount and threshold policy.

### AC-FD-002.8 — Loyalty Redemption Treatment

The platform SHALL define whether loyalty redemption affects threshold qualification.

### AC-FD-002.9 — Ineligible Items

The platform SHALL support excluding selected products or categories from threshold qualification.

### AC-FD-002.10 — Rounding Policy

Threshold comparison SHALL use the project’s approved currency precision and rounding policy.

### AC-FD-002.11 — Calculation Breakdown

The threshold evaluation response SHALL include:

- Qualifying amount
- Threshold amount
- Remaining amount
- Qualification status
- Rule version
- Explanation code

### AC-FD-002.12 — Server-Side Authority

Customer applications SHALL use the server-calculated threshold result as the authoritative value.

---

# REQ-PRICE-FD-003 — Approval and Review

## Requirement

Threshold changes SHALL be approved, versioned and periodically reviewed.

## Acceptance Criteria

### AC-FD-003.1 — Approval Authority

The platform SHALL support approval roles such as:

- Commercial owner
- Finance owner
- Operations owner
- Founder or executive authority

The final approval matrix SHALL remain configurable.

### AC-FD-003.2 — Change Request

A threshold change request SHALL record:

- Previous value
- Proposed value
- Scope
- Reason
- Requested effective date
- Requesting user

### AC-FD-003.3 — Approval Evidence

An approval SHALL record:

- Approver
- Decision
- Timestamp
- Comments
- Effective scope
- Effective date

### AC-FD-003.4 — Scheduled Activation

An approved threshold SHALL support future activation.

### AC-FD-003.5 — Scheduled Expiry

Temporary thresholds SHALL support automatic expiry.

### AC-FD-003.6 — Review Date

Each active threshold SHALL support a scheduled review date.

### AC-FD-003.7 — Review Reminder

The platform SHALL notify authorized personnel before a threshold review becomes due.

### AC-FD-003.8 — Review Outcome

A threshold review SHALL support:

- Continue unchanged
- Modify
- Suspend
- Retire
- Extend temporary rule

### AC-FD-003.9 — Data-Informed Review

The review workflow SHALL support evidence such as:

- Average order value
- Delivery cost
- Margin impact
- Order conversion
- Customer usage
- Branch performance
- Promotion cost

### AC-FD-003.10 — Emergency Suspension

Authorized personnel SHALL be able to suspend an active threshold rule without a code deployment.

### AC-FD-003.11 — Separation of Duties

The platform SHALL support restrictions preventing unauthorized self-approval of material threshold changes.

### AC-FD-003.12 — Immutable History

Previous threshold versions SHALL remain traceable after modification or retirement.

---

# REQ-PRICE-FD-004 — Customer Disclosure

## Requirement

Checkout SHALL clearly disclose free-delivery qualification and remaining amount.

## Acceptance Criteria

### AC-FD-004.1 — Current Threshold Display

Where commercially approved, checkout SHALL display the applicable free-delivery threshold.

### AC-FD-004.2 — Remaining Amount

**Given** the customer has not reached the threshold  
**When** checkout totals are calculated  
**Then** the platform SHALL display the remaining qualifying amount.

### AC-FD-004.3 — Qualified State

**Given** the order reaches the threshold  
**When** checkout recalculates  
**Then** the interface SHALL clearly show that free delivery applies.

### AC-FD-004.4 — Rule Recalculation

Threshold qualification SHALL be recalculated when:

- Cart contents change
- Quantity changes
- Discount changes
- Coupon changes
- Loyalty redemption changes
- Branch changes
- Address or delivery zone changes
- Channel context changes

### AC-FD-004.5 — Lost Qualification

**Given** an order previously qualified  
**When** a change causes the qualifying amount to fall below the threshold  
**Then** the delivery charge SHALL be restored and clearly disclosed before confirmation.

### AC-FD-004.6 — Promotion Disclosure

Where a promotional threshold applies, the interface SHALL disclose approved terms or exclusions.

### AC-FD-004.7 — Ineligible Item Disclosure

Where selected items do not contribute toward qualification, the customer experience SHALL provide an approved explanation.

### AC-FD-004.8 — Cross-Channel Consistency

For identical order context, all channels SHALL receive the same threshold evaluation from the authoritative pricing service.

### AC-FD-004.9 — Confirmation Snapshot

The confirmed order SHALL store:

- Applied threshold
- Qualifying amount
- Qualification result
- Rule version
- Delivery-fee outcome

### AC-FD-004.10 — No Misleading Message

The platform SHALL NOT display free delivery unless the server has confirmed qualification.

### AC-FD-004.11 — Unavailable Configuration

**Given** no approved threshold configuration applies  
**When** checkout calculates delivery pricing  
**Then** the platform SHALL use the approved fallback behavior and SHALL NOT invent a threshold.

### AC-FD-004.12 — Accessibility and Clarity

Threshold messages SHALL be readable, accessible and understandable without exposing internal pricing-rule details.

---

## Cross-Decision Dependencies

This policy interacts with:

- `BD-005` — Delivery-Charge Model
- `BD-010` — Multi-Branch Routing
- `BD-011` — Discounts and Loyalty Rules

Free-delivery qualification SHALL remain consistent with delivery pricing, branch routing, discounts and loyalty redemption.

---

## Policy-Blocked Values

The following values remain unresolved and SHALL NOT be invented:

1. Initial threshold amount
2. Threshold currency
3. Calculation basis
4. Discount treatment
5. Coupon treatment
6. Loyalty redemption treatment
7. Tax treatment
8. Delivery-charge exclusion rule
9. Eligible products and categories
10. Branch-specific values
11. Delivery-zone-specific values
12. Channel-specific values
13. Customer-segment rules
14. Promotional threshold authority
15. Promotion precedence
16. Approval role matrix
17. Material-change threshold
18. Review frequency
19. Review evidence requirements
20. Emergency suspension authority
21. Customer-facing wording
22. Fallback behavior when no rule applies
23. Rounding policy
24. Minimum order interaction

---

## Readiness Assessment

| Requirement | Behavior testable | Values blocked by policy |
|---|---:|---:|
| REQ-PRICE-FD-001 | Yes | Initial values, scopes and approval matrix |
| REQ-PRICE-FD-002 | Yes | Calculation basis and item treatment |
| REQ-PRICE-FD-003 | Yes | Review frequency and approval authority |
| REQ-PRICE-FD-004 | Yes | Customer wording and fallback behavior |

---

## Recommended Canonical Destinations

After business approval and cross-document review:

- `docs/02-requirements/Security/SETTINGS_REQUIREMENTS.md`
- `docs/02-requirements/Core/REQUIREMENTS.md`
- `docs/02-requirements/Applications/WEBSITE_REQUIREMENTS.md`
- `docs/02-requirements/Applications/MOBILE_APP_REQUIREMENTS.md`
- `docs/02-requirements/Applications/POS_REQUIREMENTS.md`
- `docs/02-requirements/Business/REPORTING_REQUIREMENTS.md`
- `docs/02-requirements/Business/CRM_REQUIREMENTS.md`

The canonical requirements SHALL explicitly reference `BD-012`.
