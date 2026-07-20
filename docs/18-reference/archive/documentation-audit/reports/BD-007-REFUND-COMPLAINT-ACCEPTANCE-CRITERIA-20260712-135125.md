# BD-007 Refund and Complaint Policy — Acceptance Criteria Draft

## Record Information

- **Business decision:** BD-007
- **Status:** DRAFT
- **Requirement IDs:** REQ-CX-RF-001 through REQ-CX-RF-004
- **ID collision status:** CLEAR
- **Canonical files changed:** No
- **Decision dependency:** Refund eligibility, evidence rules, compensation outcomes and approval limits remain unapproved
- **Implementation rule:** Existing refund and complaint workflows SHALL NOT be treated as an approved customer policy

---

# REQ-CX-RF-001 — Eligibility Matrix

## Requirement

The system SHALL support a configurable refund and complaint eligibility matrix.

## Acceptance Criteria

### AC-CX-RF-001.1 — Controlled Complaint Categories

The platform SHALL support an approved complaint-category list.

Possible categories MAY include:

- Missing item
- Wrong item
- Damaged packaging
- Cold food
- Quality issue
- Excessive delay
- Incorrect charge
- Payment issue
- Delivery issue
- Staff behavior
- Other

Only approved categories SHALL be customer-selectable.

### AC-CX-RF-001.2 — Eligibility by Order

**Given** a complaint is submitted  
**When** the system evaluates eligibility  
**Then** the complaint SHALL be linked to a valid order or explicitly recorded as a non-order complaint.

### AC-CX-RF-001.3 — Eligibility by Order Status

The eligibility matrix SHALL support rules based on order status, including:

- Accepted
- Preparing
- Ready
- Out for delivery
- Delivered
- Cancelled
- Refunded
- Partially refunded

### AC-CX-RF-001.4 — Time-Window Validation

**Given** an approved complaint time window exists  
**When** a customer submits after that window  
**Then** the platform SHALL either:

1. Reject the claim with an approved reason, or
2. Route it for authorized exception review.

### AC-CX-RF-001.5 — Payment-Method Context

Eligibility evaluation SHALL consider the original payment method when the resolution may affect refunds or reversals.

### AC-CX-RF-001.6 — Previous-Claim Context

The platform SHALL make previous claims available to authorized reviewers without automatically rejecting a customer solely because previous claims exist.

### AC-CX-RF-001.7 — Order-Value Context

The eligibility matrix SHALL support configurable rules based on:

- Order value
- Claimed item value
- Requested compensation value
- Customer claim history

### AC-CX-RF-001.8 — Transparent Decision Code

Eligibility evaluation SHALL produce a controlled decision code, such as:

- ELIGIBLE
- NOT_ELIGIBLE
- EVIDENCE_REQUIRED
- MANUAL_REVIEW_REQUIRED
- DUPLICATE_CLAIM
- POLICY_EXCEPTION_REQUIRED

### AC-CX-RF-001.9 — No Silent Rejection

A complaint SHALL NOT be silently discarded.

The customer or authorized staff SHALL receive a recorded status and reason.

---

# REQ-CX-RF-002 — Resolution Outcomes

## Requirement

The platform SHALL support policy-controlled complaint and refund outcomes.

## Acceptance Criteria

### AC-CX-RF-002.1 — Supported Outcomes

The platform SHALL be capable of representing:

- Full refund
- Partial refund
- Replacement
- Store credit
- Coupon
- Rejection
- Escalation
- No-fault service recovery

Only approved outcomes SHALL be enabled in production.

### AC-CX-RF-002.2 — Outcome Eligibility

**Given** a complaint is eligible  
**When** the platform presents resolution options  
**Then** only outcomes allowed by the active policy SHALL be available.

### AC-CX-RF-002.3 — Financial Limit Protection

A refund or compensation amount SHALL NOT exceed approved limits without authorized escalation.

### AC-CX-RF-002.4 — Partial Refund Calculation

**Given** a partial refund is selected  
**When** the amount is calculated  
**Then** the platform SHALL store:

