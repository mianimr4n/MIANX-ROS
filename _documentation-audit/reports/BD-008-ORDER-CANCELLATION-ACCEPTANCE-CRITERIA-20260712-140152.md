# BD-008 Order Cancellation Policy — Acceptance Criteria Draft

## Record Information

- **Business decision:** BD-008
- **Status:** DRAFT
- **Requirement IDs:** REQ-OMS-CAN-001 through REQ-OMS-CAN-004
- **ID collision status:** CLEAR
- **Canonical files changed:** No
- **Decision dependency:** Cancellation windows, state eligibility, refund effects and override authority remain unapproved
- **Implementation rule:** Existing cancel-order actions SHALL NOT be treated as an approved cancellation policy

---

# REQ-OMS-CAN-001 — Cancellation by State

## Requirement

The system SHALL define cancellation eligibility by order state.

## Acceptance Criteria

### AC-OMS-CAN-001.1 — Controlled State Matrix

The platform SHALL support a configurable cancellation matrix for:

- Draft
- Submitted
- Accepted
- Preparing
- Ready
- Assigned to rider
- Out for delivery
- Delivered
- Cancelled
- Refunded
- Partially refunded

### AC-OMS-CAN-001.2 — Draft Cancellation

**Given** an order is in `Draft`  
**When** the customer abandons or cancels it  
**Then** no confirmed order, payment capture or kitchen task SHALL be created.

### AC-OMS-CAN-001.3 — Submitted Cancellation

**Given** an order is submitted but not yet accepted  
**When** cancellation is allowed by the active policy  
**Then** the order SHALL move to a controlled cancelled state.

### AC-OMS-CAN-001.4 — Accepted Order Evaluation

**Given** an order is accepted  
**When** cancellation is requested  
**Then** the platform SHALL evaluate:

- Time elapsed
- Kitchen progress
- Payment method
- Rider assignment
- Cancellation authority
- Refund consequences

### AC-OMS-CAN-001.5 — Preparing-State Protection

**Given** food preparation has started  
**When** a customer requests cancellation  
**Then** the platform SHALL NOT automatically approve it unless the active policy permits that outcome.

### AC-OMS-CAN-001.6 — Ready-State Protection

**Given** an order is ready  
**When** cancellation is requested  
**Then** the request SHALL require the approved role or exception path.

### AC-OMS-CAN-001.7 — Rider-Assigned Evaluation

**Given** a rider has been assigned  
**When** cancellation is requested  
**Then** rider impact and dispatch status SHALL be evaluated before approval.

### AC-OMS-CAN-001.8 — Out-for-Delivery Restriction

**Given** an order is out for delivery  
**When** a customer requests cancellation  
**Then** the platform SHALL apply the approved failed-delivery or exception workflow rather than silently cancelling the order.

### AC-OMS-CAN-001.9 — Delivered Order Protection

A delivered order SHALL NOT be cancelled.

Post-delivery issues SHALL use complaint, refund or service-recovery workflows.

### AC-OMS-CAN-001.10 — Terminal-State Protection

An order already marked `Cancelled` or `Refunded` SHALL NOT be cancelled again.

### AC-OMS-CAN-001.11 — Decision Code

Every cancellation evaluation SHALL produce a controlled result such as:

- CANCELLATION_ALLOWED
- CANCELLATION_DENIED
- MANUAL_APPROVAL_REQUIRED
- POLICY_EXCEPTION_REQUIRED
- ALREADY_CANCELLED
- POST_DELIVERY_COMPLAINT_REQUIRED

### AC-OMS-CAN-001.12 — No Silent State Change

Cancellation SHALL NOT occur without a recorded event, reason and actor.

---

# REQ-OMS-CAN-002 — Cancellation Authority

## Requirement

Cancellation authority SHALL be configurable by order state, role, channel, payment method and time elapsed.

## Acceptance Criteria

### AC-OMS-CAN-002.1 — Customer Authority

The customer SHALL only be able to cancel orders within the approved customer-cancellation scope.

### AC-OMS-CAN-002.2 — Staff Authority

The platform SHALL support cancellation permissions for roles such as:

- Customer support agent
- POS operator
- Shift supervisor
- Branch manager
- Operations manager
- Finance approver
- Founder or executive authority

The final role matrix SHALL remain configurable.

### AC-OMS-CAN-002.3 — State-Based Permission

A role authorized to cancel a submitted order SHALL NOT automatically be authorized to cancel an order already preparing or out for delivery.

### AC-OMS-CAN-002.4 — Channel Enforcement

