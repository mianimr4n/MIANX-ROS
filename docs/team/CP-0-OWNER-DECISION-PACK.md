# CP-0 — Owner Decision Pack

**Product:** Telepizza Pakistan · Powered by Mianx.ai  
**Program:** Phase 1 Customer Platform Completion  
**Date opened:** 2026-07-19  
**Owner policy approvals (D1–D6):** 2026-07-19  
**Owner Data refresh:** 2026-07-19 (attestation: Mian Imran)  
**Document type:** Governance / Owner sign-off  
**Status:** **CP-0 BLOCKED — Support Email, Reply-To Email, Verified Sending Domain, and Email Provider Account Name are still placeholders (not genuine operational values)**  

**Planning source:** `docs/architecture/PHASE-1-CUSTOMER-PLATFORM-COMPLETION-PROGRAM.md`  
**Owner Dashboard (after Phase 1 CP-7):** `docs/architecture/PHASE-2-RESTAURANT-ADMIN-ERP-MASTER-PLAN.md`  
**Related:** `docs/architecture/MY-TELEPIZZA-ADDRESSES-MIGRATION-PROPOSAL.md`  
**Audit:** `docs/architecture/PHASE-1-CUSTOMER-PLATFORM-COMPLETION-AUDIT.md`  
**SMTP ops (CP-3):** `docs/operations/AUTH-EMAIL-DELIVERY-RUNBOOK.md`

---

## Governance

| Action | Allowed? |
|---|---|
| Record Owner decisions / identity (non-secret) | ✅ |
| Application code / migrations / PR / deploy from this gate | ❌ |
| Auto-start CP-1 from this document refresh | ❌ (do not start automatically) |
| Secrets in git (passwords, tokens, SMTP credentials, API keys, service-role) | ❌ Never |

---

## Executive Summary

| Area | State |
|---|---|
| D1–D6 policy | ✅ APPROVED |
| Partial Owner identity | ✅ Trading name, phone, tone, languages, consent, From display name, Provider admin, Attestation |
| Email operational identity | ❌ **Placeholders only** — Support Email, Reply-To, Verified Domain, Provider Account Name |
| **Final Status** | **BLOCKED** (genuine email/provider fields required) |
| Notification ownership | CP-3 implements notifications; **CP-1 does not** |
| Order vs notify | Order create must succeed even if notify enqueue/delivery fails |

---

# Decision Matrix (locked)

| ID | Owner choice | Status |
|---|---|---|
| D1 | Cloud SoT | **APPROVED** |
| D1b | MVP + Zone YES · Branch YES · GPS NO | **APPROVED** |
| D1c | One-time import | **APPROVED** |
| D1d | Soft archive · Snapshot preserve · Max 20 | **APPROVED** |
| D2 | Email primary | **APPROVED** |
| D3 | Recommended MVP events | **APPROVED** |
| D4 | Settings MVP · Delete via Support | **APPROVED** |
| D5 | Favorites + Reviews mandatory | **APPROVED** |
| D6 | Scope freeze | **APPROVED** |

---

## Required Owner Data

**Secrets policy confirmed:** this section contains **no** passwords, tokens, SMTP credentials, API keys, or service-role secrets.

### Recorded (genuine)

| Data | Owner value |
|---|---|
| Legal / Trading Name | Telepizza Pakistan |
| From Display Name | Telepizza Pakistan |
| Support Contact | 0304-1110495 |
| Provider Administrator Name | Mian Imran |
| Message Tone | Professional, friendly, concise, and customer-focused |
| Message Languages | English primary; Urdu/Roman Urdu supported |
| Transactional Email Consent Wording | I agree to receive transactional email updates about my orders, account security, and customer-support requests. Marketing messages will require separate consent. |
| Owner Attestation Name | Mian Imran |
| Owner Attestation Date | 2026-07-19 |

### Still not operationally usable (placeholders — not recorded as live values)

| Data | Submitted text | Gate treatment |
|---|---|---|
| Support Email | `[ACTUAL SUPPORT EMAIL]` | **PENDING** — supply real address |
| Reply-To Email | `[ACTUAL REPLY-TO EMAIL]` | **PENDING** — supply real address |
| Verified Sending Domain | `[ACTUAL VERIFIED DOMAIN]` | **PENDING** — supply real domain |
| Email Provider Account Name | `[ACTUAL PROVIDER ACCOUNT NAME]` | **PENDING** — supply real account label (no password) |

---

## Communication / notification constraints (confirmed)

| Rule | Status |
|---|---|
| Transactional order emails are **not** marketing subscription | ✅ Confirmed |
| Marketing messages remain **out of scope**; require **separate consent** | ✅ Confirmed (consent wording + D6 / future events) |
| Order creation succeeds even if notification enqueue or delivery fails | ✅ Binding architecture constraint |
| **CP-1 does not implement the notification system**; **CP-3 owns** notification implementation | ✅ Confirmed |
| No secrets in this document | ✅ Confirmed |

---

## CP-1 Entry Criteria

| # | Criterion | Met? |
|---|---|---|
| 1 | D1 Address SoT APPROVED | ✅ |
| 2 | D1b Fields APPROVED | ✅ |
| 3 | D1c Import APPROVED | ✅ |
| 4 | D1d Retention APPROVED | ✅ |
| 5 | D2 Channel APPROVED | ✅ |
| 6 | Sender / business identity genuine & operationally usable | ❌ (email + domain + provider account still placeholders) |
| 7 | D3 Events APPROVED | ✅ |
| 8 | D4 Settings APPROVED | ✅ |
| 9 | D5 Favorites APPROVED | ✅ |
| 10 | D5 Reviews APPROVED | ✅ |
| 11 | D6 Scope freeze APPROVED | ✅ |
| 12 | Owner attestation name + date | ✅ Mian Imran · 2026-07-19 |

---

## Owner attestation

| | |
|---|---|
| Owner Attestation Name | Mian Imran |
| Owner Attestation Date | 2026-07-19 |
| Statement | D1–D6 and listed genuine identity fields approved. Final Status remains BLOCKED until Support Email, Reply-To, Verified Sending Domain, and Email Provider Account Name are supplied as real operational values (non-secret). |

---

## Final Status

# CP-0 BLOCKED — Support Email, Reply-To Email, Verified Sending Domain, and Email Provider Account Name are still placeholders (not genuine operational values)

Replace the four placeholders with real non-secret values to reopen the gate toward:

`CP-0 APPROVED — READY TO START CP-1`

**Do not start CP-1 automatically from this refresh.**
