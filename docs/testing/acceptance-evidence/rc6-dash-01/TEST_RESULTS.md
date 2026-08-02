# RC6-DASH-01 — Test results

## Automated

| Suite | Result |
| --- | --- |
| `tests/website/rc6-dash-01-exception-center.test.mjs` | PASS (local) |
| `pnpm check` | Recorded in FINAL_REPORT |
| `pnpm test` / `pnpm test:db` | Recorded in FINAL_REPORT |
| `pnpm rc1:gate` | Recorded in FINAL_REPORT |
| Owner Playwright (`owner-critical-smoke`) Exception Center visibility | Extended assertion on dashboard |

## Manual (local ephemeral — when stack available)

Verify checklist (no Production):

- [ ] Owner login → dashboard shows Needs Attention Now
- [ ] Severity ordering critical → warning → information
- [ ] Branch filter changes counts/scope
- [ ] Drill-downs reach kitchen/delivery/inventory/orders/finance
- [ ] Empty / partial / unavailable states honest
- [ ] No mutation controls; no console/chunk errors

## Known limitations

- Not Production-verified
- Finance variance has no dedicated URL filter
- Delivery `status=pending` is closest honest filter (waiting logic also requires ready order)
- Kitchen delay uses operational prep guide (20m), not contractual SLA
- Only five exception types included; catalogue remainder deferred
