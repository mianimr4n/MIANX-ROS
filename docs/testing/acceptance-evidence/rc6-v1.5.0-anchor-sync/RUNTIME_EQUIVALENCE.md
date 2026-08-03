# RC6 v1.5.0 — Runtime equivalence

## Proof

```text
git diff b14163c..830dbc8 -- apps/website
# (empty)
```

| From | To | Path | Result |
| --- | --- | --- | --- |
| `b14163ccbc82fca0b2856ea137bddb746ed5716b` | `830dbc8b5916cc0a724a0d7489a0e34387a26f78` | `apps/website` | **empty** |
| same | same | `backend/api` | empty (Phase 1 intent) |
| same | same | `supabase/migrations` | empty |

## Interpretation

- Active Production **deployment commit** is `830dbc8…` / `dpl_BtPH8…`.
- Effective website **runtime code** is unchanged from QA-04 feature tip `b14163c…`.
- Changes after `b14163c…` through closeout were documentation/evidence only (#192).

## Verification retained

- Public smoke PASS on Production (incl. release commit).
- Public a11y PASS.
- Owner smoke `failCount: 0` (QA-04 first green @ `b14163c…`; re-verify @ `830dbc8…`).
- Logout / protected-route PASS.
- CI green on `830dbc8…`.
- No intentional backend deploy; no migration / Production SQL.
