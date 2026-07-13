# BD-005 Delivery-Charge Model — Acceptance Criteria Draft

## Record Information

- **Business decision:** BD-005
- **Status:** DRAFT
- **Requirement IDs:** REQ-PRICE-DC-001 through REQ-PRICE-DC-004
- **ID collision status:** CLEAR
- **Canonical files changed:** No
- **Decision dependency:** Initial production delivery-charge model remains unapproved

---

# REQ-PRICE-DC-001 — Delivery-Charge Strategy

## Requirement

The platform SHALL support configurable delivery-charge strategies.

## Acceptance Criteria

### AC-DC-001.1 — Strategy Configuration

**Given** an authorized administrator is configuring delivery pricing  
**When** the administrator selects a supported strategy  
**Then** the strategy SHALL be saved without requiring a code deployment.

### AC-DC-001.2 — Supported Strategy Types

The configuration system SHALL be capable of representing:

- Flat fee
- Zone-based fee
- Distance-based fee
- Free delivery above threshold
- Hybrid strategy

Production enablement SHALL depend on business approval.

### AC-DC-001.3 — Single Active Strategy Context

**Given** a branch, channel and delivery zone  
**When** an order is priced  
**Then** the system SHALL resolve one approved applicable delivery-charge configuration.

### AC-DC-001.4 — Missing Configuration Protection

**Given** no approved delivery-charge configuration is available  
**When** checkout requests a delivery quotation  
**Then** the system SHALL NOT silently assume a permanent fee.

It SHALL either:

1. Use an explicitly approved fallback configuration, or
2. Prevent delivery checkout with a configurable message.

### AC-DC-001.5 — Configuration Versioning

Each strategy configuration SHALL record:

- Strategy type
- Version
- Effective date and time
- Expiry date and time, when applicable
- Branch or zone scope
- Approval status
- Created by
- Approved by

### AC-DC-001.6 — Historical Order Protection

Changing the active strategy SHALL NOT recalculate delivery charges for already confirmed orders.

---

# REQ-PRICE-DC-002 — Calculation Inputs

## Requirement

Delivery-charge calculation SHALL use approved configurable inputs.

## Acceptance Criteria

### AC-DC-002.1 — Required Calculation Context

A delivery-charge calculation request SHALL support:

- Branch
- Delivery address or zone
- Order subtotal
- Ordering channel
- Calculation timestamp
- Applicable promotion context

### AC-DC-002.2 — Deterministic Calculation

**Given** identical calculation inputs and the same active configuration version  
**When** the calculation is performed repeatedly  
**Then** the resulting delivery charge SHALL be identical.

### AC-DC-002.3 — Zone-Based Calculation

**Given** a zone-based strategy is active  
**When** the delivery address belongs to a configured zone  
**Then** the charge SHALL use that zone’s approved fee.

### AC-DC-002.4 — Unserviceable Address

**Given** the delivery address is outside all eligible service zones  
**When** checkout requests delivery  
**Then** the system SHALL mark the address as unserviceable and SHALL NOT quote a fabricated fee.

### AC-DC-002.5 — Threshold Evaluation

**Given** a free-delivery threshold applies  
**When** the qualifying order value reaches the approved threshold  
**Then** the delivery fee SHALL be waived according to the active rule version.

### AC-DC-002.6 — Calculation Breakdown

The pricing response SHALL include:

- Base delivery fee
- Applied adjustment
- Discount or waiver
- Final delivery fee
- Applied configuration identifier
- Explanation code

### AC-DC-002.7 — Monetary Precision

All delivery-charge calculations SHALL use the project’s approved currency precision and rounding policy.

---

# REQ-PRICE-DC-003 — Price Disclosure

## Requirement

The delivery charge SHALL be disclosed before order confirmation.

## Acceptance Criteria

### AC-DC-003.1 — Pre-Confirmation Visibility

**Given** a customer reaches order review  
**When** a delivery charge applies  
**Then** the charge SHALL be visible before the customer confirms the order.

### AC-DC-003.2 — Total Breakdown

Checkout SHALL display:

- Item subtotal
- Discounts
- Delivery charge
- Tax, when applicable
- Final payable amount

### AC-DC-003.3 — Free-Delivery Disclosure

**Given** the delivery charge is waived  
**When** checkout displays totals  
**Then** the interface SHALL show the original fee or applicable condition and the final waived amount.

### AC-DC-003.4 — Recalculation Notification

**Given** the customer changes address, branch, cart value or promotion  
**When** the delivery charge changes  
**Then** checkout SHALL refresh the total and clearly disclose the updated amount.

### AC-DC-003.5 — Confirmation Snapshot

The confirmed order SHALL store the delivery-charge amount and rule version used at confirmation time.

### AC-DC-003.6 — Cross-Channel Consistency

For identical pricing context, website, mobile application, POS and supported conversational ordering channels SHALL receive the same server-calculated delivery charge.

---

# REQ-PRICE-DC-004 — Override Governance

## Requirement

Manual delivery-charge overrides SHALL be authorized and auditable.

## Acceptance Criteria

### AC-DC-004.1 — Permission Enforcement

**Given** a user lacks delivery-charge override permission  
**When** the user attempts to modify the calculated fee  
**Then** the system SHALL deny the action.

### AC-DC-004.2 — Mandatory Reason

An authorized override SHALL require a non-empty reason selected from an approved reason list or entered as an auditable explanation.

### AC-DC-004.3 — Approval Threshold

The platform SHALL support configurable approval requirements based on:

- Override amount
- Percentage change
- Role
- Branch
- Promotion type

### AC-DC-004.4 — Customer-Visible Result

The final overridden delivery charge SHALL be shown to the customer before order confirmation.

### AC-DC-004.5 — Audit Record

Each override SHALL record:

- Order or quotation identifier
- Original fee
- Final fee
- Difference
- Acting user
- Approving user, when required
- Reason
- Timestamp
- Branch
- Channel

### AC-DC-004.6 — No Retroactive Silent Change

A delivery-charge override after order confirmation SHALL require a controlled order adjustment workflow and SHALL NOT silently change the customer’s payable amount.

### AC-DC-004.7 — Reporting

Authorized reports SHALL identify:

- Override count
- Override value
- Branch
- Acting employee
- Reason
- Approval status
- Revenue impact

---

## Policy-Blocked Values

The following values remain unresolved and SHALL NOT be invented:

1. Initial production strategy
2. Flat-fee amount, if selected
3. Delivery-zone fee values
4. Distance bands, if selected
5. Override approval limits
6. Promotion precedence
7. Tax treatment
8. Approved fallback behavior

---

## Readiness Assessment

| Requirement | Behavior testable | Values blocked by policy |
|---|---:|---:|
| REQ-PRICE-DC-001 | Yes | Active production strategy |
| REQ-PRICE-DC-002 | Yes | Fee values and calculation precedence |
| REQ-PRICE-DC-003 | Yes | Approved customer wording |
| REQ-PRICE-DC-004 | Yes | Roles and approval limits |

---

## Recommended Canonical Destinations

After business approval and cross-document review:

- `docs/02-requirements/Core/REQUIREMENTS.md`
- `docs/02-requirements/Applications/WEBSITE_REQUIREMENTS.md`
- `docs/02-requirements/Applications/MOBILE_APP_REQUIREMENTS.md`
- `docs/02-requirements/Security/SETTINGS_REQUIREMENTS.md`

The canonical requirements SHALL explicitly reference `BD-005`.
