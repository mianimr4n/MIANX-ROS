# Phase 2 Readiness Audit — Test Strategy

**Audit date:** 2026-08-04
**Status:** PROPOSED — Comprehensive verification strategy across all testing layers

---

## Required Testing Layers

```text
[Pure Unit / Domain Tests]
        ↓
[Schema & RLS Validation Tests]
        ↓
[API Integration Tests (Supertest/Vitest)]
        ↓
[Idempotency & Concurrency Tests]
        ↓
[End-to-End & Playwright Smoke Tests]
        ↓
[Production Read-Only Verification]
```

### 1. Pure Unit / Domain Logic
- Validation of effective-value calculation algorithms (Org default vs Branch override).
- State machine transition rules (Delivery & Order status matrices).
- Double-entry journal balance checks (Debits == Credits).

### 2. Database & RLS Enforcement
- Branch isolation tests: Verify `authenticated` users assigned to Branch A cannot SELECT or UPDATE rows in Branch B tables (`orders`, `conversations`, `deliveries`).
- Role permissions: Assert `customer-support` role cannot trigger journal entries or alter branch configurations.

### 3. API Integration & Error Handlers
- Vitest + Supertest suites in `backend/api`.
- Negative testing: Verify HTTP 400 on malformed payloads, 401 on unauthenticated requests, 403 on insufficient permissions, 422 on period lock violations.

### 4. Concurrency & Idempotency
- Concurrent POST requests to webhook ingestion: Assert exactly one message row is saved.
- Concurrent dispatch calls for same delivery: Assert no double assignment.

### 5. Accessibility & Mobile Responsiveness
- Playwright + `@axe-core/playwright` automated scans on all new Phase 2 UI views (`/admin/support`, `/admin/customers`, `/admin/config`).
- Budgets: 0 critical, 0 serious accessibility violations.

### 6. Production-Safe Verification
- Read-only health checks (`/healthz`, `/readyz`).
- No production database mutation during verification passes.
