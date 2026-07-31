# RC3 Workforce PR2 — Final Report

## Decision: WORKFORCE_SLICE_COMPLETE

### Dependency / base
| Item | Value |
| --- | --- |
| Starting branch | `feature/rc3-workforce` |
| Confirmed origin/main | `29bd88bbbe5f97f18bc0f230aa94a6e21e5c8dc4` |
| Finance merge | **MERGED** — PR #143 @ `29bd88b` |
| Kitchen RC2 | Not mixed into this branch |
| Finance branch | Not modified |

### Reused HR foundations
- Tables: `hr_employees`, `hr_attendance`, `hr_leave_requests`, `hr_employee_documents`
- Services: `employees.ts`, `workforce.ts` (extended)
- Routes: `/admin/hr/*` (extended)
- Permissions: `hr.manage` / `staff.manage` / `admin.access` + branch scope
- Status enums preserved: employee `active|inactive|on_leave|terminated`; attendance `PRESENT|ABSENT|LATE|LEAVE`

### New schema (local apply only)
| Migration | Purpose |
| --- | --- |
| `20260731050000_hr_employee_lifecycle.sql` | employee_number, emergency contacts, deactivation fields, `hr_employee_events` |
| `20260731060000_hr_shift_scheduling.sql` | templates, scheduled shifts, gist overlap exclusion, shift events |
| `20260731070000_hr_attendance_leave_hardening.sql` | corrections, leave cancel/approver/rejection, leave events |
| `20260731080000_hr_payroll_foundation.sql` | compensation, pay periods, payroll runs/lines/events — **no payments** |

Local apply: verified via `docker exec … psql` against `supabase_db_telepizza-platform`. **No Production mutation.**

### APIs added
- Employee GET/:id, PATCH, deactivate, reactivate
- Shift templates + shifts (create/patch/publish/cancel)
- Attendance corrections list/create/decide
- Leave cancel + rejection reason
- Metrics + attention
- Compensation / pay-periods / payroll-runs (calculate/approve/lock, paymentTriggered always false)

### Validation evidence
| Command | Result |
| --- | --- |
| `pnpm check` | PASS |
| `pnpm test` | PASS — DB suites 737; backend Vitest **523** |
| `pnpm rc1:gate` | PASS — 0 blocking failures |
| `git diff --check` | PASS |
| `node scripts/rc3-workforce-qa.mjs` | PASS — authenticated, **0** console/page/network errors after migration apply, axe critical/serious **0** |

### Screenshots
`docs/testing/acceptance-evidence/rc3-workforce/`
- owner-workforce-attention-{390,768,1440}.png
- hr-workforce-{390,768,1440}.png

### Known limitations
1. Document expiry not modeled → UI/API report unavailable (not zero).
2. Opening training/SOP not FK’d to `hr_employees` → incomplete training shown as unavailable.
3. Leave balances not configured → honest message.
4. Payroll calculation status `unavailable` until Pakistan rules approved — no payments.
5. Labour cost unavailable without complete compensation + time.
6. Late arrival uses existing LATE status; no invented grace period.
7. Full interactive Playwright journeys (overlap conflict click-path, etc.) covered by API tests + authenticated page QA; not nine separate end-to-end browser scripts.

### Production migration plan
1. Review four forward-only migrations in staging.
2. Apply in order `…50000` → `…80000`.
3. Smoke: employee PATCH, shift publish + overlap 409, correction approve preserves originals, payroll lock with `paymentTriggered: false`.
4. Do not seed fake templates/employees.

### Rollback / containment
- Forward-only; contain by disabling new UI routes and leaving additive tables unused.
- Do not drop history tables in Production without ADR.

### Confirmations
- Finance branch not modified
- Kitchen RC2 not mixed
- No deployment
- No linked Production mutation / migration
- Branch isolation + RBAC preserved via existing helpers
- Existing HR foundations reused
