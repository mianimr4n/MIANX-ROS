# Known Limitations

1. **Messaging provider not configured** — submissions remain queued/suppressed; delivered/opened/clicked require explicit provider confirmation (never fabricated).
2. **Delivery not claimed** — adapters return `deliveryClaimed: false`; UI must not show open/click rates.
3. **Some segment previews UNAVAILABLE** — formulas documented; counts not invented for heavy/windowed segments.
4. **Liability PKR only with valuation rule** — `liabilityPkr` null unless `valuation_rule=configured_rate` with rate.
5. **Customer rewards UX still coming soon** — `/loyalty` and My Telepizza rewards remain honest empty; admin experience API is LIVE for staff.
6. **SMS/push providers unsupported** — non-goals; email/WhatsApp adapters are stubs.
7. **Playwright screenshots** depend on local Supabase + API + website + enterprise seed accounts.
8. **No Production migration** in this slice.

## Honesty commitment

No fabricated delivered / open / click. No false attribution from timing. No sample rewards shown as live when catalogue empty.
