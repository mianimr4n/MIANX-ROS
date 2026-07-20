# BD-006 Production Payment Methods — Acceptance Criteria Draft

## Record Information

- **Business decision:** BD-006
- **Status:** DRAFT
- **Requirement IDs:** REQ-PAY-PROD-001 through REQ-PAY-PROD-004
- **ID collision status:** CLEAR
- **Canonical files changed:** No
- **Current working assumption:** COD, JazzCash and EasyPaisa may be considered for V1; final production approval remains pending
- **Implementation rule:** A documented payment method SHALL NOT be treated as production-approved merely because its functional requirements exist

---

# REQ-PAY-PROD-001 — Production Enablement

## Requirement

Each payment method SHALL have an independently configurable production status.

Supported statuses SHALL include:

- DISABLED
- TEST
- PILOT
- ACTIVE
- SUSPENDED

## Acceptance Criteria

### AC-PAY-001.1 — Independent Status

**Given** multiple payment methods exist  
**When** an authorized administrator changes one method’s status  
**Then** the status of all other payment methods SHALL remain unchanged.

### AC-PAY-001.2 — Disabled Method

**Given** a payment method has status `DISABLED`  
**When** a customer requests available payment methods  
**Then** that method SHALL NOT be offered for new orders.

### AC-PAY-001.3 — Test Method

**Given** a payment method has status `TEST`  
**When** a normal production customer opens checkout  
**Then** the method SHALL NOT be available unless the customer or session is explicitly authorized for testing.

### AC-PAY-001.4 — Pilot Method

**Given** a payment method has status `PILOT`  
**When** checkout evaluates availability  
**Then** the method SHALL only be offered within its approved pilot scope.

Pilot scope SHALL support configuration by:

- Branch
- Channel
- Customer group
- Date range
- Delivery zone

### AC-PAY-001.5 — Active Method

**Given** a payment method has status `ACTIVE`  
**When** all channel, branch and risk conditions are satisfied  
**Then** the method SHALL be available for eligible production orders.

### AC-PAY-001.6 — Suspended Method

**Given** an active payment method is changed to `SUSPENDED`  
**When** a new checkout begins  
**Then** the method SHALL no longer be offered.

Existing transactions SHALL remain traceable and reconcilable.

### AC-PAY-001.7 — Status Audit

Every status change SHALL record:

- Payment method
- Previous status
- New status
- Acting user
- Approving user, when required
- Reason
- Timestamp
- Effective time
- Scope

### AC-PAY-001.8 — No Code Deployment

Changing a payment-method production status SHALL NOT require an application code deployment.

---

# REQ-PAY-PROD-002 — Channel Availability

## Requirement

Payment methods SHALL be configurable by channel and operational scope.

## Acceptance Criteria

### AC-PAY-002.1 — Channel-Level Configuration

The platform SHALL support independent payment-method availability for:

- Website
- Mobile application
- POS
- WhatsApp ordering
- Other approved conversational channels

### AC-PAY-002.2 — Branch-Level Configuration

**Given** a payment method is enabled for one branch and disabled for another  
**When** customers order from each branch  
**Then** checkout SHALL return the correct branch-specific payment options.

### AC-PAY-002.3 — Delivery-Zone Configuration

**Given** a payment method is restricted by delivery zone  
**When** the delivery address is outside the approved zone  
**Then** the method SHALL NOT be offered.

### AC-PAY-002.4 — Order-Type Configuration

The platform SHALL support payment-method availability by order type, including:

- Delivery
- Takeaway
- Dine-in
- Curbside pickup

### AC-PAY-002.5 — Eligibility Recalculation

**Given** a customer changes branch, address, order type or channel context  
**When** checkout recalculates  
**Then** payment-method availability SHALL be refreshed.

### AC-PAY-002.6 — Server-Side Enforcement

A client application SHALL NOT be able to submit a payment method that is not eligible for the current order context.

### AC-PAY-002.7 — Consistent Source of Truth

All customer and staff channels SHALL obtain payment-method availability from the same authoritative payment-configuration service.

---

# REQ-PAY-PROD-003 — Failure Handling

## Requirement

The platform SHALL handle digital-payment failures safely and consistently.

## Acceptance Criteria

### AC-PAY-003.1 — Failure Classification

A failed digital-payment attempt SHALL be classified using a controlled status or error code.

Supported classifications SHOULD include:

- Customer cancellation
- Provider rejection
- Timeout
- Network failure
- Invalid credentials
- Insufficient funds
- Duplicate transaction
- Unknown provider response
- Reconciliation pending

### AC-PAY-003.2 — Order Confirmation Protection

**Given** payment authorization has not been confirmed  
**When** checkout completes  
**Then** the order SHALL NOT be marked as fully paid.

### AC-PAY-003.3 — Duplicate Prevention

**Given** a payment request is retried  
**When** the same idempotency key is received  
**Then** the platform SHALL NOT create a duplicate financial transaction.

### AC-PAY-003.4 — Retry Governance

The platform SHALL support configurable retry behavior based on:

- Payment method
- Failure type
- Maximum attempts
- Retry interval
- Transaction state

### AC-PAY-003.5 — Timeout Handling

**Given** a provider response times out  
**When** final transaction status is unknown  
**Then** the payment SHALL enter a reconciliation-pending state rather than being silently marked failed or successful.

### AC-PAY-003.6 — Fallback Options

**Given** a digital payment fails  
**When** an approved fallback method is available  
**Then** the customer MAY be offered the fallback before order abandonment.

Fallback behavior SHALL be policy-controlled.

### AC-PAY-003.7 — COD Fallback Protection

