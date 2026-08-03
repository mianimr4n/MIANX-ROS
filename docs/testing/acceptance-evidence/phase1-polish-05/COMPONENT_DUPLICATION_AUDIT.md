# Component duplication audit

| Pattern | Implementations | Canonical | Risk |
| --- | --- | --- | --- |
| Page header | OperationsWorkspaceHeader, POSHeader, HRHeader, module headers | Keep specialized ops/POS/HR; unify section titles | Low |
| Section title | AdminSectionTitle (many) | AdminSectionTitle | Low |
| Metric card | AdminKpiCard | AdminKpiCard | Low |
| Surface/panel | AdminSurface | AdminSurface + density | Low |
| Deferred disclosure | OperationsDeferredNote, ad-hoc details | AdminCapabilityNotice | Low |
| Op status | OperationalStatusBanner | Keep (ERROR/OFFLINE/STALE) | Low |
| Empty/config | One-off divs | AdminDataState | Med |
| Capability badge | CapabilityStatusBadge | Keep | Low |

Consolidate only shared semantics — do not merge Owner hierarchy or KDS board.
