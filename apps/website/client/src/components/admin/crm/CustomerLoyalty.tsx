export function CustomerLoyalty() {
  return (
    <section aria-labelledby="crm-loyalty-heading">
      <h3 id="crm-loyalty-heading" className="text-sm font-semibold">
        Loyalty summary
      </h3>
      <p className="mt-2 rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-3 text-sm text-[var(--admin-muted)]">
        Points, tiers, and rewards are <span className="font-semibold tracking-wide">Planned for Phase 2</span> —
        no loyalty ledger API for admin CRM yet.
      </p>
    </section>
  );
}

export function MarketingPreferences() {
  const rows = [
    { id: "sms", label: "SMS opt-in" },
    { id: "whatsapp", label: "WhatsApp opt-in" },
    { id: "email", label: "Email opt-in" },
    { id: "push", label: "Push opt-in" },
  ] as const;

  return (
    <section aria-labelledby="crm-marketing-heading">
      <h3 id="crm-marketing-heading" className="text-sm font-semibold">
        Marketing preferences
      </h3>
      <ul className="mt-3 space-y-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-center justify-between rounded-xl border border-dashed border-[var(--admin-border)] px-3 py-2 text-sm text-[var(--admin-muted)]"
          >
            <span>{row.label}</span>
            <span className="text-[10px] font-semibold tracking-wide">Planned for Phase 2</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-[var(--admin-muted)]">
        Customer notification prefs exist only as browser-local storage on My Telepizza — not staff-readable.
      </p>
    </section>
  );
}

export function CustomerTagsFoundation({ repeat, inactive }: { repeat: boolean; inactive: boolean }) {
  return (
    <section aria-labelledby="crm-tags-heading">
      <h3 id="crm-tags-heading" className="text-sm font-semibold">
        Customer tags
      </h3>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full border border-dashed border-[var(--admin-border)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
          VIP · Planned for Phase 2
        </span>
        <span className="rounded-full border border-dashed border-[var(--admin-border)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
          Corporate · Planned for Phase 2
        </span>
        <span className="rounded-full border border-dashed border-[var(--admin-border)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
          Blocked · Planned for Phase 2
        </span>
        {repeat ? (
          <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-950">
            Frequent buyer (derived)
          </span>
        ) : null}
        {inactive ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-950">
            Inactive (derived)
          </span>
        ) : (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-900">
            Active (derived)
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-[var(--admin-muted)]">
        Stored CRM tags are Planned for Phase 2. Activity badges above are rule-based from order history only.
      </p>
    </section>
  );
}
