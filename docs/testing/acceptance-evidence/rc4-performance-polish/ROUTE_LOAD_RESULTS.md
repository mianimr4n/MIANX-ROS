# Route Load Results

## Method

Playwright Chromium against local website (`playwright.rc4-performance-polish.config.ts`).
Timings are wall-clock navigate→visible content — **not** Lighthouse lab scores or load-test certification.

## Soft timings (local)

| Route | Viewport | Soft ceiling | Notes |
| --- | --- | --- | --- |
| `/admin/login` | 390 | axe suite | Auth form visible |
| `/` | 390 | axe + overflow check | No horizontal overflow |
| `/admin/dashboard` | 1440 | < 90s soft | Lazy chunk + Owner dashboard |
| `/admin/loyalty` | 1440 | < 90s soft | Lazy chunk after dashboard |

## Before/after structural change

| Metric | Before | After |
| --- | --- | --- |
| Admin JS download on `/` visit | Entire 2.1 MB monolith | Entry ~1.0 MB only (admin chunks deferred) |
| First admin navigation | Already in memory | Fetch dedicated Admin* chunk |

Screenshots: `screenshots/`.
