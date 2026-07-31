# RC4-3 Final Report

## Decision

**RC4_3_PAYROLL_COMPLETE**

## Starting / ending

| | Value |
| --- | --- |
| Branch | `feature/rc4-payroll` |
| Start SHA | `6460d142f070b85569927d290c9a5e29894ad91d` |
| Primary implementation commit | `26991dc4a55a47bcf20af4f5549f3e6f262fd996` |
| Tip SHA | `1e58fc185fbe7d639e907e1ff7ec810bb65059bc` |
| Prerequisites | RC4-5 + RC4-9 on origin/main; RC4-8 Option B (Finance not required for calc; GL DEFERRED) |

## Why complete

1. Deterministic payroll calculation (`rc4-3.payroll.v1`) in integer paisa; missing compensation blocked; no silent unpaid absence.
2. Periods, runs, lines, components, exceptions, payslips, settlements contract, posting-ready events.
3. Approval workflow with immutable approved/locked runs; `paymentTriggered=false`; PAYMENT_READY ≠ PAID.
4. Pakistan statutory foundation table with no hardcoded rates; STATUTORY_DEFERRED honesty.
5. Admin UI shows LIVE / REVIEW_REQUIRED / DEFERRED / UNAVAILABLE honesty; exception queue; payslip list.
6. Gates: check, test (782+577), test:db, rc1:gate PASS; Playwright 2/2; axe 0 critical/serious.
7. No Production migration or deploy; no push/PR unless instructed.

## Known limitations

See `KNOWN_LIMITATIONS.md` — Finance GL deferred, statutory UNAVAILABLE, PDF deferred, employee self-service deferred, OT/unpaid leave policies review-only.

## STOP compliance

No bank integration. No silent payment. No invented statutory compliance. No Production apply.
