import type { PosChannelMode } from "@/lib/admin-pos";
import type { AdminRestaurantTable } from "@/lib/admin-api";

export function CustomerPanel({
  channel,
  guestMode,
  onGuestMode,
  name,
  phone,
  address,
  tableId,
  couponCode,
  onName,
  onPhone,
  onAddress,
  onTableId,
  onCoupon,
  tables,
  tablesLive,
}: {
  channel: PosChannelMode;
  guestMode: boolean;
  onGuestMode: (guest: boolean) => void;
  name: string;
  phone: string;
  address: string;
  tableId: string;
  couponCode: string;
  onName: (value: string) => void;
  onPhone: (value: string) => void;
  onAddress: (value: string) => void;
  onTableId: (value: string) => void;
  onCoupon: (value: string) => void;
  tables: AdminRestaurantTable[];
  tablesLive: boolean;
}) {
  const needsAddress = channel === "delivery" || channel === "phone";
  const needsTable = channel === "dine-in";

  return (
    <section
      className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4"
      aria-label="Customer panel"
    >
      <h3 className="text-base font-semibold">Customer</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onGuestMode(true)}
          className={`min-h-10 rounded-lg px-3 text-sm font-semibold ${
            guestMode ? "bg-[var(--brand-red)] text-white" : "border border-[var(--admin-border)]"
          }`}
          aria-pressed={guestMode}
        >
          Guest
        </button>
        <button
          type="button"
          disabled
          className="min-h-10 cursor-not-allowed rounded-lg border border-dashed border-[var(--admin-border)] px-3 text-sm text-[var(--admin-muted)]"
          title="Customer lookup is not available yet"
        >
          Existing customer · Foundation
        </button>
      </div>

      <div className="mt-3 grid gap-3">
        <label className="text-xs font-medium text-[var(--admin-muted)]">
          Name
          <input
            value={name}
            onChange={(event) => onName(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm"
            placeholder="Customer name"
            required
          />
        </label>
        <label className="text-xs font-medium text-[var(--admin-muted)]">
          Phone
          <input
            value={phone}
            onChange={(event) => onPhone(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm"
            placeholder="03XXXXXXXXX or +92…"
            required
          />
        </label>
        {needsAddress ? (
          <label className="text-xs font-medium text-[var(--admin-muted)]">
            Address (delivery)
            <textarea
              value={address}
              onChange={(event) => onAddress(event.target.value)}
              className="mt-1.5 min-h-20 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm"
              placeholder="Delivery address"
            />
          </label>
        ) : null}
        {needsTable ? (
          <label className="text-xs font-medium text-[var(--admin-muted)]">
            Table number (dine-in)
            {tablesLive ? (
              <select
                value={tableId}
                onChange={(event) => onTableId(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm"
                aria-label="Select table"
              >
                <option value="">Select table (noted on order)</option>
                {tables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.tableNumber}
                    {table.displayName ? ` · ${table.displayName}` : ""} · {table.status}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <input
                  value={tableId}
                  onChange={(event) => onTableId(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm"
                  placeholder="Table # (stored in notes)"
                />
                <span className="mt-1 block text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">
                  Table inventory requires branch.manage · session link Foundation
                </span>
              </>
            )}
          </label>
        ) : null}
        <label className="text-xs font-medium text-[var(--admin-muted)]">
          Coupon code
          <input
            value={couponCode}
            onChange={(event) => onCoupon(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm"
            placeholder="Optional — applied on live quote"
          />
        </label>
        <p className="text-xs text-[var(--admin-muted)]">
          Manual discount / promotion picker · Foundation (coupon field uses quote API only).
        </p>
      </div>
    </section>
  );
}
