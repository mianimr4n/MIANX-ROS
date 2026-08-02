# RC6-A11Y-02 — Heading hierarchy review

## `/` Home + HeroSlider

| Before | After |
| --- | --- |
| Each hero slide used deal name as `h1` (multiple `h1`) | Active slide: brand `h1` (`Telepizza`); deal title `h2`; inactive brand rendered as `p` with `aria-hidden` |
| Footer section titles `h4` | Footer section titles `h2` |

Visual brand typography preserved via existing display classes.

## `/menu`

| Before | After |
| --- | --- |
| `h1` Our Menu + product `h3` (skipped `h2`) | Product titles promoted to `h2` under Our Menu |

## `/admin/login`

Unchanged: single `h1` “Sign in to ERP”.
