# RC6-A11Y-02 — Touch-target review

Repository standard: **44×44 px** (`ACCESSIBILITY_GUIDE.md`).

## Corrections

| Control | Change |
| --- | --- |
| Navbar cart | `min-h-11 min-w-11` |
| Mobile menu toggle | `min-h-11 min-w-11` |
| Desktop nav links | `min-h-11` |
| Branch / phone / My Telepizza / Order Now | `min-h-11` |
| Carousel prev/next | `size-11 min-h-11 min-w-11` (was `size-8`) |
| Hero dots | Hit box `min-h-11 min-w-11` with visual pill inside |
| Footer socials | `min-h-11 min-w-11 w-11 h-11` |
| Footer quick links | `min-h-11` |
| Favorite hearts | `min-h-11 min-w-11` |
| Menu category chips / size SKUs / Add / View | `min-h-11` |
| Admin login submit | `min-h-11` |

## Manual

Mobile `/` and `/menu`: targets do not overlap; no horizontal overflow observed in Playwright overflow asserts.

## Limitation

Cart drawer qty ± controls (outside this PR’s primary chrome) were not expanded; documented as residual if still compact.
