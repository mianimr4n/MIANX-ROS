# Branding Verification

**Pack:** Telepizza V1 Business Freeze Pack  
**Date:** 2026-07-14  
**Scope:** All customer-facing brand surfaces before V1 lock.

---

## Verification matrix

| Area | Item | Current value | Evidence | Status | Owner sign-off |
|---|---|---|---|---|---|
| **Logo** | Primary file | `public/images/telepizza-logo.png` | In repo | 🟡 | ⬜ |
| | Root `Logo.jpg` | Unused in build | Repo root | 🟡 Archive? | ⬜ |
| | SVG fallback | `image-fallback.ts` | Code | 🟢 | ⬜ |
| | Favicon set | — | Not verified | 🔴 | ⬜ |
| | OG image | — | Not verified | 🔴 | ⬜ |
| **Colors** | Primary red | `#E31E24` | `index.css` | 🟢 | ⬜ |
| | Red dark / light | `#B5121B` / `#F04B50` | `index.css` | 🟢 | ⬜ |
| | Gold accent | `#F5B800` | `index.css` | 🟢 | ⬜ |
| | Charcoal / cream / orange | `#1F1F1F` / `#FFF7F3` / `#FF6B35` | `index.css` | 🟢 | ⬜ |
| | Legacy `#D22630` comment | Navbar | Conflicts tokens | 🟡 Remove? | ⬜ |
| **Fonts** | Display — Poppins | Loaded | `index.css` | 🟢 | ⬜ |
| | Body — DM Sans | Loaded | `index.css` | 🟢 | ⬜ |
| | Accent — Space Grotesk | Loaded | `index.css` | 🟢 | ⬜ |
| | Mobile readability | — | Not tested | 🔴 | ⬜ |
| **Voice** | Printed tagline | "Love At First Bite" | GM Link 1 | 🟢 evidence | ⬜ |
| | Site tagline | "Pakistan's boldest pizza experience" | Footer | 🟡 unverified | ⬜ |
| | About narrative | Global Telepizza history + Multan | `About.tsx` | 🟡 review | ⬜ |
| **Contact** | Phone | **0304-1110495** | GM Link 1 + site | 🟢 | ⬜ |
| | WhatsApp | Same number via cart | Code | 🟢 | ⬜ |
| | Email | — | Not on menu photo | 🔴 | ⬜ |
| **Branches** | Royal Orchard address | Royal Orchard Main Business Plaza, Musa Wala, Multan 60000 | Site + DB | 🟡 | ⬜ |
| | Royal Orchard status | Operating | Site | 🟡 | ⬜ |
| | Northern Bypass | Coming Soon | Site + DB | 🟢 | ⬜ |
| | Hours Royal Orchard | 10:00 AM – 2:30 AM | Site + DB | 🟡 BFR-006 | ⬜ |
| | Hours on printed menu | Not shown | GM photos | 🔴 | ⬜ |
| **Social** | Facebook | facebook.com/telepizza.pk | Footer | 🟡 verify live | ⬜ |
| | Instagram | instagram.com/telepizzapakistan | Footer | 🟡 verify live | ⬜ |
| | TikTok | tiktok.com/@telepizzapakistan | Footer | 🟡 verify live | ⬜ |

---

## Unsupported claims register

| Claim | Location | Evidence | Action | Decision ID | Status |
|---|---|---|---|---|---|
| Google Rating **4.3** | `About.tsx` | None in repo | Confirm or remove | BFR-008 | 🔴 OPEN |
| **642+ Reviews** | `About.tsx` | None | Confirm or remove | BFR-008 | 🔴 OPEN |
| **10K+ Happy Customers / month** | `About.tsx` | None | Confirm or remove | BFR-008 | 🔴 OPEN |
| **Late Night Delivery Every Day** | `About.tsx` | Hours not on menu | Tie to BFR-006 | BFR-006 | 🟡 |
| **Fast Delivery** promise | `About.tsx` | Qualitative | Owner approve wording | — | 🟡 |
| **30 minute** delivery | Search site | Not found in audit | N/A | — | 🟢 |
| **Free delivery** threshold | Docs only | BD-012 deferred | Phase 2 | BD-012 | DEFERRED |
| **Mobile app available** | — | Not found on site | N/A | — | 🟢 |

---

## SEO checklist

| Item | Route / scope | Current | Target | Status |
|---|---|---|---|---|
| `<title>` | Home | Telepizza | Owner-approved | 🟡 |
| `<title>` | Menu | — | Unique | 🔴 |
| `<title>` | About | — | Unique | 🔴 |
| Meta description | All public routes | Partial | Owner-approved | 🔴 |
| OG title / image | Share previews | — | Branded | 🔴 |
| Canonical URL | Production domain | telepizza.pk suspended? | Active HTTPS | 🔴 |
| LocalBusiness schema | If used | — | Match branch facts | 🔴 |
| `robots.txt` | Crawl rules | — | Verify | 🔴 |
| Sitemap | URLs | — | Generate | 🔴 |
| Image alt text | Menu items | Generic / missing | Per PRODUCT-CATALOG | 🔴 |

---

## Brand asset inventory

| Asset | Path | Format | Used | Final? |
|---|---|---|---|---|
| Logo PNG | `public/images/telepizza-logo.png` | PNG | Navbar, Footer | 🟡 |
| Logo JPG | `/Logo.jpg` (root) | JPG | No | 🔴 |
| Hero banner | `public/images/hero-banner.jpg` | JPG | Home | 🟡 |
| Category placeholders | menu-pizza, menu-burger, etc. | JPG | Many items share | 🔴 |
| Deal promos | `public/images/promos/*.jpg` | JPG | 4 deals | 🟡 |

**Note:** `assets/brand/` not present — establish canonical brand archive path (owner decision).

---

## Page-by-page branding sign-off

| Page | Brand consistent | Copy verified | Contact correct | Signed |
|---|---|---|---|---|
| Home | 🟡 | 🟡 | 🟢 | ⬜ |
| Menu | 🟢 | 🟡 prices | 🟢 | ⬜ |
| About | 🟡 | 🔴 stats | 🟢 | ⬜ |
| Branches | 🟢 | 🟡 hours | 🟢 | ⬜ |
| Footer (global) | 🟢 | 🟡 | 🟢 | ⬜ |
| Navbar (global) | 🟢 | 🟢 | 🟢 | ⬜ |
| Cart / Checkout | 🟢 | 🟡 | 🟢 | ⬜ |

---

## Branding gate (G5)

**Pass criteria:**

- [ ] All 🟢 items above have owner initials
- [ ] Zero 🔴 unsupported claims on public pages
- [ ] BFR-006, BFR-008, BFR-009 resolved in Decision Register
- [ ] Social links manually verified live
- [ ] SEO checklist complete for all indexed routes

**Approver:** _________________ **Date:** _________

---

*Next: [IMAGE-ASSET-REGISTER.md](./IMAGE-ASSET-REGISTER.md) for per-product visuals.*
