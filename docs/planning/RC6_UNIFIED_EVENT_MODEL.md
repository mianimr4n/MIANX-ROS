# RC6 Unified Event Model

**Status:** Proposed planning contract (RC6-DASH-00)
**Baseline tip:** `da99875…`
**Migration:** **NONE in this slice** — gaps may require future additive schema

## Normalized event contract (proposed)

| Field | Description |
| --- | --- |
| event ID | UUID |
| event type | Namespaced string (e.g. `delivery.assigned`) |
| organization / brand / branch | Tenant scope |
| actor type / actor ID | user / system / provider / ai |
| entity type / entity ID | order, delivery, employee, config_version, … |
| timestamp | UTC + branch TZ display |
| severity | optional |
| source | service name |
| correlation ID | request/job id |
| before / after metadata | Redacted JSON |
| sensitive metadata | Encrypted/omitted; never in UI dumps |
| audit classification | ops / security / finance / privacy |
| customer-visible | bool |
| retention category | short / standard / legal |

## Supports

| Product need | How |
| --- | --- |
| Live timeline | Filter by branch + recent types |
| What Changed since login | Diff events after `last_seen_at` |
| Audit history | Immutable append |
| Exception generation | Rules over events → Exception Catalogue |
| EOD pack | Day-scoped export of classified events |
| AI explanations | Read-only summaries; no silent writes |
| Config activation history | `config.activated` / `config.rolled_back` |

## Existing structures (reusable)

| Artifact | Path / note | Reuse |
| --- | --- | --- |
| `menu_audit_events` | migrations + menu service | Menu domain |
| `loyalty_marketing_audit_events` | `20260801180000` | Loyalty/marketing |
| `inventory_recipe_audit_events` | inventory/recipes | Inventory |
| `table_service_audit` | D3 | Floor |
| `cash_reconciliation_events` | cash | Cash |
| `pos_z_report_events` | POS Z | Closing |
| `branch_staff_seed_audit_events` | staffing seed | Limited |
| Supplier portal audit | supplier migrations | Supplier |
| `analytics_exceptions` | analytics BI | **Data quality only** |
| API observability logs | `backend/api/src/observability` | Ops diagnostics, not domain UI |

## Gaps (future schema — not created here)

- Org-wide unified `domain_events` / outbox
- Owner “last login watermark”
- Exception acknowledgement table
- Config version history table
- Rider POD / COD settlement events
- Provider webhook normalized ingress with signature validation

## Sensitive fields (must mask)

phone, address detail, payment tokens, payroll amounts (role-gated), document contents, JWT/cookies, GPS trails (retention-limited).

## Honesty

Fragmented audit tables **do not** equal a unified What Changed product (`W-CHG-01` = NOT_PRESENT today).
