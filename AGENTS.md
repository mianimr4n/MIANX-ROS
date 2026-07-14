# AGENTS.md

## Cursor Cloud specific instructions

This is a `pnpm` monorepo (`telepizza-platform`) with two implemented apps plus a Supabase/Postgres backing store. Node 20+ and `pnpm@10.15.1` are used. The startup update script already runs `pnpm install`, so dependencies are ready when a session begins.

### Services

| Service | Location | Dev command (run from repo root) | Port | Notes |
|---|---|---|---|---|
| Customer website (React 19 + Vite) | `apps/website` | `pnpm dev:website` | 3000 | Primary product. Runs fully standalone on bundled menu/branch data — needs no backend. |
| Backend REST API (Express + Supabase) | `backend/api` | `pnpm --filter @telepizza/api dev` | 4000 | Thin layer over Supabase; data endpoints require the local Supabase stack (below). |
| Supabase local stack (Postgres/Studio/etc.) | `supabase/` | `supabase start` | 54321 API / 54322 DB / 54323 Studio | Only needed to exercise the backend's data endpoints end-to-end. |

Standard scripts live in the root `package.json` and each package's `package.json` (e.g. `pnpm check`, `pnpm test`, `pnpm build:website`). See `apps/website/README.md` for website details.

### Lint / test / build

- Type-check both packages: `pnpm check`.
- Tests: `pnpm test` (runs `test:db` — Node's test runner over `tests/database/*.test.mjs`, static SQL assertions with no live DB — then `test:backend` — Vitest + supertest in `backend/api`).
- Website prod build: `pnpm build:website`.

### Running the backend against Supabase (non-obvious)

`docker` and the `supabase` CLI are preinstalled in the VM image. Docker is NOT auto-started.

1. Start the Docker daemon (needed by Supabase): `sudo dockerd > /tmp/dockerd.log 2>&1 &`. The daemon is configured for `fuse-overlayfs` with the containerd snapshotter disabled (required for Docker 29 in this VM); do not change `/etc/docker/daemon.json`.
2. Start Supabase: `sudo supabase start` (from repo root). This pulls images on first run and applies the migrations in `supabase/migrations/`.
3. The backend requires these env vars (values from `sudo supabase status -o env` — the classic `ANON_KEY` / `SERVICE_ROLE_KEY` JWTs, not the new `sb_publishable_`/`sb_secret_` keys): `API_JWT_SECRET` (any string ≥16 chars), `SUPABASE_URL=http://127.0.0.1:54321`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Without them `/readyz` returns 503 (but `/healthz` still responds and the server still boots).
4. **Known repo gap:** the SQL migrations enable RLS and add public read policies but never `GRANT` table privileges to the `anon`/`authenticated`/`service_role` roles, so every table returns `42501 permission denied` (affects both PostgREST and the API) until grants are applied. After `supabase start`, run:
   ```
   sudo docker exec supabase_db_telepizza-platform psql -U postgres -d postgres -c \
     "GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role; \
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role; \
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;"
   ```
   This must be re-applied after any `supabase db reset` / fresh `supabase start`. The proper fix is to add these grants to the migrations.

### Verifying the stack

- Website: open `http://localhost:3000` — browse Menu, add an item, and the cart drawer builds a WhatsApp (`wa.me`) order message.
- Backend data path: `curl http://localhost:4000/api/v1/branches` and `curl http://localhost:4000/api/v1/menu/catalog` return real rows once Supabase is up and grants are applied.

### Route note

The menu catalog route is `GET /api/v1/menu/catalog` (there is no `/api/v1/menu` or `/api/v1/menu/categories`). Module list: `GET /api/v1/meta/modules`.
