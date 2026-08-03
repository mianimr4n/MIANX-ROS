# Phase 1.1 — CRM, loyalty & marketing audit

## CRM classification

**Order-derived customer view** — not an authoritative customer master.

Evidence: `AdminCrm.tsx` aggregates from orders; no dedicated customers API.

## Findings

| ID | Severity | Issue |
| --- | --- | --- |
| P11-CRM-01 | P1 | VIP/blocked UI may look LIVE while Foundation — keep FOUNDATION badges |
| P11-CRM-02 | P1 | PII (phone/name) visible to order.manage roles — ensure exports gated; no URL PII |
| P11-CRM-03 | P2 | Loyalty page inline LIVE copy; unused `LoyaltyProgramBanner` with better Prod caveat |
| P11-CRM-04 | P2 | Marketing vs Promotions alias routes |

## Privacy rules (audit)

- No Production customer PII committed to evidence
- Exports require permission checks in follow-up POLISH-07
- Screenshots forbidden in PRs

## Assessment

CRM is honest as **PARTIAL_LIVE order-derived**. Loyalty/Marketing need banner consistency and Prod-unverified caveats.
