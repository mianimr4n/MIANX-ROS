# Customer Account Center — Final Production UX & Functional QA

**Date:** 2026-07-17  
**Repository:** `D:\projects\telepizza`  
**Branch:** `fix/customer-auth-production`  
**PR:** [#58](https://github.com/mianimr4n/telepizza/pull/58)  
**Scope:** Customer Account Center only (Overview, Profile, Addresses, Security, Orders, Loyalty, Notifications) + related Orders page polish, tests, and this report.  
**Out of scope:** Sprint 4.6, Rider/Kitchen/Admin/POS, catalog/menu/pricing, auth architecture redesign, merge/deploy.

---

## Recommendation

**BLOCKED**

Code polish, static production guards, type-check, tests, and website build all pass. Signed-out Account/Login/Loyalty/Orders/Forgot Password screenshots were captured across four viewports. However, **authenticated Account Center tabs (Overview/Profile/Addresses/Security/Orders/Loyalty/Notifications) were not browser-verified** because:

1. Cursor IDE browser MCP failed to create/navigate tabs (`No browser tab available` even with `newTab: true`).
2. No owner test credentials were available for a real signed-in Playwright session against local Supabase/auth.

Do not merge until an owner (or credentialed session) visually confirms the signed-in Account Center tabs once.

---

## Issues Found

| ID | Area | Severity | Finding |
|---|---|---|---|
| F1 | Overview | High (UX honesty) | Dashboard showed invented **Reward Points / Gold-Starter tier** and a dead **Favorite Items** tile. |
| F2 | Loyalty | High (UX honesty) | Account Loyalty tab rendered fake **Current points / tier / Redeem / Points history** preview instead of Premium Coming Soon. |
| F3 | Orders matching | High (correctness) | Account/Orders used `profile.phone \|\| user.email \|\| user.id` with `listLocalOrders`, which can invent non-phone matches because orders are keyed by checkout phone digits. |
| F4 | Orders honesty | Medium | Orders page showed placeholder **Payment: Not provided** and **ETA: Not available** (fake operational data). |
| F5 | Profile | Medium | **Verify phone** looked actionable but only wrote a notice — ambiguous UX. |
| F6 | Addresses | Low | Delete had no confirmation. |
| F7 | Security copy | Low | Session/email-change copy referenced internal/provider wording more than customer language. |
| F8 | Notifications | Low | Placeholder wording felt developer-ish (“Preview of preference controls…”). |
| F9 | Accessibility | Medium | Nav/overview tiles lacked explicit focus-visible rings; notification switches used clickable labels around disabled inputs. |
| F10 | Visual QA gap | Critical (process) | Authenticated tabs could not be screenshot-verified in this run. |

---

## Issues Fixed

| ID | Fix |
|---|---|
| F1 | Overview now shows only real tiles: Active Orders, Saved Addresses, Recent Orders, Account Security, Last Order, Loyalty (**Premium Coming Soon**). Removed Reward Points + Favorite Items. |
| F2 | Loyalty tab is a clean **Premium Coming Soon** empty state with no points/rewards. |
| F3 | Account + Orders match device-local orders by **profile phone only**; empty guidance when phone is missing. |
| F4 | Removed Payment/ETA placeholders; added status badges, Branch + Type from real stored order fields, responsive card layout. |
| F5 | Phone verify control is **disabled Coming Soon** (no fake action). |
| F6 | Address delete asks for confirmation. |
| F7 | Customer-facing Security/session/email-change copy. |
| F8 | Notifications copy is professional future-settings placeholder; switches remain disabled and clearly unavailable. |
| F9 | Focus-visible rings on Account nav + overview tiles; notification rows no longer wrap disabled inputs in interactive labels; polite live regions for success notices. |
| — | Orders Account tab now lists real recent local orders (when phone matches) with Track CTA, plus empty states. |

---

## Remaining Limitations

1. **Authenticated visual QA not completed** (blocks merge recommendation).
2. Saved addresses remain **device-local** (`localStorage`) — checkout wiring works, but addresses do not sync across devices/browsers.
3. Orders history in Account/My Orders is **device-local**, matched by checkout phone — not a server order history API.
4. Phone verification / WhatsApp OTP / notification delivery / loyalty earning remain intentionally unavailable.
5. Header nav contrast on light backgrounds is a site-wide concern (outside Account Center polish); noted from screenshots, not changed in this scope.
6. Cursor IDE browser MCP remained unavailable for interactive automation in this session.

---

## Responsive Results

Playwright Chromium screenshots captured for:

| Viewport | Routes captured |
|---|---|
| Desktop `1440x900` | `/account`, `/login`, `/loyalty`, `/orders`, `/forgot-password` |
| Laptop `1280x800` | same |
| Tablet `768x1024` | same |
| Mobile `390x844` | same |

### Observed (signed-out / public)

- Account signed-out gate centers cleanly on desktop and mobile; Login/Register CTAs readable.
- Login mobile stack is usable; Google CTA + email form + forgot-password link present.
- Loyalty Coming Soon page is professional with no fake points.
- Orders signed-out gate prompts Login (expected).
- No clipping/overflow found on captured signed-out pages.

### Not verified visually (authenticated)

- Sidebar / horizontal Account tab nav
- Profile/Address forms
- Security password/email forms
- Orders list with badges
- In-Account Loyalty/Notifications tabs

---

## UX Improvements

- Removed placeholder dashboard inventing rewards/favorites.
- Loyalty is honest Premium Coming Soon.
- Orders empty states explain phone matching instead of silently showing unrelated local orders.
- Security/Notifications use customer language.
- Address delete confirmation reduces accidental data loss on this device.

---

## Accessibility Results

### Improved in this pass
- Semantic buttons for Account section nav + overview tiles.
- Visible `focus-visible` rings on Account nav and overview tiles.
- Form labels remain associated (`htmlFor` / `id`).
- Success notices use `role="status"` + `aria-live="polite"`; errors keep `role="alert"`.
- Disabled notification controls expose unavailable state via `aria-label` and Coming Soon copy.
- Disabled Verify phone control is non-actionable and titled as Coming Soon.

### Not fully verified
- Full keyboard walkthrough of authenticated Account Center (blocked by auth/session availability).
- Screen-reader pass.

---

## Performance / Code Hygiene

- Removed unused `getLoyaltyPoints` import/path from Account Center.
- Avoided fake loyalty localStorage display in Account UI.
- No catalog/auth architecture changes.
- No new dependencies added to the monorepo (Playwright used only as a temporary external screenshot tool).

---

## Validation Results

Commands run from repo root:

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm check` | PASS (website + backend `tsc`) |
| `pnpm test` | PASS — **119** Node DB/menu/website tests + **127** backend Vitest tests (**16** files) |
| `pnpm build:website` | PASS |
| `git diff --check` | PASS |

PR mergeability at audit start: `MERGEABLE` / `CLEAN` vs `main`.

---

## Screenshots

Evidence folder:

`_documentation-audit/evidence/customer-account-center-final-qa/`

| File | Viewport | Route / state |
|---|---|---|
| `desktop-1440-account-signed-out.png` | 1440×900 | `/account` signed-out |
| `desktop-1440-login.png` | 1440×900 | `/login` |
| `desktop-1440-loyalty-coming-soon.png` | 1440×900 | `/loyalty` |
| `desktop-1440-orders-signed-out.png` | 1440×900 | `/orders` signed-out |
| `desktop-1440-forgot-password.png` | 1440×900 | `/forgot-password` |
| `laptop-1280-account-signed-out.png` | 1280×800 | `/account` signed-out |
| `laptop-1280-login.png` | 1280×800 | `/login` |
| `laptop-1280-loyalty-coming-soon.png` | 1280×800 | `/loyalty` |
| `laptop-1280-orders-signed-out.png` | 1280×800 | `/orders` signed-out |
| `laptop-1280-forgot-password.png` | 1280×800 | `/forgot-password` |
| `tablet-768-account-signed-out.png` | 768×1024 | `/account` signed-out |
| `tablet-768-login.png` | 768×1024 | `/login` |
| `tablet-768-loyalty-coming-soon.png` | 768×1024 | `/loyalty` |
| `tablet-768-orders-signed-out.png` | 768×1024 | `/orders` signed-out |
| `tablet-768-forgot-password.png` | 768×1024 | `/forgot-password` |
| `mobile-390-account-signed-out.png` | 390×844 | `/account` signed-out |
| `mobile-390-login.png` | 390×844 | `/login` |
| `mobile-390-loyalty-coming-soon.png` | 390×844 | `/loyalty` |
| `mobile-390-orders-signed-out.png` | 390×844 | `/orders` signed-out |
| `mobile-390-forgot-password.png` | 390×844 | `/forgot-password` |

### Tooling blockers (honest)

- **Cursor IDE browser MCP:** could not open/navigate a tab (`No browser tab available`).
- **Authenticated Playwright capture:** blocked — no test customer credentials / signed-in session for local auth.

---

## Owner follow-up to unblock READY FOR MERGE

1. Sign in with a real customer account on the PR preview or local site.
2. Walk every Account Center tab + My Orders at desktop and mobile.
3. Confirm profile save, address CRUD → checkout prefill, Google first-time password (New+Confirm only), email password change (current Telepizza password), forgot/reset entry points.
4. Re-run or attach authenticated screenshots, then flip recommendation to **READY FOR MERGE**.

---

**Final recommendation: `BLOCKED`**
