# POLISH-01 — Module navigator decision

**Decision: OPTION A — Role-aware module navigator**

| Property | Value |
| --- | --- |
| Control label | “Go to module” |
| Scope | Authorized nav items (`available === true`) only |
| Data | Route title, group, href, approved keywords |
| Backend | **none** |
| PII / business records | **none** |
| Keyboard | Ctrl/Cmd+K; dialog accessible via existing `CommandDialog` |
| Empty state | “No authorized modules match.” |

Replaces the primary dead control “Search unavailable”.
