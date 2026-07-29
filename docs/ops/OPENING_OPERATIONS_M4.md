# Opening Operations Milestone 4 — Live Dry-Run & Staff Seeding

## Purpose

Local-only workflows for Royal Orchard:

- staff seeding with sealed encrypted handover
- live environment configuration snapshots
- GO/NO-GO dry-run evidence for Founder sign-off

## Current verified state

Milestone 4 adds persistence and Admin APIs under `/api/v1/admin/opening/*` for staff-seed, live-config, and dry-run. **Production staff apply is blocked** in this delivery (`OPENING_M4_PRODUCTION_AUTHORIZATION_BLOCKER`). Northern Bypass remains **coming-soon**.

Do **not** claim Royal Orchard Production-ready without separate Founder Production authorization.

## Staff seeding workflow

1. Super-admin runs local simulation (`POST /opening/staff-seed/simulate-local`).
2. Crypto-secure temporary passwords (≥16 chars, mixed classes) are generated in memory.
3. Handover JSON is encrypted with AES-256-GCM and written **outside Git**.
4. Decryption key is written to a Founder-only key directory.
5. API responses never include plaintext passwords.
6. Database stores fingerprints and audit events only.
7. Production apply requires a separate Founder authorization path — blocked here.

Handover default (private, outside repo):

- `D:\telepizza-private\release-artifacts\staff-handover\royal-orchard-staff.json`
- key: `D:\telepizza-private\release-artifacts\staff-handover\founder-keys\`

Auto-expiry: 24 hours after package `expiresAt`.

## Live environment configuration

Snapshot captures:

- Timezone `Asia/Karachi`
- Hours `10:00`–`02:30`
- Modes: dine-in, takeaway, delivery
- Payments: CASH enabled (dry-run); CARD/BANK_TRANSFER/ONLINE_PAYMENT disabled
- Notifications: IN_APP enabled; EMAIL/SMS/WhatsApp mock-only; PHONE_MANUAL documented
- Devices: POS/KDS/printer/rider/internet/backup/UPS documented; card terminal N/A
- Northern Bypass expected status: `coming-soon`

## GO/NO-GO dry-run procedure

Nineteen role-tagged steps from Founder sign-in through Founder decision. Uses **simulated** order/ticket/delivery IDs only — no real customer notifications and no real card transactions.

Founder decision evidence is **immutable** (`branch_dry_run_evidence`). GO/NO-GO does **not** change `branches.status`. Northern Bypass stays separate.

`local_test_only` dry-runs never satisfy Production COMPLETE readiness.

## Evidence immutability

- Evidence rows reject UPDATE/DELETE via trigger.
- Evidence hash covers snapshot payload, step log hash, and screenshot hashes.
- History is append-only for seed audit events.

## Opening readiness contract

| Item | COMPLETE rule |
| --- | --- |
| gov-staff-seed | Local simulation recorded (Production apply still blocked) |
| gov-live-config | Snapshot captured |
| gov-dry-run | Production dry-run PASS without `local_test_only`; local PASS = ACTIVE |

## Explicit non-claims

- No real passwords committed or logged
- No Production migrations applied by this delivery
- No real SMS/Email/WhatsApp sent
- No real payment transactions
- No Northern Bypass activation
- No automatic branch status change
