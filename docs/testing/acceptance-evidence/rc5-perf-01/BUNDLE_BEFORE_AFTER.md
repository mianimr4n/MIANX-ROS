# RC5-PERF-01 — Bundle before / after

**Baseline SHA:** `11aa195361364d1e48b3f1f589acbb9ca8bd173f`  
**Branch:** `feature/rc5-perf-01-entry-bundle`  
**Build:** `pnpm --filter telepizza-pakistan build`  
**Node / pnpm:** `v24.18.0` / `10.15.1`  
**Machine-readable:** `bundle-before.json`, `bundle-after.json`, `bundle-summary.json`

Gzip sizes use Node `zlib.gzipSync(level=9)` on emitted assets (same method before/after).

## Summary table

| Metric | Before | After | Change |
| --- | --- | --- | --- |
| Entry raw | 1,022,605 B (1,022.61 kB) | 869,748 B (869.75 kB) | **−14.9%** |
| Entry gzip | 294,633 B (294.63 kB) | 254,945 B (254.95 kB) | **−13.5%** |
| Total JS raw | 2,162,241 B | 2,167,143 B | +0.23% |
| Total JS gzip | 589,097 B | 594,174 B | +0.86% |
| Largest chunk raw | 1,022,605 B (entry) | 869,748 B (entry) | −14.9% |
| Largest chunk gzip | 294,633 B (entry) | 254,945 B (entry) | −13.5% |
| Number of JS chunks | 79 | 61 | −18 |
| CSS raw / gzip | 175.57 / 27.10 kB | 175.68 / 27.12 kB | ~flat |
| Sync imports from entry | 0 extra | **0** | no eager sibling shift |
| Large-chunk warnings (`>500 kB`) | 1 | 1 | explained: residual shell still >500 kB raw |

## Targets

| Target | Result |
| --- | --- |
| Primary: entry gzip −≥10% | **PASS** (−13.47%) |
| Preferred: entry gzip ≤ ~265 kB | **PASS** (254.95 kB) |
| Entry gzip must not regress | **PASS** |
| Total JS gzip ≤ +2% | **PASS** (+0.86%) |
| No sync byte-shift disguised as win | **PASS** (`staticImportCount: 0`) |

## Chunk strategy

1. Route-level `React.lazy` for non-critical public/auth/admin helper pages.
2. Component lazy: `PizzaCustomizerDialog`, Home `HeroSlider` (Embla).
3. `experimentalMinChunkSize: 12_000` to merge tiny async lucide fragments (reduces chunk sprawl / gzip overhead without sync-importing deferred vendors into entry).
4. Kept eager: Home, Menu, AdminLogin, Auth/Cart/Menu/Branch providers, Navbar/Footer/CartDrawer, React, Framer Motion, Supabase client.

## Modules moved out of entry

- About, Contact, Branches, PublicBooking, Checkout, OrderSuccess, TrackOrder, ProductDetail, NotFound
- Login, Register, ForgotPassword, ResetPassword, AuthCallback, Welcome, StaffLogin
- AdminUnauthorized (**was pulling AdminShell**), AdminIndexRedirect
- Pizza customizer dialog + ProductConfigurator + radix select/dialog path
- HeroSlider + embla-carousel (async on `/` only)

## Modules kept eager (intentional)

- React / react-dom, wouter shell
- Framer Motion (Navbar, Cart, Menu, Home chrome)
- Supabase JS (AuthProvider)
- Static menu catalog bootstrap
- Home, Menu, AdminLogin page modules
- Global providers required by public shell

## Warnings

| Phase | Warning |
| --- | --- |
| Before | One Vite/Rollup `chunks are larger than 500 kB` (entry ~1023 kB) |
| After | One same class of warning (entry ~870 kB raw). Residual is shared shell (React + Supabase + motion + catalog), not accidental AdminShell/checkout. |

## Determinism

Two clean `dist` rebuilds: identical entry byte size, identical chunk stem set (61 JS assets). No circular chunk warnings.
