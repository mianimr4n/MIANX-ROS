# Developer Onboarding

## Fast path

1. Clone the repo  
2. `pnpm install`  
3. Start Docker Desktop  
4. Follow [LOCAL_DEVELOPMENT_SETUP.md](./LOCAL_DEVELOPMENT_SETUP.md)  
5. `pnpm local:seed`  
6. Open http://localhost:3000/admin/login  

## What you get

- Local Postgres + Auth + Studio + Mailpit  
- Royal Orchard branch + menu foundation  
- Staff roles for Owner, Branch Manager, Kitchen, Cashier, Support, Rider  
- Sample OMS/KDS orders including a **queued** kitchen ticket  

## Manual steps (honest)

These are still manual (not a single forever-running supervisor):

1. `npx supabase start` (Docker required)  
2. Write env with `pnpm local:env …`  
3. Restart API/Vite after env rewrite  
4. Run `pnpm local:seed` after `db reset`  

`pnpm local` prints this checklist; it does not silently mutate cloud.

## Do not

- Confirm orders while `/readyz` shows `*.supabase.co`  
- Commit `scripts/.tmp_pw/` or `.tmp/`  
- Use `write-backend-env.mjs` without understanding it writes cloud config  
- Push migrations with `supabase db push` during local ERP work  

## Next modules after local is green

Kitchen live-ticket acceptance, OMS confirm, Delivery, Inventory, Finance — **against local only**.
