# RC1 Known Limitations

## Product maturity

1. **KDS is PARTIAL** — supported: queued → accepted → preparing → ready → completed/cancelled. Unsupported: bump, recall, HANDED_TO_RIDER, stations, item-level PATCH, sound.  
2. **Foundation ERP modules** (Inventory, Purchasing, Finance, HR, Settings) are honesty UIs without domain ledgers.  
3. **CRM / Loyalty / WhatsApp** are largely order-derived; no provider send / points ledger.  
4. **Menu writes** not exposed via API.  
5. **AI Command Center** and Governed AI agents are not runtime-shipped.  
6. **Three kitchen UIs** coexist (Owner, KDS, Ops).  

## Technical / ops

7. API must load `.env.local` explicitly (`node --env-file=.env.local …`) — plain `pnpm … dev` may boot with `/readyz` 503.  
8. Docker Desktop required for local Supabase.  
9. Staff handover fixture is gitignored local seed output.  
10. AGENTS.md historical blanket GRANT note is **stale** relative to hardened migrations.  
11. Open PR #99 title/scope predates full A–F register.  
12. Remote is behind local by D+E+F until push is Founder-authorized.  

## Testing

13. BM browser harness is optional and historically flaky.  
14. No dedicated Playwright CI project.  
15. Browser/UI harnesses can flake under resource pressure.

## Documentation scope

16. This Commit G package documents **repository truth**. Legacy archive docs under `docs/18-reference/archive/**` may conflict and are not RC1 authority.
