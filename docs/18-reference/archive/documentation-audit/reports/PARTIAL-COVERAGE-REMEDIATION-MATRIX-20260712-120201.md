# Telepizza Partial-Coverage Remediation Matrix

## Record Information

- **Status:** OPEN
- **Scope:** BD-005, BD-006, BD-007, BD-008, BD-010, BD-011, BD-012
- **Purpose:** Convert partial keyword/function coverage into complete, testable, decision-traceable requirements
- **Rule:** Existing functionality SHALL NOT be treated as policy approval

---

## Remediation Summary

| Decision | Current Coverage | Main Gap | Launch Impact |
|---|---|---|---|
| BD-005 | Delivery-charge settings exist | Calculation and override model undefined | High |
| BD-006 | Payment methods are specified | Production enablement and fallback policy unapproved | High |
| BD-007 | Refund and complaint workflows exist | Eligibility, evidence, outcomes and authority undefined | High |
| BD-008 | Cancel-order actions exist | State-based rules, timing and refund effects missing | High |
| BD-010 | Branch assignment and nearest-branch behavior exist | Routing precedence and fallback rules undefined | High |
| BD-011 | Loyalty and discount modules are extensive | Commercial rule set unresolved | Medium to High |
| BD-012 | Threshold is configurable | Value-setting, approval and review policy missing | Medium |

---

# BD-005 — Delivery-Charge Model

## Existing Coverage

Existing requirements mention:

- Delivery charge
- Free-delivery threshold
- Delivery settings
- Checkout display

## Missing Requirements

### REQ-PRICE-DC-001 — Delivery-Charge Strategy

The platform SHALL support a configurable delivery-charge strategy.

Supported strategies MAY include:

- Flat fee
- Zone-based fee
- Distance-based fee
- Free delivery above threshold
- Hybrid strategy

Only approved strategies SHALL be enabled in production.

**Traceability:** BD-005

### REQ-PRICE-DC-002 — Calculation Inputs

Delivery-charge calculation SHALL support configurable inputs such as:

- Branch
- Delivery zone
- Distance
- Order subtotal
- Time window
- Promotion
- Customer segment

**Traceability:** BD-005

### REQ-PRICE-DC-003 — Price Disclosure

The delivery charge SHALL be shown before final order confirmation.

The system SHALL disclose:

- Delivery fee
- Discount or waiver
- Applied rule
- Final payable amount

**Traceability:** BD-005

### REQ-PRICE-DC-004 — Override Governance

Manual delivery-charge overrides SHALL require:

- Authorized role
- Reason
- Audit record
- Optional approval
- Customer-visible final amount

**Traceability:** BD-005

### Open Decisions

- Initial production model
- Initial fee or zone values
- Override roles
- Promotion precedence
- Tax treatment

### Recommended Destinations

- `docs/02-requirements/Core/REQUIREMENTS.md`
- `docs/02-requirements/Applications/WEBSITE_REQUIREMENTS.md`
- `docs/02-requirements/Applications/MOBILE_APP_REQUIREMENTS.md`
- `docs/02-requirements/Security/SETTINGS_REQUIREMENTS.md`

---

# BD-006 — Production Payment Methods

## Existing Coverage

Requirements already specify:

- Cash on Delivery
- JazzCash
- EasyPaisa
- Payment gateway configuration
- Refund-related payment workflows

## Missing Requirements

### REQ-PAY-PROD-001 — Production Enablement

Each payment method SHALL have an independently configurable production status.

Supported statuses SHALL include:

- DISABLED
- TEST
- PILOT
- ACTIVE
- SUSPENDED

**Traceability:** BD-006

### REQ-PAY-PROD-002 — Channel Availability

Payment methods SHALL be configurable by:

- Website
- Mobile application
- POS
- WhatsApp ordering
- Branch
- Delivery zone

**Traceability:** BD-006

### REQ-PAY-PROD-003 — Failure Handling

For digital-payment failure, the platform SHALL define:

- Retry behavior
- Timeout behavior
- Duplicate-payment prevention
- Fallback payment options
- Customer notification
- Reconciliation status

**Traceability:** BD-006

### REQ-PAY-PROD-004 — Production Approval

A payment method SHALL NOT move to ACTIVE without recorded business and technical approval.

**Traceability:** BD-006

### Open Decisions

- Initial active methods
- Card-payment deferral
- Gateway providers
- Failure fallback to COD
- Refund timelines by method

### Recommended Destinations

- `docs/02-requirements/Security/PAYMENT_GATEWAY_REQUIREMENTS.md`
- `docs/02-requirements/Core/REQUIREMENTS.md`
- Application-specific requirements

