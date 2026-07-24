# RC1 Founder Acceptance Report

## Decision record

| Item | Decision |
| --- | --- |
| Release train | RC1 |
| Product tip accepted | Commit F `533887c…` |
| Documentation package | Commit G (`docs/rc1/`) |
| Maturity claim | Flagship **evaluation** build with honest PARTIAL/Foundation modules |
| Production cloud go-live | **Not** authorized by this document alone |

## Accepted capabilities

- Local enterprise development stack with env guard  
- Admin ERP shell + RBAC helpers  
- Owner operational modules (Orders, Kitchen board, POS, Delivery, derived CRM/Loyalty/WhatsApp, Menu read, Dashboard/Reports)  
- Branch Manager workspace  
- Kitchen Manager KDS (PARTIAL lifecycle)  
- Customer browse → order path  
- Permanent RC1 quality gate and authorization harnesses  

## Explicitly not accepted as complete

- Full ERP ledgers (Inventory, Purchasing, Finance, HR)  
- AI Command Center / autonomous agents  
- KDS advanced execution (bump/recall/stations/item PATCH/sound)  
- Menu write APIs / WhatsApp provider  
- Dedicated Playwright CI suite  
- Cloud production cutover  

## Contaminations avoided

| Check | Result |
| --- | --- |
| Product code in G | Must be 0 |
| Test/harness changes in G | Must be 0 |
| Dependency/lockfile in G | Must be 0 |
| Migration in G | Must be 0 |

## Founder sign-off block

| Role | Name | Date | Signature |
| --- | --- | --- | --- |
| Founder | | | |
| Release Engineer | | | |

By signing, the Founder accepts that RC1 communications must match **repository truth** documented in `docs/rc1/`, not aspirational master plans.
