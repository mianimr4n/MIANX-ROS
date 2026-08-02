# RC5 Production — public route smoke

**Target:** `https://telepizza-website.vercel.app`
**Deployed SHA:** `152ce409609dc78e48d0d2b6b0c34a35d6338c24`
**Entry asset:** `index-CtwmS6OY.js` (content-hashed)

| Route | HTTP | SPA shell | Notes |
| --- | --- | --- | --- |
| `/` | 200 | PASS | header/footer/hero content via Playwright |
| `/menu` | 200 | PASS | refresh usable |
| `/admin/login` | 200 | PASS | Email/Password form renders |
| `/reset-password` | 200 | PASS | honest no-session state; recovery **not** triggered |

Also covered by Production run of `entry-bundle-smoke.spec.ts` (5/5 PASS): direct loads, refresh, navigation `/` → `/menu` → `/admin/login`, no chunk-crash copy, no blank main.

**Verdict:** PASS