---

# BD-007 — Refund and Complaint Policy

## Existing Coverage

Current requirements define:

- Refund request
- Refund approval
- Refund reasons
- Refund history
- Complaint management
- Store credit
- Customer support workflows

## Missing Requirements

### REQ-CX-RF-001 — Eligibility Matrix

The system SHALL support a configurable refund and complaint eligibility matrix.

The matrix SHALL consider:

- Complaint category
- Order status
- Time since delivery
- Evidence
- Payment method
- Previous claims
- Order value

**Traceability:** BD-007

### REQ-CX-RF-002 — Resolution Outcomes

Supported outcomes SHALL include:

- Full refund
- Partial refund
- Replacement
- Store credit
- Coupon
- Rejection
- Escalation

Enabled outcomes SHALL be policy-controlled.

**Traceability:** BD-007

### REQ-CX-RF-003 — Approval Authority

Refund authority SHALL be configurable by:

- Amount
- Outcome
- Role
- Branch
- Complaint severity

**Traceability:** BD-007

### REQ-CX-RF-004 — Evidence and Audit

The system SHALL record:

- Complaint details
- Evidence
- Decision
- Approver
- Financial effect
- Customer communication
- Resolution timestamp

**Traceability:** BD-007

### Open Decisions

- Eligibility rules
- Evidence requirements
- Resolution deadlines
- Approval limits
- Compensation policy
- Abuse prevention

### Recommended Destinations

- `docs/02-requirements/Business/CRM_REQUIREMENTS.md`
- `docs/02-requirements/Operations/ORDER_MANAGEMENT_REQUIREMENTS.md`
- `docs/02-requirements/Security/PAYMENT_GATEWAY_REQUIREMENTS.md`

---

# BD-008 — Order-Cancellation Policy

## Existing Coverage

Existing requirements provide cancel-order actions in mobile, POS and core requirements.

## Missing Requirements

### REQ-OMS-CAN-001 — Cancellation by State

The system SHALL define cancellation eligibility by order state.

Possible states include:

- Draft
- Submitted
- Accepted
- Preparing
- Ready
- Assigned to rider
- Out for delivery
- Delivered

**Traceability:** BD-008

### REQ-OMS-CAN-002 — Cancellation Authority

Cancellation authority SHALL be configurable by:

- Order state
- Role
- Channel
- Payment method
- Time elapsed

**Traceability:** BD-008

### REQ-OMS-CAN-003 — Financial Effect

Cancellation SHALL determine:

- Full refund
- Partial refund
- No refund
- Store credit
- Cancellation fee

The selected outcome SHALL follow approved policy.

**Traceability:** BD-008, BD-007

### REQ-OMS-CAN-004 — Operational Effects

Cancellation SHALL update, as applicable:

- Kitchen queue
- Inventory reservation
- Rider assignment
- Payment status
- Customer notification
- Audit log

**Traceability:** BD-008

### Open Decisions

- Customer cancellation window
- Post-preparation cancellation
- Rider-assignment cutoff
- Cancellation fee
- Manager overrides

### Recommended Destination

- `docs/02-requirements/Operations/ORDER_MANAGEMENT_REQUIREMENTS.md`

---

# BD-010 — Multi-Branch Routing

## Existing Coverage

Requirements mention:

- Nearest branch
- Delivery zones
- Branch assignment
- Multi-branch support
- Branch configuration

## Missing Requirements

### REQ-OMS-BR-001 — Routing Eligibility

A branch SHALL be eligible for an order only when:

- Branch is open
- Ordering channel is active
- Delivery address is serviceable
- Required menu items are available
- Branch is accepting the order type

**Traceability:** BD-010, BD-001, BD-009

### REQ-OMS-BR-002 — Routing Precedence

The platform SHALL use an approved, configurable routing precedence.

Possible factors include:

- Zone ownership
- Distance
- Preparation estimate
- Delivery estimate
- Stock availability
- Capacity state
- Customer-selected branch

**Traceability:** BD-010

### REQ-OMS-BR-003 — Routing Fallback

When the preferred branch is unavailable, the platform SHALL:

- Evaluate eligible alternatives
- Recalculate fee and ETA
- Inform the customer before confirmation
- Avoid silent reassignment after acceptance

**Traceability:** BD-010, BD-005

### REQ-OMS-BR-004 — Manual Reassignment

Authorized reassignment SHALL require:

- Reason
- Previous branch
- New branch
- Financial impact
- ETA impact
- Customer notification
- Audit record

**Traceability:** BD-010

