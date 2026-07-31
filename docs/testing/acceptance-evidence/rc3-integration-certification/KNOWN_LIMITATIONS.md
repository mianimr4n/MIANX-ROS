# RC3 Integration — Known Limitations

## Explicit product deferrals (accepted)

1. Supplier binary document upload — URL reference only.
2. Supplier-facing GRN accepted/rejected line quantities — staff source of truth; portal shows receiving **status** only.
3. Pakistan payroll calculation unavailable; payroll foundation does **not** trigger payment.
4. Leave balances unavailable unless configured.
5. Document expiry unavailable unless configured.
6. Labour cost unavailable unless compensation data complete.
7. Marketing message “delivered” must not be inferred without provider confirmation.

## Certification-host limitations (P2/P3 — non-blocking under RC3_CERTIFIED)

1. Live upgrade-from-pre-RC3 database dump restore remains optional depth; additive migrations + clean-install/repeatability + loyalty compat repair verified.
2. Some workflows are PASS_COMPOSITE (repository suites + UI smoke) rather than one mega-E2E driver.
3. Firefox/WebKit not required in this pass — Chromium only.
4. Post-`db reset`, role GRANTs must be re-applied (known repository gap).
5. No Production deployment, mutation, or linked migration in certification.
6. Production must still apply pending migrations (incl. `20260731140000`) before relying on loyalty list/RPC paths.

## Known non-blocking debt

- Node.js 20 Actions runner deprecation warning (CI) — does not fail typecheck.
- Optional BM browser acceptance in `rc1:gate` remains SKIP / non-blocking.
