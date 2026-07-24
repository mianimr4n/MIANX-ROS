# RC1 Commit Register

**Status:** Official controlled history for RC1 on `feature/admin-erp-foundation-s1`.

| Commit | SHA | Title (short) | Status |
| --- | --- | --- | --- |
| A — Local Infrastructure | `6a175fa36826c822b6e82e518901a305c2867af3` | chore(infra): isolated local development environment | ✅ Founder Accepted — Frozen |
| B — Admin Foundation | `ac61c48555efd59a8912700ca69fc1328f74955a` | feat(admin): reusable Admin ERP foundation shell and RBAC | ✅ Founder Accepted — Frozen |
| C — Owner Admin ERP | `ea29ad016e0a011eba76d318d0a6226118210e2c` | feat(owner): Owner Admin ERP modules | ✅ Founder Accepted — Frozen |
| D — Branch Manager ERP | `08dd85d12d0c834b7e324423fbe4df57550191ce` | feat(branch): Branch Manager ERP workspace | ✅ Founder Accepted — Frozen |
| E — Kitchen Manager / KDS | `52e71798ea6396e766e6ba5254f7e4e1adb68896` | feat(kitchen): Kitchen Manager workspace and KDS | ✅ Founder Accepted — Frozen (PARTIAL) |
| F — Tests / Security / Quality | `533887cbecda1525ad21f7d5b6b863657d0d2f1c` | test(rc1): finalize quality gates… | ✅ Founder Accepted — Frozen Forever |
| G — Documentation / Release | `4d1297c2190d4bc272563efee83148ad731ff0fd` | docs(rc1): finalize release documentation… | 🟡 Created — Awaiting Founder Acceptance |

## Rules

- No amend, rebase, squash, or rewrite of A–F.  
- G may only add/update documentation and governance artifacts.  
- Push / PR / deploy require separate Founder authorization.

## Remote note

At documentation authoring time, `origin/feature/admin-erp-foundation-s1` may still tip at Commit C while local is ahead by D+E+F(+G).
