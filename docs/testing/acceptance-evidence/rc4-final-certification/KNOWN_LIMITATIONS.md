# Known Limitations

1. Linked Production migration tip lags by entire RC3/RC4 window starting `20260731010000`.
2. `employee_number` not re-asserted in `20260731150000` compatibility file (still covered by pending `20260731050000`).
3. Full clean `supabase db reset` not re-executed in this session; local spot-check + linked list used.
4. Firefox/WebKit not run.
5. No Production migration/deploy from this agent.
6. Stashes preserved; not applied.
