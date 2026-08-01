# Accessibility

## Suite

`playwright.rc4-performance-polish.config.ts` — Chromium.

| Surface | Result |
| --- | --- |
| Admin login | axe 0 critical / 0 serious |
| Admin dashboard | axe 0 critical / 0 serious |
| Admin loyalty | axe 0 critical / 0 serious |
| Support deep-link (Planned) | axe 0 critical / 0 serious |
| Public home | Overflow check PASS; full axe deferred |

## Fixes landed

- Mobile nav menu button `aria-label`
- Branch selector `aria-label`
- Footer social links `aria-label`
- Route suspense fallback `role="status"` / `aria-live`

## Known limitation

Public marketing home still has legacy `color-contrast` and some icon-link naming debt outside the RC4 admin critical path. Tracked for a follow-up marketing a11y pass — not hidden as PASS.
