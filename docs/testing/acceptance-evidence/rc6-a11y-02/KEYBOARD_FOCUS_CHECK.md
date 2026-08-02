# RC6-A11Y-02 — Keyboard / focus check

## Verified (local)

| Flow | Result |
| --- | --- |
| Tab to mobile Open menu | Focus visible |
| Activate Open menu | Sheet opens; Menu link reachable |
| Escape | Sheet closes; Open menu restored (`aria-expanded=false`) |
| Hero carousel prev/next | Keyboard-activable buttons with sr-only names |
| Hero dots | Focusable with visible focus ring |
| Menu category chips | `aria-pressed` toggles; keyboard activable |
| Admin login | Email/password/Sign in in logical order |
| No `tabindex > 0` introduced | Confirmed in touched components |
| No `aria-hidden` on focusable CTAs in hero slides | Conditional heading only |

## Not expanded

Full admin ERP keyboard audit remains out of scope (spot-check only via QA-02 dashboard axe).
