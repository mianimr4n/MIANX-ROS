# BD-010 Multi-Branch Routing — Acceptance Criteria Draft

## Record Information

- **Business decision:** BD-010
- **Status:** DRAFT
- **Requirement IDs:** REQ-OMS-BR-001 through REQ-OMS-BR-004
- **ID collision status:** CLEAR
- **Canonical files changed:** No
- **Decision dependency:** Routing precedence, customer branch selection, cross-zone behavior and reassignment policy remain unapproved
- **Implementation rule:** Existing nearest-branch references SHALL NOT be treated as an approved routing algorithm

---

# REQ-OMS-BR-001 — Routing Eligibility

## Requirement

A branch SHALL only be considered for an order when it satisfies approved eligibility conditions.

## Acceptance Criteria

### AC-OMS-BR-001.1 — Open Branch

**Given** a branch is closed according to its configured operating hours  
**When** routing evaluates that branch  
**Then** the branch SHALL NOT be selected for a new order unless an approved future-order workflow applies.

### AC-OMS-BR-001.2 — Channel Availability

**Given** a branch has disabled a specific ordering channel  
**When** an order originates from that channel  
**Then** the branch SHALL be ineligible.

### AC-OMS-BR-001.3 — Address Serviceability

**Given** a delivery address is outside the branch’s approved service area  
**When** routing evaluates the branch  
**Then** the branch SHALL be marked ineligible.

### AC-OMS-BR-001.4 — Order-Type Support

A branch SHALL only be eligible when it supports the requested order type, such as:

- Delivery
- Takeaway
- Dine-in
- Curbside pickup

### AC-OMS-BR-001.5 — Menu Availability

**Given** one or more required menu items are unavailable at a branch  
**When** routing evaluates the branch  
**Then** the platform SHALL apply the approved behavior:

1. Mark branch ineligible,
2. Offer substitutions, or
3. Ask the customer to modify the cart.

No substitution SHALL occur silently.

### AC-OMS-BR-001.6 — Capacity-State Eligibility

A branch in an approved restricted capacity state SHALL be excluded from affected order types.

### AC-OMS-BR-001.7 — Payment Eligibility

A branch SHALL only remain eligible when at least one approved payment method is available for the order context.

### AC-OMS-BR-001.8 — Delivery Resource Context

Routing SHALL support eligibility checks for:

- Rider availability
- Delivery backlog
- Delivery-zone capacity
- Estimated delivery feasibility

### AC-OMS-BR-001.9 — Explicit Ineligibility Reason

Every rejected branch SHALL return a controlled reason code, such as:

- BRANCH_CLOSED
- CHANNEL_DISABLED
- ADDRESS_UNSERVICEABLE
- ITEM_UNAVAILABLE
- CAPACITY_RESTRICTED
- PAYMENT_UNAVAILABLE
- DELIVERY_UNAVAILABLE

### AC-OMS-BR-001.10 — No Fabricated Eligibility

If required eligibility data is unavailable, the platform SHALL NOT silently treat the branch as eligible.

### AC-OMS-BR-001.11 — Eligibility Snapshot

The confirmed order SHALL retain the branch-eligibility context used during routing.

---

# REQ-OMS-BR-002 — Routing Precedence

## Requirement

The platform SHALL use an approved and configurable routing precedence.

## Acceptance Criteria

### AC-OMS-BR-002.1 — Configurable Factors

Routing configuration SHALL support factors including:

- Delivery-zone ownership
- Distance
- Estimated preparation time
- Estimated delivery time
- Stock availability
- Branch capacity
- Rider availability
- Customer-selected branch
- Operational priority

### AC-OMS-BR-002.2 — Deterministic Result

**Given** identical routing inputs and the same active routing configuration  
**When** routing executes repeatedly  
**Then** the selected branch SHALL be the same.

### AC-OMS-BR-002.3 — Zone Ownership

**Given** an address belongs to an exclusive branch zone  
**When** that branch is eligible  
**Then** routing SHALL apply the approved zone-ownership precedence.

### AC-OMS-BR-002.4 — Nearest Branch

The nearest branch SHALL NOT automatically win unless distance is the approved primary routing factor.

### AC-OMS-BR-002.5 — Capacity Consideration

**Given** the nearest branch is overloaded  
**When** another eligible branch can fulfill the order within approved limits  
**Then** routing SHALL evaluate the alternative according to configured precedence.

### AC-OMS-BR-002.6 — Stock Consideration

