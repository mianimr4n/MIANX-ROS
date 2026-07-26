export function MenuCatalogBanner({ usingFallback }: { usingFallback: boolean }) {
  return (
    <section
      aria-labelledby="menu-catalog-mode-heading"
      className={`mb-6 rounded-2xl border px-4 py-4 md:px-5 ${
        usingFallback ? "border-amber-200 bg-amber-50" : "border-sky-200 bg-sky-50"
      }`}
    >
      <h2
        id="menu-catalog-mode-heading"
        className={`text-sm font-semibold ${usingFallback ? "text-amber-950" : "text-sky-950"}`}
      >
        Catalog mode: {usingFallback ? "OFFLINE / STALE" : "LIVE"}
      </h2>
      <p className={`mt-1 text-sm ${usingFallback ? "text-amber-900" : "text-sky-900"}`}>
        {usingFallback
          ? "Showing the generated offline fallback (NON-AUTHORITATIVE). Prices may be stale. The live database catalog is unavailable — do not treat these figures as LIVE."
          : "Live catalog from GET /api/v1/menu/catalog. Owner price edits write menu_items.price with a transactional audit event."}
      </p>
      <p className={`mt-2 text-xs ${usingFallback ? "text-amber-800" : "text-sky-800"}`}>
        Every selectable option is one sellable SKU with exactly one price. Product families are presentation
        grouping only. Fallback never overrides a successful API result.
      </p>
    </section>
  );
}
