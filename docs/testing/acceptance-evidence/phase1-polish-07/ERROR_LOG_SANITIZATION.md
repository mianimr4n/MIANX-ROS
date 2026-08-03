# Error / log sanitization

| Area | Result |
| --- | --- |
| `submit-order` console.warn | Message-only (no error object dump) |
| `describeApiErrorCategory` | Business language |
| User-facing stacks | Not introduced |
| Correlation IDs | Role-gated in ops UI |

Development diagnostics remain out of Production bundles.
