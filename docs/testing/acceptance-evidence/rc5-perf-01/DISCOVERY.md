# RC5-PERF-01 — Discovery

## Baseline

| Item | Value |
| --- | --- |
| Baseline SHA | `11aa195361364d1e48b3f1f589acbb9ca8bd173f` |
| Branch | `feature/rc5-perf-01-entry-bundle` |
| Build command | `pnpm --filter telepizza-pakistan build` |
| Node | `v24.18.0` |
| pnpm | `10.15.1` |

Historical RC4 entry (not used as official before): ~1,019.99 kB raw / ~294.51 kB gzip.

## Re-measured before (current main tip)

| Metric | Value |
| --- | --- |
| Entry JS | `index-As0WwPEE.js` — **1,022.61 kB** raw / **294.63 kB** gzip |
| CSS | 175.57 kB raw / 27.10 kB gzip |
| Total JS | 2,162.24 kB raw / 589.10 kB gzip |
| JS chunks | 79 |
| Large-chunk warnings | 1 (`>500 kB` entry) |
| Source maps | off in production build (analysis used a temporary sourcemap build) |

## Top entry contributors (sourcemap analysis)

| Group | Approx. original source size | Classification |
| --- | --- | --- |
| `react-dom` | ~533 kB | Shared framework/runtime |
| `@supabase/*` (auth-js largest) | ~700 kB+ combined | Required authentication shell |
| `framer-motion` + `motion-dom` | ~456 kB | Public shell (Home/Menu/Navbar/Cart) |
| `embla-carousel` | ~47 kB | Home hero only (was eager via HeroSlider) |
| `@radix-ui/react-select` + dialog | ~tens of kB | Pizza customizer (was eager via provider) |
| `AdminShell` + `admin-access` | app code | **Accidental eager** via eager `AdminUnauthorized` |
| Static menu-data / catalog helpers | ~40 kB app | Required menu/ordering shell |
| Checkout / booking / auth pages | tens of kB app | Deferrable from critical entry |

## Proposed splits

| Module/group | Current eager reason | Proposed boundary | Routes affected | Risk |
| --- | --- | --- | --- | --- |
| Secondary public pages (About, Contact, Branches, Booking, Checkout, Track, ProductDetail, NotFound) | App.tsx static imports (RC4 kept marketing+checkout eager) | `React.lazy` route chunks | Non-critical public | Low — Suspense already present |
| Customer auth pages + StaffLogin | App.tsx static imports | `React.lazy` | Auth / staff login | Low |
| `AdminUnauthorized` / `AdminIndexRedirect` | Eager admin helpers | `React.lazy` | Admin deep links | Low — removes `AdminShell` from entry |
| `PizzaCustomizerDialog` | Global provider always mounted dialog | Component lazy when `sku` set | Menu add-to-cart customizer | Low — brief Suspense null |
| `HeroSlider` + Embla | Eager Home import | Lazy inside Home | `/` only | Low — accessible hero fallback |
| Framer Motion / Supabase / React | Shell still requires them | **Keep eager** (no sync `manualChunks` peel) | All | N/A — peeling would be byte-shift |

## Intentionally not done

- No Supabase client swap / auth-only subset (architecture change).
- No Framer Motion removal from Navbar/Home (behavior change).
- No `manualChunks` for motion/supabase (would create synchronous sibling chunks — not a real win).
- No Production Lighthouse / RUM claims.