A branch lacking required items SHALL not outrank an eligible branch with complete item availability unless an approved substitution workflow applies.

### AC-OMS-BR-002.7 — Customer-Selected Branch

When customer branch selection is enabled, the platform SHALL validate the selected branch against:

- Serviceability
- Operating status
- Order-type support
- Item availability
- Capacity restrictions

### AC-OMS-BR-002.8 — Tie Resolution

When two or more branches have equal routing rank, the platform SHALL use an approved deterministic tie-breaker.

### AC-OMS-BR-002.9 — Routing Explanation

The routing result SHALL include an internal explanation code identifying why the branch was selected.

### AC-OMS-BR-002.10 — Configuration Versioning

Each routing configuration SHALL record:

- Version
- Effective period
- Factor precedence
- Weighting, when applicable
- Scope
- Approval status
- Approver

### AC-OMS-BR-002.11 — Historical Protection

Changing routing rules SHALL NOT alter the assigned branch of an already accepted order without a controlled reassignment workflow.

---

# REQ-OMS-BR-003 — Routing Fallback

## Requirement

When the preferred branch is unavailable, the platform SHALL apply approved fallback behavior.

## Acceptance Criteria

### AC-OMS-BR-003.1 — Alternative Evaluation

**Given** the preferred branch becomes ineligible before order confirmation  
**When** routing retries  
**Then** the platform SHALL evaluate remaining eligible branches.

### AC-OMS-BR-003.2 — Recalculation

When an alternative branch is selected, the platform SHALL recalculate:

- Delivery charge
- Preparation estimate
- Delivery estimate
- Available payment methods
- Menu availability
- Promotions
- Taxes, when applicable

### AC-OMS-BR-003.3 — Customer Disclosure

Before confirmation, the customer SHALL be informed when fallback changes:

- Assigned branch
- Delivery fee
- ETA
- Menu availability
- Promotion eligibility
- Payment methods

### AC-OMS-BR-003.4 — No Eligible Branch

**Given** no branch is eligible  
**When** routing completes  
**Then** the platform SHALL not create a fabricated assignment.

It SHALL provide an approved unavailability response.

### AC-OMS-BR-003.5 — No Silent Post-Acceptance Reassignment

An accepted order SHALL NOT be reassigned to another branch without:

- Authorized action
- Reason
- Operational validation
- Customer notification
- Audit record

### AC-OMS-BR-003.6 — Cross-Zone Protection

A fallback branch outside the original service zone SHALL only be used when cross-zone routing is explicitly allowed.

### AC-OMS-BR-003.7 — Fee Increase Protection

If fallback increases the customer’s payable amount before confirmation, the updated amount SHALL require customer acceptance.

### AC-OMS-BR-003.8 — ETA Increase Protection

If fallback materially increases the ETA, the customer SHALL be informed before confirmation.

### AC-OMS-BR-003.9 — Promotion Revalidation

Promotions and free-delivery rules SHALL be revalidated against the fallback branch.

### AC-OMS-BR-003.10 — Fallback Audit

The platform SHALL retain:

- Preferred branch
- Rejection reason
- Alternatives evaluated
- Selected fallback branch
- Fee impact
- ETA impact
- Configuration version

### AC-OMS-BR-003.11 — Retry Limit

Routing retries SHALL be bounded and SHALL NOT loop indefinitely.

---

# REQ-OMS-BR-004 — Manual Reassignment

## Requirement

Authorized personnel SHALL be able to reassign an order under controlled conditions.

## Acceptance Criteria

### AC-OMS-BR-004.1 — Permission Enforcement

A user without reassignment permission SHALL NOT be able to change the assigned branch.

### AC-OMS-BR-004.2 — Reassignment Eligibility

Before reassignment, the target branch SHALL be validated for:

- Open status
- Capacity
- Menu availability
- Serviceability
- Payment compatibility
- Operational acceptance

### AC-OMS-BR-004.3 — Mandatory Reason

Every manual reassignment SHALL require a controlled reason.

### AC-OMS-BR-004.4 — State Restriction

The platform SHALL support reassignment rules based on order state.

Reassignment after preparation begins SHALL require stricter approval than reassignment before acceptance.

### AC-OMS-BR-004.5 — Kitchen Impact

If preparation has started, reassignment SHALL record:

- Original preparation status
- Waste or cancellation impact
- New preparation responsibility
- Original branch acknowledgment

### AC-OMS-BR-004.6 — Inventory Impact

