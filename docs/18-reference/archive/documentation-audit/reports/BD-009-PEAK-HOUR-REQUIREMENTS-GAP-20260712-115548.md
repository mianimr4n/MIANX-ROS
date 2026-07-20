# BD-009 Peak-Hour Order Handling — Requirements Gap Record

## Record Information

- **Business decision:** BD-009
- **Current classification:** NOT_COVERED
- **Status:** REQUIREMENTS GAP CONFIRMED
- **Decision authority:** Founder plus Telepizza Branch Management
- **Implementation rule:** No permanent peak-hour behavior may be hard-coded before policy approval

---

## Existing Coverage

Current requirements include peak-hour reporting and analysis only.

They do not define operational controls for:

- Kitchen overload
- Order throttling
- Digital-order pauses
- Delivery-only pauses
- Menu-item restrictions
- Preparation-time extensions
- Branch capacity thresholds
- Manager approvals
- Customer communication
- Automatic recovery

---

## Proposed Requirement Set

### REQ-OMS-PH-001 — Branch Capacity State

The system SHALL maintain an operational capacity state for each branch.

Supported states SHALL include:

- NORMAL
- BUSY
- OVERLOADED
- DELIVERY_PAUSED
- DIGITAL_ORDERS_PAUSED
- FULLY_PAUSED

The final enabled states SHALL remain configurable.

**Traceability:** BD-009

---

### REQ-OMS-PH-002 — Capacity-State Authority

Only authorized branch personnel SHALL be permitted to change branch capacity state.

The role and approval matrix SHALL be configurable.

The system SHALL record:

- Acting user
- Branch
- Previous state
- New state
- Reason
- Timestamp
- Expected duration
- Approval reference, when required

**Traceability:** BD-009

---

### REQ-OMS-PH-003 — Preparation-Time Adjustment

Authorized staff SHALL be able to temporarily increase estimated preparation times during peak load.

The system SHALL:

- Store the temporary adjustment
- Display the revised estimate before order confirmation
- Apply it only to the selected branch
- Record the effective period
- Restore the normal estimate automatically or manually

**Traceability:** BD-009

---

### REQ-OMS-PH-004 — Delivery-Order Pause

Authorized staff SHALL be able to pause new delivery orders for a branch without disabling dine-in or takeaway ordering.

The customer-facing system SHALL clearly state that delivery is temporarily unavailable.

Existing accepted orders SHALL remain visible and processable.

**Traceability:** BD-009

---

### REQ-OMS-PH-005 — Digital-Order Pause

Authorized staff SHALL be able to pause all new website, mobile-app and WhatsApp orders for a branch.

The system SHALL:

- Prevent new digital checkout
- Preserve existing carts
- Display a temporary-unavailability message
- Continue processing accepted orders
- Allow authorized manual reactivation

**Traceability:** BD-009

---

### REQ-OMS-PH-006 — Menu-Item Restriction

Authorized staff SHALL be able to temporarily disable selected menu items during kitchen overload or stock constraints.

The restriction SHALL support:

- Branch-specific application
- Start and end time
- Operational reason
- Automatic expiry
- Manual restoration

**Traceability:** BD-009

---

### REQ-OMS-PH-007 — Capacity Threshold Configuration

The platform SHALL support configurable operational thresholds for each branch.

Possible threshold inputs MAY include:

- Active order count
- Kitchen queue length
- Average preparation delay
- Rider availability
- Delivery backlog
- Manual manager assessment

Automated actions SHALL remain disabled until explicitly approved.

**Traceability:** BD-009

---

### REQ-OMS-PH-008 — Customer Communication

When a branch enters a restricted capacity state, customer channels SHALL display the applicable impact before order confirmation.

The message SHALL communicate, as applicable:

- Extended preparation time
- Delivery unavailable
- Digital ordering unavailable
- Restricted menu availability
- Estimated restoration time

The message content SHALL be configurable.

**Traceability:** BD-009

---

### REQ-OMS-PH-009 — Existing Order Protection

Changing branch capacity state SHALL NOT silently cancel or alter already accepted orders.

Any action affecting an accepted order SHALL require:

- Authorized intervention
- Recorded reason
- Customer notification
- Refund or replacement handling where applicable

**Traceability:** BD-009, BD-007, BD-008

---

### REQ-OMS-PH-010 — Automatic State Expiry

Temporary restrictions SHALL support an expiry time.

At expiry, the system SHALL either:

1. Restore the previous normal state automatically, or
2. Require authorized review before restoration

The selected behavior SHALL be configurable.

**Traceability:** BD-009

---

### REQ-OMS-PH-011 — Auditability

Every peak-hour operational action SHALL be written to the audit log.

Audit data SHALL include:

- Branch
- Action
- Actor
- Approval authority
- Reason
- Start time
- End time
- Affected channel
- Affected menu scope
- Result

**Traceability:** BD-009

---

### REQ-OMS-PH-012 — Reporting

The system SHALL report:

- Number of peak-hour restrictions
- Restriction duration
- Orders blocked
- Orders delayed
- Revenue impact
- Customer complaints
- Branch recovery time

**Traceability:** BD-009

---

## Required Founder Decisions

The following points remain open:

1. Which roles may activate each restriction?
2. Which actions require manager approval?
3. Can the system recommend a restriction automatically?
4. Can the system activate a restriction automatically?
5. What thresholds define BUSY and OVERLOADED?
6. What is the maximum allowed pause duration?
7. Should digital ordering resume automatically?
8. Which customer compensation rules apply after excessive delay?

---

## Acceptance-Criteria Readiness

| Requirement | Testable now | Blocked by policy |
|---|---:|---:|
| Capacity states | Yes | Final state list |
| Authorization and audit | Yes | Final role matrix |
| Preparation-time adjustment | Yes | Maximum allowed adjustment |
| Delivery pause | Yes | Approval rule |
| Digital-order pause | Yes | Approval rule |
| Menu restriction | Yes | Approval rule |
| Threshold configuration | Yes | Threshold values |
| Customer messaging | Yes | Approved wording |
| Existing-order protection | Yes | Compensation policy |
| Automatic expiry | Yes | Selected expiry behavior |
| Audit logging | Yes | No |
| Reporting | Yes | Final KPI targets |

---

## Recommended Destination

After founder review, approved requirements should be added to:

`docs/02-requirements/Operations/ORDER_MANAGEMENT_REQUIREMENTS.md`

The source document SHALL reference `BD-009` explicitly.