- Eligible item amount
- Approved refund amount
- Adjustment reason
- Tax effect, when applicable
- Delivery-charge effect, when applicable

### AC-CX-RF-002.5 — Replacement Workflow

A replacement outcome SHALL define:

- Replacement item
- Quantity
- Branch
- Preparation responsibility
- Delivery or pickup method
- Expected completion time
- Inventory effect

### AC-CX-RF-002.6 — Store Credit

Store credit SHALL record:

- Credit amount
- Currency
- Expiry date, when applicable
- Redemption restrictions
- Issuing complaint
- Approver

### AC-CX-RF-002.7 — Coupon Outcome

A complaint-resolution coupon SHALL be:

- Uniquely identifiable
- Policy-scoped
- Time-limited, when required
- Auditable
- Protected against unauthorized reuse

### AC-CX-RF-002.8 — Rejection Reason

A rejected complaint SHALL require a controlled reason and customer-facing explanation.

### AC-CX-RF-002.9 — Escalation

The platform SHALL support escalation based on:

- Complaint severity
- Requested amount
- Customer risk
- Repeat issue
- Branch
- Management review requirement

### AC-CX-RF-002.10 — Single Resolution State

A complaint SHALL have one active primary resolution state at a time.

Additional compensations SHALL require a controlled adjustment record.

---

# REQ-CX-RF-003 — Approval Authority

## Requirement

Refund and compensation authority SHALL be configurable by amount, outcome, role, branch and complaint severity.

## Acceptance Criteria

### AC-CX-RF-003.1 — Role-Based Approval

The platform SHALL support approval permissions for roles such as:

- Customer support agent
- Shift supervisor
- Branch manager
- Finance approver
- Operations manager
- Founder or executive authority

The final role matrix SHALL remain configurable.

### AC-CX-RF-003.2 — Amount Thresholds

Approval rules SHALL support monetary thresholds.

Example behavior:

- Lower-value compensation may require one approver
- Higher-value compensation may require escalation
- Executive-level adjustments may require dual approval

Actual thresholds remain policy-blocked.

### AC-CX-RF-003.3 — Outcome-Based Approval

Different outcomes SHALL support different approval requirements.

For example:

- Coupon
- Store credit
- Partial refund
- Full refund
- Replacement
- Policy exception

### AC-CX-RF-003.4 — Branch Scope

A branch-level approver SHALL NOT approve complaints outside their authorized branch scope unless explicitly granted broader permission.

### AC-CX-RF-003.5 — Self-Approval Restriction

The platform SHALL support separation-of-duty rules preventing a user from approving their own high-risk or high-value action.

### AC-CX-RF-003.6 — Escalation on Limit Breach

**Given** a user attempts an action beyond their approval limit  
**When** they submit the decision  
**Then** the platform SHALL route it to the next authorized level.

### AC-CX-RF-003.7 — Approval Expiry

Pending approvals SHALL support expiry or escalation after a configurable period.

### AC-CX-RF-003.8 — Emergency Override

Emergency override SHALL require:

- Authorized role
- Mandatory reason
- Elevated audit logging
- Post-action review

### AC-CX-RF-003.9 — Approval Evidence

Each approval SHALL record:

- Complaint identifier
- Requested outcome
- Approved outcome
- Requested amount
- Approved amount
- Requesting user
- Approving user
- Reason
- Timestamp

---

# REQ-CX-RF-004 — Evidence and Audit

## Requirement

The system SHALL record complaint evidence, decisions, approvals, financial effects and customer communication.

## Acceptance Criteria

### AC-CX-RF-004.1 — Evidence Types

The platform SHALL support approved evidence types, including:

- Customer statement
- Photo
- Video
- Receipt
- Order item record
- Delivery timestamp
- Rider note
- Branch note
- Payment transaction record
- Call or chat reference

### AC-CX-RF-004.2 — Evidence Requirement by Category

The evidence requirement SHALL be configurable by complaint category and requested outcome.

### AC-CX-RF-004.3 — File Safety

