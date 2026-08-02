# Repository vs Production anchors

| Anchor | Value | Notes |
| --- | --- | --- |
| Repository main (closeout baseline tip) | `152ce409609dc78e48d0d2b6b0c34a35d6338c24` | Pre-closeout `origin/main` |
| Annotated release tag | `v1.3.0` @ `74b6b8e9be1e2eea68dc70cb93f0bf6472a2568b` | No GitHub Release object |
| Production website SHA | `152ce409609dc78e48d0d2b6b0c34a35d6338c24` | Evidenced |
| Vercel Production deployment | `dpl_7xaV34uyAEdMLvWckWKQASPAxJ7r` | Alias `telepizza-website.vercel.app` |
| Prior website rollback target | `dpl_FriiC2PsK3bEYrXbXLVuNSXv3G3y` (`795efee…`) | Not executed |
| Production API SHA (observed) | `152ce409609dc78e48d0d2b6b0c34a35d6338c24` | `/healthz` + `/readyz` |
| API deployment by RC5 website cutover | **NOT INTENTIONALLY PERFORMED** | Tip may match via platform auto-deploy; do not conflate with website deploy |
| Production migration tip | `20260801180000` | Unchanged by RC5 cutover |
| RC5 cutover migrations | **NONE** | |
| RC5 cutover Production SQL | **NONE** | |

## Separation rules

1. Repository merge ≠ Production website deploy.
2. Production website deploy ≠ Production API deploy.
3. Migration tip is independent of application SHAs.
4. Tag `v1.3.0` remains the last annotated SemVer until Founder creates a later tag.