Cancellation permissions SHALL be enforced consistently across:

- Website
- Mobile application
- POS
- Admin panel
- WhatsApp ordering
- Support tools

### AC-OMS-CAN-002.5 — Payment-Method Context

Cancellation authority SHALL account for whether payment was:

- Unpaid
- COD
- Authorized
- Captured
- Partially refunded
- Fully refunded
- Reconciliation pending

### AC-OMS-CAN-002.6 — Time-Window Validation

**Given** a cancellation window applies  
**When** a request is submitted outside that window  
**Then** the platform SHALL deny it or route it for approved exception review.

### AC-OMS-CAN-002.7 — Limit Breach Escalation

**Given** a user attempts a cancellation beyond their authority  
**When** they submit the request  
**Then** the platform SHALL route it to the next authorized approver.

### AC-OMS-CAN-002.8 — Self-Approval Restriction

The platform SHALL support separation-of-duty rules for high-value or high-risk cancellations.

### AC-OMS-CAN-002.9 — Mandatory Reason

Every staff-initiated cancellation SHALL require a controlled reason.

### AC-OMS-CAN-002.10 — Emergency Override

Emergency cancellation SHALL require:

- Authorized role
- Mandatory reason
- Elevated audit logging
- Post-action review

---

# REQ-OMS-CAN-003 — Financial Effect

## Requirement

Cancellation SHALL determine the approved financial effect.

## Acceptance Criteria

### AC-OMS-CAN-003.1 — Financial Outcome Matrix

The platform SHALL support policy-controlled outcomes including:

- Full refund
- Partial refund
- No refund
- Store credit
- Cancellation fee
- Manual review

### AC-OMS-CAN-003.2 — Unpaid Order

**Given** an unpaid order is cancelled  
**When** no financial transaction exists  
**Then** no refund transaction SHALL be created.

### AC-OMS-CAN-003.3 — COD Order

**Given** a COD order is cancelled before payment collection  
**When** cancellation completes  
**Then** the order SHALL not create a refund but SHALL record the cancelled COD value.

### AC-OMS-CAN-003.4 — Authorized but Uncaptured Payment

**Given** a payment is authorized but not captured  
**When** cancellation is approved  
**Then** the platform SHALL void or release the authorization according to provider capability.

### AC-OMS-CAN-003.5 — Captured Payment

**Given** payment has been captured  
**When** cancellation is approved  
**Then** the platform SHALL create the approved refund, credit or exception workflow.

### AC-OMS-CAN-003.6 — Partial Refund

A partial refund SHALL record:

- Original payable amount
- Approved refund amount
- Retained amount
- Reason
- Tax effect
- Delivery-charge effect
- Approver

### AC-OMS-CAN-003.7 — Cancellation Fee

A cancellation fee SHALL NOT be applied unless:

- The policy permits it
- The fee is disclosed
- The calculation is auditable
- The customer-visible amount is updated

### AC-OMS-CAN-003.8 — No Duplicate Refund

A cancellation workflow SHALL NOT generate duplicate refunds for the same financial obligation.

### AC-OMS-CAN-003.9 — Loyalty Reversal

Cancellation SHALL reverse or adjust loyalty effects according to approved loyalty rules.

### AC-OMS-CAN-003.10 — Coupon Restoration

The platform SHALL apply the approved policy for restoring or consuming coupons after cancellation.

### AC-OMS-CAN-003.11 — Delivery-Charge Effect

Cancellation SHALL define whether the delivery charge is:

- Fully refunded
- Partially refunded
- Retained
- Not applicable

### AC-OMS-CAN-003.12 — Financial Traceability

Every financial consequence SHALL reference:

- Order
- Cancellation event
- Payment transaction
- Refund or credit record
- Acting user
- Approving user
- Timestamp

---

# REQ-OMS-CAN-004 — Operational Effects

## Requirement

Cancellation SHALL update all affected operational systems consistently.

## Acceptance Criteria

### AC-OMS-CAN-004.1 — Kitchen Queue

**Given** an order is cancelled before completion  
**When** the cancellation is approved  
**Then** the kitchen queue SHALL reflect the cancellation state.

### AC-OMS-CAN-004.2 — Preparation Protection

The system SHALL NOT silently remove a preparing order without notifying authorized kitchen staff.

### AC-OMS-CAN-004.3 — Inventory Reservation

Cancellation SHALL release or adjust reserved inventory according to item-preparation state.

### AC-OMS-CAN-004.4 — Prepared Inventory

Prepared food SHALL NOT be returned to sellable inventory automatically.

