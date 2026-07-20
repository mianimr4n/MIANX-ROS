# Telepizza Platform

Official digital platform for **Telepizza Pakistan** (Powered by Mianx.ai).

---

## What ships today

| Surface | Location | Notes |
|---|---|---|
| Customer website | `apps/website` | React + Vite · menu, cart, checkout, account (Phase 1 under Founder review) |
| Backend API | `backend/api` | Express · Supabase/Postgres |
| Database | `supabase/migrations` | Forward-only SQL migrations |
| Canonical menu data | `data/catalog/` | Manifest + generated website fallback |

**Not production-claimed without Founder sign-off:** Admin ERP, POS, mobile apps, franchise portal, full AI workforce.

---

## Branches (product)

- Royal Orchard (operating)
- Northern Bypass (coming soon in product data)

---

## Quick start

```bash
pnpm install
pnpm dev:website          # http://localhost:3000
pnpm --filter @telepizza/api dev   # http://localhost:4000
```

See `AGENTS.md` for Supabase local stack notes.

---

## Documentation

**Start here:** [`docs/README.md`](docs/README.md) — Documentation Map (ACTIVE / REFERENCE / ARCHIVE).

| Topic | Path |
|---|---|
| Master roadmap | [`docs/14-phases/TELEPIZZA-MASTER-ROADMAP.md`](docs/14-phases/TELEPIZZA-MASTER-ROADMAP.md) |
| Architecture | [`docs/architecture/`](docs/architecture/) |
| Database | [`docs/database/`](docs/database/) |
| Agent / Cloud ops | [`AGENTS.md`](AGENTS.md) |

Historical audits and template packs live under [`docs/18-reference/archive/`](docs/18-reference/archive/).

---

## Repository layout

```text
apps/website     Customer web app
backend/api      REST API
data/catalog     Canonical menu manifest
docs/            TEAS documentation tree
scripts/         Tooling
supabase/        Migrations & local DB
tests/           Static + contract tests
```

---

## Deploy config

- Website: `vercel.json`
- API: `render.yaml`

---

## Powered by

Mianx.ai
