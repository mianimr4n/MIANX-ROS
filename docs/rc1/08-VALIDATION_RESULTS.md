# RC1 Validation Results

Evidence captured during controlled Commits E–F closeout and gate stabilization (local Windows development host).

## Blocking quality gate

Command: `pnpm rc1:gate`

Stabilized orchestration (Commit F):

1. local:guard  
2. website typecheck  
3. backend typecheck  
4. backend tests (Vitest `--pool=forks --maxWorkers=1 --fileParallelism=false`, **before** website build)  
5. website build  
6. admin static suites (17)  
7. auth/branch matrix  
8. KDS authorization  
9. BM browser — **SKIP** (non-blocking optional)

Accepted outcome after stabilization:

```text
BLOCKING FAILURES: 0
RESULT: PASS
EXIT 0
```

## Role / branch matrix

`node scripts/rc1/auth-branch-matrix.mjs` → `ok: true`, exit 0  
Foreign branch 403, malformed 400, cashier kitchen denied, anon denied.

## KDS authorization

`node scripts/rc1/kds-auth.mjs` → `ok: true`, `apiOk: true`, `uiOk: true` (with known intermittent UI flake under load)

## Product freeze (F)

Product paths modified by Commit F: **0**

## Not claimed

- Production cloud load test  
- Full Playwright CI green on remote  
- Penetration test report  
- 100% ERP ledger validation  
