export function MenuCatalogBanner({ usingFallback }: { usingFallback: boolean }) {
  if (!usingFallback) return null;

  return (
    <div
      className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      role="status"
      aria-live="polite"
    >
      <p className="font-semibold">Showing offline menu copy</p>
      <p className="mt-1 text-amber-900/90">
        The live catalog could not be reached. Prices may be out of date — reconnect and refresh when you can.
      </p>
    </div>
  );
}
