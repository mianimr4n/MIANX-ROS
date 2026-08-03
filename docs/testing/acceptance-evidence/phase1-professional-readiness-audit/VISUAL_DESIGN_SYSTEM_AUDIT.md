# Phase 1.1 — Visual design system audit

Preserve Telepizza brand (red accents, existing admin tokens). No rebrand.

## Inconsistency register

| Pattern | Observation | Recommendation |
| --- | --- | --- |
| Eyebrow labels | Mixed uppercase tracking styles | Shared `AdminSectionEyebrow` |
| Status badges | LIVE / Planned / Available / emerald pills | Unified `CapabilityBadge` enum |
| Cards | Variable padding/borders | `AdminCard` token |
| Buttons | min-h-11 often; some smaller | Enforce touch-target token |
| Phase 2 chips | Overused in filter bars | Collapse to single “Deferred features” disclosure |
| Empty states | Mixed copy quality | Shared empty-state component |
| Tables | Dense desktop; mobile overflow risk | Responsive table pattern |
| Whitespace | Finance/Reports sparse | Intentional empty layouts |
| Destructive | Confirm patterns uneven | Shared confirm dialog |
| Focus | Generally present; verify dashed search | Remove dead controls |

## Findings

| ID | Severity | Issue |
| --- | --- | --- |
| P11-VIS-01 | P2 | Excessive Phase 2 chip noise competes with primary actions | **Resolved POLISH-05** (Foundation labels + AdminCapabilityNotice) |
| P11-VIS-02 | P2 | Inconsistent card padding across modules | Partial — AdminSurface density; residual POLISH-06 |
| P11-VIS-03 | P3 | Duplicate one-off insight list styles | Residual |

## Assessment

Design debt remaining is **P2/P3 polish** (P11-VIS-02/03). P11-VIS-01 addressed in POLISH-05; full Admin certification remains POLISH-06.
