# Browser storage review

| Key | Contents | Forbidden |
| --- | --- | --- |
| `telepizza.admin.whatChanged.v1` | version, reviewedAt, branchId, businessWindow, safe numeric metrics, sourceOk booleans | tokens, cookies, PII, raw records, order/employee payloads |

Actions: Mark reviewed (write), Reset baseline (clear).  
Cross-device history not claimed. Incognito/new browser = no baseline.
