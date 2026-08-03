# POLISH-03 — Role / authorization

Presentation-only slice. Access gates (`canAccessAdmin*`, table-service helpers) unchanged.

Verified by static composition + existing access helper tests:

- Orders / Delivery / Kitchen / WhatsApp / POS / Floor / Reservations / Waitlist still gated by prior helpers
- No permission broadening
- No new mutation surfaces for restricted roles
