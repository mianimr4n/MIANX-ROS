# RC6-DASH-00 — Contract coverage

| Contract document | Purpose | Coverage check |
| --- | --- | --- |
| `RC6_COMMAND_CENTER_ARCHITECTURE.md` | Six zones, L1–L6 interaction, modes, cross-cutting | Complete for DASH-00 |
| `RC6_COMMAND_CENTER_WIDGET_REGISTRY.md` | Widget IDs, truth, drill-down, actions | ≥ required widgets listed |
| `RC6_KPI_TRUST_REGISTRY.md` | Trust states + KPI contracts | LIVE≠ACCOUNTING; formulas PROPOSED when unsupported |
| `RC6_COMMAND_CENTER_ACTION_REGISTRY.md` | Action maturity + SoD | Examples covered; none executable by UI alone |
| `RC6_EXCEPTION_AND_RISK_CATALOGUE.md` | Exception catalogue + classes | Initial set including cash/KDS/rider/POD/system |
| `RC6_UNIFIED_EVENT_MODEL.md` | Normalized events / What Changed | Distinguishes existing vs gap |
| `RC6_DELIVERY_RIDER_DOMAIN_CONTRACT.md` | Full lifecycle + gaps | First-class domain |
| `RC6_SETTINGS_CONFIGURATION_CONTRACT.md` | Hierarchy + domains | First-class domain |
| `RC6_COMMAND_CENTER_ROLE_MATRIX.md` | Roles × domain permissions | SoD called out |
| `RC6_COMMAND_CENTER_NON_FUNCTIONAL_REQUIREMENTS.md` | A11y/perf/sec/reliability/obs | Present |
| `RC6_COMMAND_CENTER_TRACEABILITY.md` | Vision → evidence map | Present |
| Roadmap / dependency / acceptance / risk / baseline / capability | Living updates | DASH/DEL/SET sequences; FIN/CHK/INV/SEC retained |

## Vision capabilities traced

Owner Command Center zones, Delivery Management, Rider Management, Settings & Configuration — each mapped with current truth, gap, planned slice, and Production-proof requirement. No item marked complete without implementation + tests + docs + security/Prod where required.
