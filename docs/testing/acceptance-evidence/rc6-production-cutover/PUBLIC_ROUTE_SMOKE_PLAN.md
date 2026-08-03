# Public Production smoke plan (DRAFT — do not execute yet)

**Base:** `https://telepizza-website.vercel.app`  
**After** Founder-authorized deploy of `bf5912c91826efce1d097c2ba1a5a0f9c37157ee` only.

| Route | Checks |
| --- | --- |
| `/` | HTTP success; shell renders; no fatal boundary; no chunk-load error; brand/h1 landmark; mobile sanity |
| `/menu` | HTTP success; menu shell; category/product landmarks; no fatal/chunk errors |
| `/admin/login` | HTTP success; email/password fields; no authenticated shell leak |
| `/reset-password` | HTTP success; recovery shell; no unexpected console/chunk errors |

Record only aggregate pass/fail. No credentials or PII in evidence.
