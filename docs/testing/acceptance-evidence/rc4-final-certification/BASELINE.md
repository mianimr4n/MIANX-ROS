# RC4 Final Certification — Baseline

| Item | Value |
| --- | --- |
| Branch | `feature/rc4-final-certification` |
| Base / start | `1d648950a8ea5bfb982713a203bacc6c7dd93ec1` (merge of PR #161 → main) |
| Merged RC4-7 head | `ecf5b772fae5fc8a6c2dda6f3730fa8b72e6851b` |
| PR #161 | MERGED |
| Production SQL / migrations | **Not applied** (unauthorized) |

## Stashes preserved

- `stash@{0}` — RC4-7 Playwright evidence refresh
- `stash@{1}` — RC4-11 evidence refresh

## Decision preview

Production linked migration tip lags local tip. Observed 42703 errors match pending RC3 migrations. Certification **blocked by schema drift**.
