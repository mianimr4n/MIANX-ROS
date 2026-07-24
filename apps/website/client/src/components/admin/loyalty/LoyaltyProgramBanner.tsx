export function LoyaltyProgramBanner() {
  return (
    <section
      aria-labelledby="loyalty-program-status-heading"
      className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 md:px-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="loyalty-program-status-heading" className="text-sm font-semibold text-sky-950">
            Programme status
          </h2>
          <p className="mt-1 text-sm text-sky-900">
            Customer loyalty intelligence derived from order history — points ledger not yet available.
          </p>
          <p className="mt-2 text-xs text-sky-800">
            Order-derived customer profiles only. No points issuance, tier assignment, or reward redemption until a
            persistent loyalty backend ships.
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-900">
          Foundation + Derived
        </span>
      </div>
    </section>
  );
}
