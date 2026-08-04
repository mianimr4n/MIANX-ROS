# Phase 1.1 — Production deployment anchors

## Vercel target

| Field | Value |
| --- | --- |
| Account | `mianimr4n` |
| Team | `mianimr4n-5543s-projects` |
| Project | `telepizza-website` |
| Project ID | `prj_WCCIzQ6HB0HST7DFNM5tja579Kof` |
| Local `.vercel` linkage | matches project ID above |
| Production alias | `https://telepizza-website.vercel.app` |

## Cutover

| Field | Value |
| --- | --- |
| New deployment ID | `dpl_FgHubLsuWo5ahYri18mjayCCw9nu` |
| Deployment URL | `https://telepizza-website-dpphc3yne-mianimr4n-5543s-projects.vercel.app` |
| Target | Production |
| State | READY |
| Git SHA | `bfe60cc6a3074e08e61f85b458b19e724325eba4` |
| Created | ~`2026-08-03T23:59:32Z` (Vercel git Production on #202 merge) |
| Alias proof | `telepizza-website.vercel.app` listed on deployment aliases |
| GitHub status proof | Vercel success URL contains `FgHubLsuWo5ahYri18mjayCCw9nu` for commit `bfe60cc…` |

## Rollback target (pre-cutover)

| Field | Value |
| --- | --- |
| Deployment | `dpl_BtPH8AvtUsKHwjJaQAf7gEVMMpom` |
| Git SHA | `830dbc8b5916cc0a724a0d7489a0e34387a26f78` (`v1.5.0`) |
| Rollback executed | **No** |

## Chain

```text
telepizza-website.vercel.app
  → dpl_FgHubLsuWo5ahYri18mjayCCw9nu
  → bfe60cc6a3074e08e61f85b458b19e724325eba4
  → READY
```
