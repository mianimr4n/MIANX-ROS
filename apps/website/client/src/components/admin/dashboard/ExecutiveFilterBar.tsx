import { useAuth } from "@/contexts/AuthContext";
import { useAdminBranch } from "@/contexts/AdminBranchContext";

export type ExecutiveDashboardFilters = {
  status: string;
  channel: string;
  deliveryType: string;
};

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready" },
  { value: "dispatched", label: "Dispatched" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const CHANNEL_OPTIONS = [
  { value: "", label: "All channels" },
  { value: "website", label: "Website" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "mobile", label: "Mobile" },
  { value: "pos", label: "POS" },
  { value: "admin", label: "Admin" },
];

const TYPE_OPTIONS = [
  { value: "", label: "All delivery types" },
  { value: "delivery", label: "Delivery" },
  { value: "pickup", label: "Pickup" },
  { value: "dine-in", label: "Dine-in" },
];

export const DEFAULT_EXECUTIVE_FILTERS: ExecutiveDashboardFilters = {
  status: "",
  channel: "",
  deliveryType: "",
};

export function ExecutiveFilterBar({
  filters,
  onChange,
  onReset,
}: {
  filters: ExecutiveDashboardFilters;
  onChange: (next: ExecutiveDashboardFilters) => void;
  onReset: () => void;
}) {
  const { selection, setSelection, allowedBranches, canSelectAll, label } = useAdminBranch();
  const { isSuperAdmin } = useAuth();
  const aggregateLabel = isSuperAdmin ? "All Branches" : "Assigned Branches";

  return (
    <form
      className="grid gap-3 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4 md:grid-cols-2 xl:grid-cols-6"
      onSubmit={(event) => event.preventDefault()}
      aria-label="Global dashboard context"
    >
      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Branch scope
        <select
          className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm text-[var(--admin-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-red)]"
          aria-label="Filter by branch"
          value={selection.mode === "all" ? "all" : selection.branchId}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "all") setSelection({ mode: "all" });
            else setSelection({ mode: "branch", branchId: value });
          }}
        >
          {canSelectAll ? <option value="all">{aggregateLabel}</option> : null}
          {allowedBranches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.shortName || branch.name}
            </option>
          ))}
          {!canSelectAll && allowedBranches.length === 0 ? <option value="">{label}</option> : null}
        </select>
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Date range
        <select
          className="mt-1.5 w-full cursor-not-allowed rounded-lg border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-2 text-sm text-[var(--admin-muted)]"
          aria-label="Date range unavailable"
          aria-disabled="true"
          disabled
          value="today"
        >
          <option value="today">Today (API scope)</option>
        </select>
        <span className="mt-1 block text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">
          Disabled · Planned for Phase 2
        </span>
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Status
        <select
          className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-red)]"
          aria-label="Filter by status"
          value={filters.status}
          onChange={(event) => onChange({ ...filters, status: event.target.value })}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Channel
        <select
          className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-red)]"
          aria-label="Filter by channel"
          value={filters.channel}
          onChange={(event) => onChange({ ...filters, channel: event.target.value })}
        >
          {CHANNEL_OPTIONS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="text-xs font-medium text-[var(--admin-muted)]">
        Delivery type
        <select
          className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-red)]"
          aria-label="Filter by delivery type"
          value={filters.deliveryType}
          onChange={(event) => onChange({ ...filters, deliveryType: event.target.value })}
        >
          {TYPE_OPTIONS.map((option) => (
            <option key={option.value || "all"} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-end">
        <button
          type="button"
          onClick={onReset}
          className="min-h-10 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-semibold text-[var(--admin-ink)] hover:bg-[var(--admin-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]"
        >
          Reset filters
        </button>
      </div>
    </form>
  );
}
