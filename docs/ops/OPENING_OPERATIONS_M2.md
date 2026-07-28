# Opening Operations Milestone 2 — Payments, Notifications, Devices

## Purpose

Document the honest lifecycle for Royal Orchard opening verification of:

- accepted payment methods and provider verification
- notification channel configuration and testing
- physical device and infrastructure verification

This is **workflow + evidence** documentation. It does not claim Production completion without persisted non-expired verification evidence.

## Current verified state

Milestone 2 adds branch-scoped persistence and Admin APIs under `/api/v1/admin/opening/*`, wired into shared opening readiness probes and `/admin/settings` (Payments, Communications, POS).

Northern Bypass remains **coming-soon**. No Production migrations are applied by this milestone delivery.

## Payment method decisions

Supported method codes (explicit enablement required):

- `CASH`
- `CARD`
- `BANK_TRANSFER`
- `ONLINE_PAYMENT`

Rules:

- branch-scoped; one active row per branch/code
- disabled methods never satisfy readiness
- configuration alone ≠ provider verification
- no inheritance from Royal Orchard to Northern Bypass
- no hard delete after operational use (events retained)

## Provider verification lifecycle

Statuses: `NOT_CONFIGURED` → `CONFIGURED` → `VERIFICATION_REQUIRED` → `VERIFIED` | `FAILED` | `EXPIRED`

- Database stores **metadata only** (provider name, environment, status, summary)
- API keys, tokens, passwords, card numbers, CVV are **never** stored in normal tables
- Environments: `TEST` | `SANDBOX` | `PRODUCTION`
- Terminal-required providers remain incomplete until terminal verification
- Expired verification does not satisfy readiness
- Failed verification is **BLOCKED**

## Card terminal verification

Separate from “CARD method enabled”.

Evidence types: `ONSITE_CHECK`, `SUPPLIER_CONFIRMATION`, `MANUAL_TEST`, `DOCUMENTED_CONTINGENCY`, `LOCAL_TEST_ONLY`

`LOCAL_TEST_ONLY` must never count as Production COMPLETE.

## Cash reconciliation procedure

Separate documentation states:

- `DOCUMENTED`
- `REVIEWED`
- `VERIFIED_ONSITE`

Readiness COMPLETE only when `VERIFIED_ONSITE` + `approved_at` (Founder / super-admin approval). Documentation presence alone is not onsite verification.

## Notification channel setup

Purposes: `CUSTOMER_ORDER`, `KITCHEN_ALERT`, `RIDER_ALERT`, `ESCALATION`  
Channels: `IN_APP`, `EMAIL`, `SMS`, `WHATSAPP`, `PHONE_MANUAL`

Destination references may be masked phones, role destinations, or internal queue ids — not customer message bodies or provider secrets.

## Notification test lifecycle

- Local mock test: labelled **Local verification only**; sets `local_test_only=true`
- Local passed tests do **not** satisfy Production readiness
- Production VERIFIED requires Founder/super-admin verify path with `local_test_only=false`
- Failed test/provider → BLOCKED
- Empty config → WAITING_ON_HUMAN
- Unavailable provider → FOUNDATION / UNAVAILABLE

## WhatsApp honesty contract

WhatsApp is never shown as CONNECTED without verified provider metadata. Foundation WhatsApp UI alone is not connection proof. No live customer notifications are sent from Opening Operations M2 surfaces.

## Physical-device verification

Required device types:

- `POS_DEVICE`, `KDS_DEVICE`, `RECEIPT_PRINTER`, `CARD_TERMINAL`, `RIDER_DEVICE`
- `PRIMARY_INTERNET`, `BACKUP_INTERNET`, `UPS_POWER_BACKUP`

Route HTTP 200 never verifies hardware. Named human verifier required for physical checks.

## Internet and UPS contingency

- Primary internet: onsite/manual verification
- Backup internet: may use `DOCUMENTED_CONTINGENCY` evidence when a verified contingency is documented
- UPS/power backup: same evidence rules; expired checks become incomplete

## Evidence expiry / recheck

`expires_at` / `recheck_due_at` must be respected. Expired evidence does not satisfy COMPLETE.

## Readiness completion rules

| Status | Meaning |
| --- | --- |
| COMPLETE | Current, persisted, non-expired VERIFIED evidence (not LOCAL_TEST_ONLY) |
| ACTIVE | Configured; verification still pending |
| WAITING_ON_HUMAN | Human decision / onsite check required |
| BLOCKED | Failed verification |
| ERROR | Backend/API failure |
| OFFLINE | Network failure |
| FOUNDATION | Capability unavailable |

Do not hardcode readiness totals. Do not mark Royal Orchard payment/notification/device items complete without real Production evidence.