### AC-OMS-CAN-004.5 — Rider Assignment

If a rider is assigned, cancellation SHALL update:

- Rider task
- Dispatch queue
- Delivery status
- Rider notification
- Compensation or exception status, when applicable

### AC-OMS-CAN-004.6 — Customer Notification

The customer SHALL receive a cancellation result stating:

- Whether cancellation was approved
- Financial outcome
- Refund status, when applicable
- Expected refund timeline, when approved
- Next support action, when required

### AC-OMS-CAN-004.7 — Branch Notification

The responsible branch SHALL be notified when a cancellation affects kitchen, inventory or dispatch operations.

### AC-OMS-CAN-004.8 — Order History

The order history SHALL retain:

- Previous state
- Cancellation state
- Reason
- Requesting actor
- Approving actor
- Timestamp

### AC-OMS-CAN-004.9 — Event Publication

A confirmed cancellation SHALL publish the required internal event for downstream systems.

Possible consumers include:

- Kitchen
- Inventory
- Payments
- CRM
- Loyalty
- Rider dispatch
- Reporting
- Notifications

### AC-OMS-CAN-004.10 — Idempotency

Repeated processing of the same cancellation event SHALL NOT duplicate operational or financial effects.

### AC-OMS-CAN-004.11 — Partial Failure Handling

**Given** one downstream update fails  
**When** cancellation processing continues  
**Then** the platform SHALL record the failure and route it for recovery rather than presenting an unverified final state.

### AC-OMS-CAN-004.12 — Auditability

The cancellation audit record SHALL include:

- Order identifier
- Branch
- Channel
- Previous state
- Final state
- Requesting actor
- Approving actor
- Reason
- Financial effect
- Inventory effect
- Rider effect
- Customer notification status
- Timestamp

### AC-OMS-CAN-004.13 — Reporting

Authorized reporting SHALL support:

- Cancellation count
- Cancellation rate
- Cancellation reason
- Order state at cancellation
- Branch
- Channel
- Financial loss
- Refund amount
- Rider impact
- Preparation waste

---

## Cross-Decision Dependencies

This policy interacts with:

- `BD-006` — Production Payment Methods
- `BD-007` — Refund and Complaint Policy
- `BD-009` — Peak-Hour Handling
- `BD-010` — Multi-Branch Routing
- `BD-011` — Discount and Loyalty Rules

Cancellation behavior SHALL remain consistent with payment, refund, peak-hour, routing and loyalty rules.

---

## Policy-Blocked Values

The following values remain unresolved and SHALL NOT be invented:

1. Customer cancellation window
2. Staff cancellation window
3. State-by-state eligibility matrix
4. Post-preparation cancellation rule
5. Ready-order cancellation rule
6. Rider-assignment cutoff
7. Out-for-delivery exception rule
8. Approval role matrix
9. High-value cancellation threshold
10. Refund outcome by order state
11. Cancellation fee
12. Delivery-charge refund treatment
13. Coupon restoration rule
14. Loyalty reversal rule
15. Failed-delivery relationship
16. Emergency override authority
17. Refund timeline by payment method
18. Rider compensation rule
19. Prepared-food waste treatment
20. Customer-facing cancellation wording

---

## Readiness Assessment

| Requirement | Behavior testable | Values blocked by policy |
|---|---:|---:|
| REQ-OMS-CAN-001 | Yes | State eligibility and time windows |
| REQ-OMS-CAN-002 | Yes | Role matrix and escalation limits |
| REQ-OMS-CAN-003 | Yes | Refund, fee and credit outcomes |
| REQ-OMS-CAN-004 | Yes | Waste, rider and recovery policies |

---

## Recommended Canonical Destinations

After business approval and cross-document review:

- `docs/02-requirements/Operations/ORDER_MANAGEMENT_REQUIREMENTS.md`
- `docs/02-requirements/Core/REQUIREMENTS.md`
- `docs/02-requirements/Applications/WEBSITE_REQUIREMENTS.md`
- `docs/02-requirements/Applications/MOBILE_APP_REQUIREMENTS.md`
- `docs/02-requirements/Applications/POS_REQUIREMENTS.md`
- `docs/02-requirements/Applications/RIDER_APP_REQUIREMENTS.md`
- `docs/02-requirements/Security/PAYMENT_GATEWAY_REQUIREMENTS.md`
- `docs/02-requirements/Security/AUDIT_LOG_REQUIREMENTS.md`
- `docs/02-requirements/Security/NOTIFICATION_REQUIREMENTS.md`

The canonical requirements SHALL explicitly reference `BD-008`.
