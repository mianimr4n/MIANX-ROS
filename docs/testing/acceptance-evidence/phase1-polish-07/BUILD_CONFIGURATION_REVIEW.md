# Build configuration review

| Item | Classification |
| --- | --- |
| Vite env | Only `VITE_*` public |
| Source maps | Not enabled for prod |
| Test tooling in prod | Excluded |
| Service worker | Not present |
| vercel.json | Build + SPA rewrite; no secrets |
