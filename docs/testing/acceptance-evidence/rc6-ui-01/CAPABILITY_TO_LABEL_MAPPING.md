# RC6-UI-01 — capability → label mapping

Shared helper: `apps/website/client/src/lib/capability-status.ts`
Badge: `apps/website/client/src/components/admin/CapabilityStatusBadge.tsx`

| Truth status | Visible label |
| --- | --- |
| LIVE_VERIFIED | LIVE |
| IMPLEMENTED_NOT_PRODUCTION_VERIFIED | Implemented |
| PARTIAL_LIVE | Partial LIVE |
| FOUNDATION_READ_ONLY | Foundation |
| UI_ONLY / MOCK_ONLY | Preview |
| PLANNED | Planned |
| DEFERRED | Deferred |

Internal enum names are not shown as badge text. Badges use `role="status"` and `aria-label="Capability status: …"`.

Color is supplementary; text is required for meaning.