Digital-payment failure SHALL NOT automatically convert an order to COD unless:

- COD is eligible for the order
- The customer explicitly confirms the change
- The change is recorded
- The final payable amount is unchanged or clearly redisclosed

### AC-PAY-003.8 — Customer Notification

The customer SHALL receive a clear payment-result message without exposing sensitive provider or security details.

### AC-PAY-003.9 — Transaction Traceability

Each payment attempt SHALL record:

- Order identifier
- Payment method
- Provider
- Internal transaction identifier
- Provider reference, when available
- Amount
- Currency
- Status
- Failure code
- Attempt number
- Timestamp

### AC-PAY-003.10 — Reconciliation

Transactions with unknown or pending status SHALL appear in an authorized reconciliation workflow.

### AC-PAY-003.11 — No Double Charge

A customer SHALL NOT be charged more than once for the same payable order amount unless an authorized additional-charge workflow is used.

---

# REQ-PAY-PROD-004 — Production Approval

## Requirement

A payment method SHALL NOT move to `ACTIVE` without recorded business and technical approval.

## Acceptance Criteria

### AC-PAY-004.1 — Approval Gate

**Given** a payment method has not received all required approvals  
**When** an administrator attempts to set its status to `ACTIVE`  
**Then** the system SHALL reject the activation.

### AC-PAY-004.2 — Required Approval Types

Production activation SHALL support approval requirements for:

- Business owner
- Finance owner
- Technical owner
- Security owner
- Operations owner, when applicable

The final approval matrix SHALL remain configurable.

### AC-PAY-004.3 — Technical Readiness Evidence

Activation SHALL support recording evidence for:

- Successful integration testing
- Credential validation
- Webhook or callback validation
- Failure-path testing
- Refund testing
- Reconciliation testing
- Monitoring readiness

### AC-PAY-004.4 — Business Readiness Evidence

Activation SHALL support recording:

- Approved fee structure
- Settlement terms
- Refund timelines
- Supported branches
- Supported channels
- Customer-support procedure

### AC-PAY-004.5 — Credential Protection

Production credentials SHALL NOT be stored in source code or exposed in approval records.

### AC-PAY-004.6 — Effective Activation Time

An approved activation SHALL support an effective date and time.

### AC-PAY-004.7 — Emergency Suspension

Authorized personnel SHALL be able to suspend an active payment method without waiting for a normal release cycle.

### AC-PAY-004.8 — Suspension Notification

When a production payment method is suspended, relevant operational, finance and support personnel SHALL be notified.

### AC-PAY-004.9 — Activation Audit

The system SHALL retain:

- Payment method
- Requested status
- Approval records
- Supporting evidence references
- Effective scope
- Effective time
- Activating user
- Final decision

### AC-PAY-004.10 — Reactivation Control

A suspended payment method SHALL require a controlled reactivation process and SHALL NOT automatically return to `ACTIVE` unless explicitly configured and approved.

---

## Payment Method-Specific Readiness

### Cash on Delivery

COD production readiness SHALL consider:

- Eligible branches and zones
- Maximum COD order value
- Rider cash-handling process
- Cash collection status
- Change availability
- Failed-delivery handling
- End-of-shift reconciliation

### JazzCash

JazzCash production readiness SHALL consider:

- Merchant account approval
- Production credentials
- Transaction confirmation flow
- Callback or status verification
- Settlement reconciliation
- Refund support
- Provider downtime handling

### EasyPaisa

EasyPaisa production readiness SHALL consider:

- Merchant account approval
- Production credentials
- Transaction confirmation flow
- Callback or status verification
- Settlement reconciliation
- Refund support
- Provider downtime handling

### Card Payments

Card-payment documentation SHALL NOT imply production availability until:

- Gateway provider is selected
- Security and compliance requirements are approved
- Production integration is tested
- Fees and settlement terms are accepted
- Chargeback workflow is defined

---

## Policy-Blocked Values

The following values remain unresolved and SHALL NOT be invented:

1. Initial active production methods
2. Whether JazzCash is active in V1
3. Whether EasyPaisa is active in V1
4. Whether card payments are deferred
5. Selected gateway providers
6. Maximum COD order value
7. COD eligibility by branch or zone
8. Digital-payment retry limits
9. Timeout durations
10. Whether fallback to COD is allowed
11. Refund timelines by method
12. Settlement and reconciliation ownership
13. Emergency suspension authority
14. Production approval matrix

---

## Readiness Assessment

| Requirement | Behavior testable | Values blocked by policy |
|---|---:|---:|
| REQ-PAY-PROD-001 | Yes | Initial production statuses |
| REQ-PAY-PROD-002 | Yes | Enabled channels, branches and zones |
| REQ-PAY-PROD-003 | Yes | Retry, timeout and fallback rules |
| REQ-PAY-PROD-004 | Yes | Final approval matrix and provider readiness |

---

## Recommended Canonical Destinations

After business approval and cross-document review:

- `docs/02-requirements/Security/PAYMENT_GATEWAY_REQUIREMENTS.md`
- `docs/02-requirements/Core/REQUIREMENTS.md`
- `docs/02-requirements/Applications/WEBSITE_REQUIREMENTS.md`
- `docs/02-requirements/Applications/MOBILE_APP_REQUIREMENTS.md`
- `docs/02-requirements/Applications/POS_REQUIREMENTS.md`
- `docs/02-requirements/Operations/ORDER_MANAGEMENT_REQUIREMENTS.md`
- `docs/02-requirements/Business/FINANCE_REQUIREMENTS.md`

The canonical requirements SHALL explicitly reference `BD-006`.
