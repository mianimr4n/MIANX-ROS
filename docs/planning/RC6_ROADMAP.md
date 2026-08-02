# RC6 Roadmap

**Status:** Living roadmap — **RC6-DASH-03** merged; **RC6-DASH-04** Approval Inbox in progress

**Current repository tip (DASH-04 baseline):** `08ca0e413d8863f835cf21aa0c14736b61f39dc1`
**Date:** 2026-08-02
**Baseline tag:** `v1.4.0` @ `96f1e803da7d2ddd1ca8c9b7c72779b68fd19824`
**Current repository tip (DASH-04 baseline):** `08ca0e413d8863f835cf21aa0c14736b61f39dc1`
**Production website runtime:** `152ce409609dc78e48d0d2b6b0c34a35d6338c24`
**Migration tip:** `20260801180000`

> This roadmap does **not** authorize Production mutation, migrations, deploys, tags, or GitHub Releases. Planning is not implementation evidence.

---

## Completed (repository evidence)

| ID | Title | Evidence / merge |
| --- | --- | --- |
| RC6-DOC-01 | Living status honesty sync | `rc6-doc-01/` · #177 |
| RC6-UI-01 | Admin capability-label honesty | `rc6-ui-01/` · #178 |
| RC6-QA-02 | Owner CI path expansion | `rc6-qa-02/` · #179 |
| RC6-A11Y-02 | Moderate a11y remediation | `rc6-a11y-02/` · #180 → `da99875…` |
| RC6-DASH-00 | Command Center contracts | `rc6-dash-00/` · #181 → `cc09e239…` |
| RC6-DASH-01 | Exception Center read-only (repo) | `rc6-dash-01/` · #182 → `b913eca…` · **not Production-verified** |
| RC6-DASH-02 | Trusted KPI drill-downs (repo) | `rc6-dash-02/` · #183 → `80cd2c4…` · **not Production-verified** · DRILL_DOWN only |
| RC6-DASH-03 | Daily command modes (repo) | `rc6-dash-03/` · #184 → `08ca0e4…` · **not Production-verified** · advisory / read-only |
| RC6-DASH-04 | Approval Inbox foundation (repo) | `rc6-dash-04/` · **not Production-verified** · DRILL_DOWN only |

---

## Prioritization model

Each candidate scored **1–5**. Preference direction:

| Factor | Preference | Notes |
| --- | --- | --- |
| User value | Higher better | Operator/customer outcome |
| Operational value | Higher better | Reliability, honesty, ops |
| Evidence strength | Higher better | Clear repo gap |
| Dependency readiness | Higher better | Unblocked today |
| Automated testability | Higher better | Static/unit/browser |
| Migration safety | Higher better | Prefer NONE |
| Security risk | Lower better | High = more danger |
| Production blast radius | Lower better | Prefer docs/CI over runtime |
| Provider dependency | Lower better | Prefer none |
| Implementation size | Lower better | Prefer S for early waves |

**Order rule:** honesty → contracts → read-only Command Center foundations → bounded mutations with SoD → Founder/provider work.

---

## Bands

### Release blockers

**None evidenced** as Production outages. Misleading LIVE claims remain honesty risks (FIN-01 still open).

### Architecture / contracts (docs-first)

| ID | Title |
| --- | --- |
| **RC6-DASH-00** | Restaurant Command Center contracts (**merged**) |
| RC6-DEL-00 | Covered inside Delivery/Rider domain contract (DASH-00 pack) |
| RC6-SET-00 | Covered inside Settings configuration contract (DASH-00 pack) |

### Command Center runtime sequence

| ID | Title |
| --- | --- |
| **RC6-DASH-01** | Exception Center read-only foundation (**merged** — repo; not Prod-verified) |
| **RC6-DASH-02** | Actionable KPI drill-downs (**merged** — repo; not Prod-verified) |
| **RC6-DASH-03** | Opening/live/closing modes (**merged** — repo; not Prod-verified) |
| **RC6-DASH-04** | Approval Inbox foundation (**merged** — repo; not Prod-verified; DRILL_DOWN) |
| **RC6-DASH-05** | Branch Health Score (**merged** — repo; not Prod-verified; explainable) |
| **RC6-DASH-06** | Profitability truth (**merged** — ops≠posted; not Prod-verified) |
| RC6-DASH-07 | EOD pack (merged — read-only preview; no finalize) |
| RC6-DASH-08 | What Changed and timeline (merged — device-local / derived foundation) |

### Delivery / Rider

| ID | Title |
| --- | --- |
| RC6-DEL-01 | Dispatch queue and assignment |
| RC6-RIDER-01 | Rider profiles/status/shifts |
| RC6-DEL-02 | Lifecycle and exceptions |
| RC6-DEL-03 | POD and failed-delivery flow |
| RC6-CASH-01 | Rider COD settlement |
| RC6-DEL-04 | SLA/zone/performance analytics |
| RC6-RIDER-02 | Rider app/offline sync |
| RC6-DEL-05 | Smart dispatch recommendations |
| RC6-RISK-01 | Safety/fraud/compliance |

### Settings

| ID | Title |
| --- | --- |
| RC6-SET-01 | Organization/brand/branch |
| RC6-SET-02 | Effective values and overrides |
| RC6-SET-03 | Hours and service modes |
| RC6-SET-04 | Delivery/order/payment policies |
| RC6-SET-05 | Roles/permissions/approvals |
| RC6-SET-06 | POS/KDS/printer/device |
| RC6-SET-07 | Finance/tax/inventory policies |
| RC6-SET-08 | Versioning/scheduling/rollback |
| RC6-SET-09 | Readiness and drift |
| RC6-SET-10 | AI configuration assistant |

