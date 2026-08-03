# Duplicate-request results

| Finding | Disposition |
| --- | --- |
| Owner multi-endpoint fan-out | Intentional distinct GETs — not identical duplicates |
| Branch switch | AbortController cancels obsolete in-flight reads |
| Identical concurrent coalescing | `shareIdenticalRead` utility + contract |
| Mutations | Never deduplicated |

Budget: zero uncontrolled identical concurrent reads.
