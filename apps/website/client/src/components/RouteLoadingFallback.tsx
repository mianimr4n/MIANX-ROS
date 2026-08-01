/**
 * Accessible suspense fallback for lazy route chunks (RC4-7).
 */
export function RouteLoadingFallback({ label = "Loading page" }: { label?: string }) {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 py-16 text-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{label}</span>
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-red)] border-t-transparent"
        aria-hidden
      />
      <p className="text-sm text-[var(--admin-muted,#6b7280)]">{label}…</p>
    </div>
  );
}
