# Known Limitations

1. Entry JS still ~1.0 MB gzip ~294 kB — shared providers + marketing chrome; further `manualChunks` deferred.
2. No Production load test / Lighthouse certification claimed.
3. Loyalty liability sums page up to 10k rows per type — not a SQL aggregate RPC yet.
4. Account list `offset` is applied in-process after a limited fetch (honest pagination meta; full SQL offset deferred).
5. Public marketing home a11y color-contrast / some icon links remain legacy debt (admin critical routes axe-clean).
6. Firefox/WebKit not executed in this environment.
7. `stash@{0}` RC4-11 evidence refresh preserved; not applied.
8. No Production migration or deployment.