### Previously approved high / normal (retained)

| ID | Title | Notes |
| --- | --- | --- |
| **RC6-FIN-01** | Finance BS/CF/AR/Tax honesty or wire-up | Still high; pairs with DASH-06 |
| RC6-INV-01 | Inventory adjustment residual proof | Retained |
| RC6-CHK-01 | Customer checkout coupon redeem | Retained |
| RC6-SEC-02 | Supplier portal RLS matrix | Retained |
| **RC6-QA-03** | Command Center integration certification (**this wave**) |

### Optional

| ID | Title |
| --- | --- |
| RC6-REL-01 | package.json SemVer hygiene |
| RC6-OBS-02 | Bulk log export / APM |

### Founder-gated / provider-dependent

| ID | Title | Gate |
| --- | --- | --- |
| RC6-OPS-02 | Enable Production alerts | Destinations |
| RC6-OPS-03 | Branch protection Owner Playwright | GitHub admin |
| RC6-SEC-01 | Documents malware controls | Security ADR |
| RC6-PITR-01 | Supabase PITR | Commercial |
| RC6-WA-01 | WhatsApp conversation/webhooks | Provider ADR |
| RC6-LOY-01 | Loyalty/marketing send | Provider |
| RC6-AN-01 | Analytics scheduled worker | Product ADR |
| RC6-AI-01 | AI Command Center runtime | Product ADR |
| RC6-NB-01 | Northern Bypass go-live | Founder |

### Explicitly deferred

- Speculative microservices / native mobile megaslices without ADR
- Broad “finish finance/settings” without contracts
- Lighthouse/RUM as release gate
- GitHub Release UI automation (tag-only unless Founder changes policy)

---

## Recommended implementation order (post-honesty wave)

```text
1. RC6-DASH-00         (contracts — docs only) — merged
2. RC6-DASH-01         (Exception Center read-only) — merged
3. RC6-DASH-02         (KPI drill-downs — this wave)
4. RC6-FIN-01          (finance honesty/wire; parallelizable)
5. RC6-DASH-03…08      (Command Center depth)
6. RC6-DEL-01 / RIDER-01 → DEL-02… / CASH-01
7. RC6-SET-01…10       (after SET contracts in DASH-00)
8. RC6-CHK-01 / INV-01 / SEC-02
9. Founder-gated ops/providers/AI
```

---

## Slice brief — RC6-DASH-00

| Field | Content |
| --- | --- |
| Problem | Advanced Owner Dashboard / Delivery / Settings vision lacks canonical contracts → risk of silent omission or false LIVE |
| Scope | Architecture, widget/KPI/action/exception/event/delivery/settings/role/NFR/traceability docs + roadmap wiring |
| Out of scope | Runtime code, migrations, providers, CI behavior changes, Production |
| DB impact | **NONE** |
| Next runtime | **RC6-DASH-01** (merged) → **RC6-DASH-02** |

## Runtime brief — RC6-DASH-02

| Field | Content |
| --- | --- |
| ID | RC6-DASH-02 — Trusted Owner KPI drill-downs |
| Maturity | **DRILL_DOWN** only (no draft/approve/execute) |
| Scope | Central registry; selected verified KPIs; filter-aware links; destination query init |
| Out of scope | Mutations, migrations, Accounting Net Sales claims, fake filters, AI, providers, Production |
| DB impact | **NONE** |
| Evidence | `docs/testing/acceptance-evidence/rc6-dash-02/` |

## Next runtime brief — RC6-DASH-01 (do not implement in DASH-00)

| Field | Content |
| --- | --- |
| ID | RC6-DASH-01 — Owner Exception Center read-only foundation |
| Zone | What Needs Attention |
| Scope | Severity, branch, age, freshness, trust/source labels, empty/stale/error, drill-down to existing routes |
| Sources | Existing trusted attention/ops APIs only |
| Out of scope | AI, new providers, ack mutation unless safe existing schema, avoidable migrations |
| DB impact | Prefer **NONE** |
| Testability | Browser + API; no Prod credentials |
| Branch (future) | `feature/rc6-dash-01-exception-center-readonly` |

---

## Contract index (DASH-00)

| Document |
| --- |
| `RC6_COMMAND_CENTER_ARCHITECTURE.md` |
| `RC6_COMMAND_CENTER_WIDGET_REGISTRY.md` |
| `RC6_KPI_TRUST_REGISTRY.md` |
| `RC6_COMMAND_CENTER_ACTION_REGISTRY.md` |
| `RC6_EXCEPTION_AND_RISK_CATALOGUE.md` |
| `RC6_UNIFIED_EVENT_MODEL.md` |
| `RC6_DELIVERY_RIDER_DOMAIN_CONTRACT.md` |
| `RC6_SETTINGS_CONFIGURATION_CONTRACT.md` |
| `RC6_COMMAND_CENTER_ROLE_MATRIX.md` |
| `RC6_COMMAND_CENTER_NON_FUNCTIONAL_REQUIREMENTS.md` |
| `RC6_COMMAND_CENTER_TRACEABILITY.md` |

---

## Release strategy (unchanged intent)

| Topic | Recommendation |
| --- | --- |
| Version class | Likely **minor** after certified runtime waves |
| Docs-only | No Production cutover |
| Migrations | Separate Founder-authorized cutovers |
| Tags | Annotated `v*` on closeout; Releases optional/out of convention |
| Rollback | Revert PR for docs; Vercel prior deploy for website |

---

## Explicit non-actions of DASH-00

No implementation, workflow change, migration, Production SQL, deployment, secret, tag, or GitHub Release.
