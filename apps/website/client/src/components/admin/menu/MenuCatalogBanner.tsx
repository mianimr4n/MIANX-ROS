export function MenuCatalogBanner({ usingFallback }: { usingFallback: boolean }) {
  return (
    <section
      aria-labelledby="menu-catalog-mode-heading"
      className="mb-6 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 md:px-5"
    >
      <h2 id="menu-catalog-mode-heading" className="text-sm font-semibold text-sky-950">
        Catalog mode
      </h2>
      <p className="mt-1 text-sm text-sky-900">
        {usingFallback
          ? "Displaying verified static fallback — connect VITE_API_BASE_URL + Supabase for live catalog."
          : "Live catalog from GET /api/v1/menu/catalog — management writes are not exposed to admin yet."}
      </p>
      <p className="mt-2 text-xs text-sky-800">
        Unavailable or hidden DB rows are filtered server-side (is_available / is_active). This workspace shows the
        operational catalog consumed by Website, POS, and quote APIs.
      </p>
    </section>
  );
}