Uploaded evidence SHALL be subject to:

- File-type validation
- Size limits
- Malware scanning
- Access control
- Retention rules

### AC-CX-RF-004.4 — Evidence Integrity

Evidence metadata SHALL record:

- Uploader
- Upload time
- File type
- File size
- Complaint identifier
- Integrity reference or checksum, when supported

### AC-CX-RF-004.5 — Complete Decision Record

Each resolved complaint SHALL retain:

- Complaint category
- Eligibility result
- Evidence reviewed
- Decision
- Outcome
- Approval
- Financial impact
- Customer communication
- Resolution timestamp

### AC-CX-RF-004.6 — Financial Traceability

A refund, credit, coupon or replacement with financial value SHALL create a traceable financial or inventory record.

### AC-CX-RF-004.7 — Customer Communication

The customer SHALL receive status communication for:

- Complaint received
- Evidence requested
- Under review
- Approved
- Rejected
- Resolved
- Escalated

### AC-CX-RF-004.8 — Communication Audit

Customer communications SHALL record:

- Channel
- Template or message reference
- Recipient
- Timestamp
- Delivery status
- Acting user or system actor

### AC-CX-RF-004.9 — Sensitive Data Protection

Complaint evidence and customer data SHALL only be accessible to authorized personnel.

### AC-CX-RF-004.10 — Retention

Complaint and refund records SHALL follow an approved retention schedule.

### AC-CX-RF-004.11 — Reporting

Authorized reporting SHALL support:

- Complaint volume
- Complaint category
- Branch
- Resolution type
- Refund amount
- Resolution time
- Approval level
- Repeat complaint rate
- Customer satisfaction outcome

### AC-CX-RF-004.12 — Immutable Audit History

Material complaint and refund events SHALL NOT be deleted or overwritten without a traceable correction or retention-policy action.

---

## Cross-Decision Dependencies

This policy interacts with:

- `BD-006` — Production Payment Methods
- `BD-008` — Order Cancellation Policy
- `BD-009` — Peak-Hour Handling
- `BD-011` — Discount and Loyalty Rules

A refund or compensation rule SHALL remain consistent with payment, cancellation, operational and loyalty behavior.

---

## Policy-Blocked Values

The following values remain unresolved and SHALL NOT be invented:

1. Complaint submission time windows
2. Category-specific evidence requirements
3. Automatic eligibility rules
4. Refund eligibility by order state
5. Compensation outcome matrix
6. Partial-refund limits
7. Store-credit expiry
8. Coupon restrictions
9. Approval amount thresholds
10. Role approval matrix
11. Escalation deadlines
12. Resolution service-level targets
13. Repeat-claim review rules
14. Abuse-prevention thresholds
15. Customer compensation after excessive delay
16. Complaint-record retention period
17. Emergency override authority

---

## Readiness Assessment

| Requirement | Behavior testable | Values blocked by policy |
|---|---:|---:|
| REQ-CX-RF-001 | Yes | Eligibility and time-window rules |
| REQ-CX-RF-002 | Yes | Enabled outcomes and financial limits |
| REQ-CX-RF-003 | Yes | Approval roles and thresholds |
| REQ-CX-RF-004 | Yes | Evidence matrix, retention and service levels |

---

## Recommended Canonical Destinations

After business approval and cross-document review:

- `docs/02-requirements/Business/CRM_REQUIREMENTS.md`
- `docs/02-requirements/Operations/ORDER_MANAGEMENT_REQUIREMENTS.md`
- `docs/02-requirements/Security/PAYMENT_GATEWAY_REQUIREMENTS.md`
- `docs/02-requirements/Applications/ADMIN_PANEL_REQUIREMENTS.md`
- `docs/02-requirements/Applications/POS_REQUIREMENTS.md`
- `docs/02-requirements/Security/AUDIT_LOG_REQUIREMENTS.md`
- `docs/02-requirements/Security/NOTIFICATION_REQUIREMENTS.md`

The canonical requirements SHALL explicitly reference `BD-007`.
