# Performance guardrails

| Check | Result |
| --- | --- |
| New dependency | None |
| New API / polling | None |
| Axe in production bundle | No — `@axe-core/playwright` remains root devDependency / e2e only |
| Admin lazy routes | Intact |
| Resize listeners | Single `matchMedia` in AdminShell (no storm) |
| Continuous layout observers | None added |
