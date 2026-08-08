# Readiness model

## Contract

Each report contains branch and organization identity, state, score, pass/warning/blocker totals, evaluation time, active configuration pointer, categorized checks, and recommended actions.

States:

- `READY`: no BLOCKER or WARNING check is unresolved and a configuration schema contract is present.
- `READY_WITH_WARNINGS`: no blocker is unresolved, but one or more warning checks fail or are unknown.
- `BLOCKED`: at least one blocker fails or is unknown.
- `NOT_CONFIGURED`: no configuration schema contract exists, or required schemas exist without an active value.

Score: `round(PASS / applicable checks × 100)`. `NOT_APPLICABLE` is excluded. `FAIL` and `UNKNOWN` remain in the denominator, so UNKNOWN never becomes PASS.

## Categories and sources

- `BUSINESS_IDENTITY`: live status, name, address, timezone; currency is honestly `UNAVAILABLE` because no branch currency contract exists.
- `ORDERING`: live opening hours and sellable catalog.
- `POS` and `FINANCE`: existing live payment probes.
- `KITCHEN`: existing live KDS probes.
- `DELIVERY`: conditional; an unproven optional enablement is UNKNOWN, not blocking.
- `STAFF`: live branch-manager assignment.
- `INTEGRATIONS`: disabled/non-declared optional integrations are `NOT_APPLICABLE`.
- `SECURITY`: repository-backed organization ownership.

Check sources are `LIVE`, `DERIVED`, or `UNAVAILABLE`; states are `PASS`, `FAIL`, `NOT_APPLICABLE`, or `UNKNOWN`.

Readiness is calculated on request. No cache or duplicate truth table is introduced.
