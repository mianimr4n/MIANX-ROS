import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";

export function SettingsStatusBadge({
  classification,
}: {
  classification: "LIVE" | "READ-ONLY" | "DERIVED" | "FOUNDATION" | "UNAVAILABLE";
}) {
  const styles: Record<string, string> = {
    LIVE: "bg-emerald-50 text-emerald-800",
    "READ-ONLY": "bg-sky-50 text-sky-800",
    DERIVED: "bg-sky-50 text-sky-800",
    FOUNDATION: "bg-[var(--admin-soft)] text-[var(--admin-muted)]",
    UNAVAILABLE: "bg-[var(--admin-soft)] text-[var(--admin-muted)]",
  };
  const label =
    classification === "LIVE"
      ? null
      : classification === "READ-ONLY"
        ? "Read-only"
        : classification === "DERIVED"
          ? "Calculated"
          : "Planned for Phase 2";
  if (!label) return null;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${styles[classification]}`}>
      {label}
    </span>
  );
}

export function SettingsScopeBadge({ scope }: { scope: string }) {
  return (
    <span className="rounded-full bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
      Scope · {scope}
    </span>
  );
}

export function SettingsFoundationPanel({
  title,
  description,
  body,
  scope = "Organization",
}: {
  title: string;
  description: string;
  body: string;
  scope?: string;
}) {
  return (
    <AdminSurface aria-labelledby={`settings-foundation-${title.replace(/\s+/g, "-").toLowerCase()}`}>
      <AdminSurfaceHeader title={title} description={description} />
      <AdminSurfaceBody>
        <div className="mb-3 flex flex-wrap gap-2">
          <SettingsStatusBadge classification="FOUNDATION" />
          <SettingsScopeBadge scope={scope} />
        </div>
        <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6">
          <p className="font-semibold text-[var(--admin-ink)]">{title} — Planned for Phase 2</p>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">{body}</p>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function SettingsUnavailablePanel({
  title,
  description,
  body,
  scope = "Organization",
}: {
  title: string;
  description: string;
  body: string;
  scope?: string;
}) {
  return (
    <AdminSurface aria-labelledby={`settings-unavailable-${title.replace(/\s+/g, "-").toLowerCase()}`}>
      <AdminSurfaceHeader title={title} description={description} />
      <AdminSurfaceBody>
        <div className="mb-3 flex flex-wrap gap-2">
          <SettingsStatusBadge classification="UNAVAILABLE" />
          <SettingsScopeBadge scope={scope} />
        </div>
        <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6">
          <p className="font-semibold text-[var(--admin-ink)]">{title} — Planned for Phase 2</p>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">{body}</p>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function SettingsReadOnlyNotice({ message }: { message: string }) {
  return (
    <p className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950" role="status">
      {message}
    </p>
  );
}

export function SettingsSaveBar() {
  return (
    <div
      className="sticky bottom-0 z-10 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-panel)] px-4 py-3"
      role="region"
      aria-label="Save controls"
    >
      <p className="text-sm text-[var(--admin-muted)]">
        These save controls are Planned for Phase 2.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled className="min-h-11 cursor-not-allowed rounded-lg border border-dashed border-[var(--admin-border)] px-4 text-sm text-[var(--admin-muted)]">
          Cancel · Planned for Phase 2
        </button>
        <button type="button" disabled className="min-h-11 cursor-not-allowed rounded-lg border border-dashed border-[var(--admin-border)] px-4 text-sm text-[var(--admin-muted)]">
          Reset · Planned for Phase 2
        </button>
        <button type="button" disabled className="min-h-11 cursor-not-allowed rounded-lg bg-[var(--admin-soft)] px-4 text-sm font-semibold text-[var(--admin-muted)]">
          Save · Planned for Phase 2
        </button>
      </div>
    </div>
  );
}
