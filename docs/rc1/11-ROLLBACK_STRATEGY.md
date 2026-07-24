# RC1 Rollback Strategy

## Principles

- Commits **A–F** are frozen; do not rewrite history to “undo” product.  
- Prefer **forward-fix** or **revert commits** on a new branch if a release must be withdrawn.  
- Commit **G** is docs-only — reverting G does not change runtime behavior.

## Layered rollback

| Layer | Action | Effect |
| --- | --- | --- |
| Docs (G) | `git revert <G-sha>` | Removes release package docs only |
| Quality (F) | `git revert 533887c` | Removes tests/harnesses/gate scripts; product A–E remain |
| KDS (E) | `git revert 52e7179` | `/admin/kitchen-dashboard` returns ComingSoon; APIs remain |
| Branch Manager (D) | `git revert 08dd85d` | BM workspace removed; Owner ERP remains |
| Owner ERP (C) | `git revert ea29ad0` | Owner modules unwire; foundation may remain |
| Admin foundation (B) | `git revert ac61c48` | Shell/RBAC helpers removed |
| Local infra (A) | `git revert 6a175fa` | Local scripts/env helpers removed |

## Database

RC1 product commits **did not** introduce new migrations in E/F. Rolling back application commits does **not** automatically roll back already-applied Supabase migrations. DB rollback requires an explicit migration strategy (out of scope for G).

## Emergency stop

1. Stop public traffic / disable deploy target.  
2. Keep local evaluation branch intact for forensics.  
3. Do not force-push frozen SHAs.  
4. Document incident against Commit Register SHAs.