### Open Decisions

- Primary routing factor
- Customer branch-selection rights
- Cross-zone routing
- Capacity weighting
- Reassignment policy

### Recommended Destinations

- `docs/02-requirements/Operations/ORDER_MANAGEMENT_REQUIREMENTS.md`
- `docs/02-requirements/Applications/WEBSITE_REQUIREMENTS.md`
- `docs/02-requirements/Applications/MOBILE_APP_REQUIREMENTS.md`

---

# BD-011 — Discounts and Loyalty Rules

## Existing Coverage

Existing documentation includes:

- Loyalty accounts
- Points
- Reward catalog
- Redemption
- Discounts
- Loyalty dashboards
- CRM synchronization

## Missing Requirements

### REQ-LOY-RULE-001 — Earning Rules

Loyalty earning SHALL be configurable by:

- Order subtotal
- Product
- Category
- Channel
- Branch
- Customer segment
- Promotion

**Traceability:** BD-011

### REQ-LOY-RULE-002 — Redemption Rules

Redemption SHALL define:

- Minimum balance
- Maximum redemption
- Eligible products
- Eligible channels
- Partial redemption
- Expiry behavior

**Traceability:** BD-011

### REQ-LOY-RULE-003 — Discount Stacking

The pricing engine SHALL apply an approved discount-stacking policy.

The policy SHALL define compatibility among:

- Coupon
- Loyalty redemption
- Promotional discount
- Employee discount
- Manager discount
- Free delivery

**Traceability:** BD-011, BD-012

### REQ-LOY-RULE-004 — Expiry and Reversal

The platform SHALL support:

- Points expiry
- Reward expiry
- Refund-related points reversal
- Cancellation-related points reversal
- Manual adjustment with audit

**Traceability:** BD-011, BD-007, BD-008

### REQ-LOY-RULE-005 — Governance

Loyalty-rule changes SHALL require:

- Effective date
- Version
- Approver
- Audit history
- Customer-impact review

**Traceability:** BD-011

### Open Decisions

- Earning ratio
- Redemption value
- Expiry duration
- Discount stacking
- Birthday rewards
- Branch-specific offers
- Manager overrides

### Recommended Destinations

- `docs/02-requirements/Core/REQUIREMENTS.md`
- `docs/02-requirements/Business/CRM_REQUIREMENTS.md`
- `docs/02-requirements/Applications/ADMIN_PANEL_REQUIREMENTS.md`
- Application requirements

---

# BD-012 — Free-Delivery Threshold

## Existing Coverage

Existing requirements mention:

- Free-delivery threshold
- Average order value
- Configurable settings

## Missing Requirements

### REQ-PRICE-FD-001 — Threshold Configuration

The threshold SHALL be configurable by:

- Branch
- Delivery zone
- Channel
- Promotion
- Customer segment
- Effective period

**Traceability:** BD-012

### REQ-PRICE-FD-002 — Threshold Basis

Threshold evaluation SHALL define whether qualifying value is based on:

- Gross subtotal
- Net subtotal
- Subtotal after discount
- Subtotal before tax
- Subtotal excluding delivery charge

**Traceability:** BD-012

### REQ-PRICE-FD-003 — Approval and Review

Threshold changes SHALL require:

- Authorized approver
- Effective date
- Reason
- Previous value
- New value
- Scheduled review date

**Traceability:** BD-012

### REQ-PRICE-FD-004 — Customer Disclosure

Checkout SHALL show:

- Current threshold
- Remaining amount to qualify
- Applied free-delivery status
- Conditions or exclusions

**Traceability:** BD-012

### Open Decisions

- Initial threshold
- Calculation basis
- Review frequency
- Eligible branches and zones
- Promotion interaction

### Recommended Destinations

- `docs/02-requirements/Security/SETTINGS_REQUIREMENTS.md`
- Website and mobile requirements
- Pricing-related core requirements

---

## Consolidated Remediation Count

| Decision | Proposed Requirements |
|---|---:|
| BD-005 | 4 |
| BD-006 | 4 |
| BD-007 | 4 |
| BD-008 | 4 |
| BD-010 | 4 |
| BD-011 | 5 |
| BD-012 | 4 |
| **Total** | **29** |

---

## Governance Rule

These proposed requirements are audit remediation records only.

They SHALL NOT be copied into canonical requirements documents until:

1. The related business decision is approved or explicitly marked as a configurable working assumption.
2. Requirement IDs are checked for collisions.
3. Acceptance criteria are added.
4. Cross-document impact is reviewed.
5. A backup and Git checkpoint exist.