Reassignment SHALL update inventory reservations in both the original and target branches without creating duplicate deductions.

### AC-OMS-BR-004.7 — Rider Impact

If a rider is assigned, reassignment SHALL update:

- Rider task
- Dispatch ownership
- Pickup branch
- Delivery ETA
- Rider notification

### AC-OMS-BR-004.8 — Payment Impact

Reassignment SHALL validate whether the original payment method remains supported by the target branch.

### AC-OMS-BR-004.9 — Pricing Impact

Any change to delivery fee, promotion, tax or payable amount SHALL follow an approved order-adjustment workflow.

### AC-OMS-BR-004.10 — Customer Notification

The customer SHALL be notified of material changes resulting from reassignment.

### AC-OMS-BR-004.11 — Acceptance by Target Branch

The target branch SHALL explicitly accept the reassigned order before ownership is finalized when operational approval is required.

### AC-OMS-BR-004.12 — Atomic Ownership

An order SHALL NOT appear as actively owned by two branches simultaneously.

### AC-OMS-BR-004.13 — Failure Recovery

If reassignment fails after partial updates, the platform SHALL:

- Record the failure
- Preserve a recoverable order state
- Avoid duplicate kitchen or rider tasks
- Route the issue for operational recovery

### AC-OMS-BR-004.14 — Audit Record

Each reassignment SHALL record:

- Order identifier
- Original branch
- Target branch
- Previous state
- Final state
- Acting user
- Approving user
- Reason
- Financial impact
- Inventory impact
- Rider impact
- Customer notification
- Timestamp

### AC-OMS-BR-004.15 — Reporting

Authorized reporting SHALL support:

- Reassignment count
- Original and target branches
- Reason
- Order state
- Fee impact
- ETA impact
- Waste impact
- Customer complaint impact

---

## Cross-Decision Dependencies

This routing policy interacts with:

- `BD-001` — Branch Operating Hours
- `BD-005` — Delivery-Charge Model
- `BD-006` — Production Payment Methods
- `BD-008` — Order Cancellation
- `BD-009` — Peak-Hour Handling
- `BD-011` — Discounts and Loyalty
- `BD-012` — Free-Delivery Threshold

Routing SHALL remain consistent with branch availability, pricing, payment, cancellation, capacity and promotion policies.

---

## Policy-Blocked Values

The following values remain unresolved and SHALL NOT be invented:

1. Primary routing factor
2. Routing factor precedence
3. Factor weights
4. Customer branch-selection rights
5. Exclusive zone behavior
6. Cross-zone routing permission
7. Maximum routing distance
8. Maximum acceptable ETA
9. Capacity weighting
10. Rider-availability weighting
11. Stock-substitution behavior
12. Tie-breaker rule
13. Fallback fee-change tolerance
14. Fallback ETA-change tolerance
15. Post-acceptance reassignment authority
16. Reassignment state restrictions
17. Target-branch acceptance requirement
18. Prepared-food waste responsibility
19. Rider compensation after reassignment
20. Customer compensation after material delay
21. Routing retry limit
22. Emergency override authority

---

## Readiness Assessment

| Requirement | Behavior testable | Values blocked by policy |
|---|---:|---:|
| REQ-OMS-BR-001 | Yes | Final eligibility rules |
| REQ-OMS-BR-002 | Yes | Precedence, weights and tie-breakers |
| REQ-OMS-BR-003 | Yes | Cross-zone, fee and ETA tolerances |
| REQ-OMS-BR-004 | Yes | Reassignment roles and state limits |

---

## Recommended Canonical Destinations

After business approval and cross-document review:

- `docs/02-requirements/Operations/ORDER_MANAGEMENT_REQUIREMENTS.md`
- `docs/02-requirements/Applications/WEBSITE_REQUIREMENTS.md`
- `docs/02-requirements/Applications/MOBILE_APP_REQUIREMENTS.md`
- `docs/02-requirements/Applications/ADMIN_PANEL_REQUIREMENTS.md`
- `docs/02-requirements/Applications/POS_REQUIREMENTS.md`
- `docs/02-requirements/Applications/RIDER_APP_REQUIREMENTS.md`
- `docs/02-requirements/Security/SETTINGS_REQUIREMENTS.md`
- `docs/02-requirements/Security/AUDIT_LOG_REQUIREMENTS.md`
- `docs/02-requirements/Security/NOTIFICATION_REQUIREMENTS.md`

The canonical requirements SHALL explicitly reference `BD-010`.
