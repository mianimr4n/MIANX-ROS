# RC4-2 Known Limitations

1. Scheduled report **execution** is DEFERRED until an analytics worker exists (definitions are stored).
2. Supplier on-time SLA rate is UNAVAILABLE when receipt SLA timestamps are missing (no fake rates).
3. Recipe coverage metric is UNAVAILABLE pending a dedicated menu×recipe coverage join in analytics.
4. Finance AR/AP open balances are delegated to Finance routes for drill-down rather than duplicated aggregates.
5. PDF export is a minimal text PDF (not a full print layout engine).
6. No Production migration/deploy in this slice.
7. Some kitchen/delivery status enums may differ by environment; engine maps common active sets and returns UNAVAILABLE on schema miss.
