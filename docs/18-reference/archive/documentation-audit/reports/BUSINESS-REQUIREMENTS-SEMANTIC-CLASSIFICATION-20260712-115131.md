# Telepizza Business-to-Requirements Semantic Classification

## Record Information

- **Status:** REVIEWED
- **Scope:** BD-001 through BD-012
- **Method:** Manual semantic review of requirements-context findings
- **Important:** Keyword occurrence alone was not accepted as proof of requirements coverage

---

## Classification Definitions

| Classification | Meaning |
|---|---|
| COVERED_AND_TESTABLE | Complete requirement exists with testable behavior |
| PARTIALLY_COVERED | Relevant functionality exists but decision-dependent details are missing |
| BLOCKED_BY_BUSINESS_DECISION | Requirement cannot be finalized until business authority decides |
| NOT_COVERED | Required behavior is absent |
| REFERENCE_DATA_GAP | Missing operational or commercial data rather than missing system behavior |

---

## Semantic Classification

| Decision ID | Decision | Classification | Semantic Finding | Required Action |
|---|---|---|---|---|
| BD-001 | Northern Bypass branch operating hours | BLOCKED_BY_BUSINESS_DECISION | Business-hours configuration exists, but actual hours are unknown | Confirm hours and store them as branch configuration |
| BD-002 | Small Pizza price | REFERENCE_DATA_GAP | No verified price exists in requirements | Confirm price and place it in menu master data |
| BD-003 | Large Pizza price | REFERENCE_DATA_GAP | No verified price exists in requirements | Confirm price and place it in menu master data |
| BD-004 | Zinger Burger price | REFERENCE_DATA_GAP | No verified price exists in requirements | Confirm price and place it in menu master data |
| BD-005 | Delivery-charge model | PARTIALLY_COVERED | Delivery charges and threshold settings exist, but approved calculation model is absent | Select model and define calculation and override rules |
| BD-006 | Production payment methods | PARTIALLY_COVERED | COD, JazzCash and EasyPaisa are specified; operational approval remains pending | Confirm enabled production methods and card deferral |
| BD-007 | Refund and complaint policy | PARTIALLY_COVERED | Refund and complaint workflows exist, but eligibility and outcome policy are missing | Define policy matrix and approval limits |
| BD-008 | Order-cancellation policy | PARTIALLY_COVERED | Cancel-order actions exist, but window, conditions and refund effects are absent | Define state-based cancellation rules |
| BD-009 | Peak-hour order handling | NOT_COVERED | Only peak-hour reporting exists; no order-pause or kitchen-capacity workflow exists | Add operational capacity-control requirements |
| BD-010 | Multi-branch order routing | PARTIALLY_COVERED | Nearest-branch and branch-assignment behavior are mentioned, but routing precedence is undefined | Approve routing algorithm and fallback rules |
| BD-011 | Discount and loyalty rules | PARTIALLY_COVERED | Extensive loyalty functionality exists, but earning, expiry, stacking and eligibility rules remain undefined | Define commercial rule set before implementation |
| BD-012 | Free-delivery threshold | PARTIALLY_COVERED | Configurable threshold and average-order-value reporting exist; value-setting policy is pending | Define threshold approval and review workflow |

---

## Coverage Summary

| Classification | Count |
|---|---:|
| COVERED_AND_TESTABLE | 0 |
| PARTIALLY_COVERED | 7 |
| BLOCKED_BY_BUSINESS_DECISION | 1 |
| NOT_COVERED | 1 |
| REFERENCE_DATA_GAP | 3 |
| **Total** | **12** |

---

## Critical Findings

### No decision is fully traceable

None of the twelve business decisions currently has:

1. An explicit `BD-xxx` reference
2. Complete approved business behavior
3. Clear acceptance criteria
4. Confirmed decision authority
5. End-to-end requirement-to-test traceability

### Potential premature design

The loyalty and discount scope is extensively documented despite the underlying commercial policy remaining unresolved.

### False-positive keyword warning

Generic terms, especially `COD`, produced unrelated matches such as:

- Barcode
- QR Code
- Response Code
- Source Code
- Authorization Code

These matches SHALL NOT be treated as payment-method coverage.

---

## Required Remediation Order

1. Resolve or formally defer launch-blocking business decisions.
2. Create verified menu and branch reference-data records.
3. Add explicit `BD-xxx` references to affected requirements.
4. Add missing policy conditions and acceptance criteria.
5. Add peak-hour operational-control requirements.
6. Re-run traceability validation.
7. Trace approved requirements into architecture and tests.
