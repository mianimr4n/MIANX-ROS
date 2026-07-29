import type { MenuCatalogItemView } from "@/lib/admin-menu";

type ChannelRow = {
  channel: string;
  status: "consuming" | "partial" | "future";
  note: string;
};

function channelRows(product: MenuCatalogItemView): ChannelRow[] {
  const browse = product.catalogScope === "browse";
  return [
    {
      channel: "Website menu",
      status: browse ? "consuming" : "future",
      note: browse ? "GET /menu/catalog browse items" : "Internal toppings not on public menu",
    },
    {
      channel: "POS",
      status: browse ? "consuming" : "partial",
      note: browse ? "Shared MenuCatalogContext" : "Toppings used in customizer only",
    },
    {
      channel: "WhatsApp",
      status: "partial",
      note: "Customer builds cart externally — no menu admin publish flag",
    },
    {
      channel: "Kitchen",
      status: "partial",
      note: "Order line names — not driven by publish matrix yet",
    },
    {
      channel: "Delivery / Quote API",
      status: browse ? "consuming" : "future",
      note: browse ? "Quote uses menuItemSlug from catalog" : "—",
    },
    {
      channel: "Menu Management master",
      status: "future",
      note: "This module consumes live menu.write APIs (PUT /admin/menu/skus/:id, POST /admin/menu/categories)",
    },
  ];
}

export function PublishingPanel({ product }: { product: MenuCatalogItemView }) {
  const rows = channelRows(product);

  return (
    <section aria-labelledby="publishing-panel-heading">
      <h3 id="publishing-panel-heading" className="text-sm font-semibold">
        Publishing & channel visibility
      </h3>
      <p className="mt-1 text-xs text-[var(--admin-muted)]">
        Honest channel matrix — no per-SKU publish toggles exist in the repository today.
      </p>
      <ul className="mt-3 space-y-2 text-sm">
        {rows.map((row) => (
          <li key={row.channel} className="rounded-xl border border-[var(--admin-border)] px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{row.channel}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  row.status === "consuming"
                    ? "bg-emerald-50 text-emerald-800"
                    : row.status === "partial"
                      ? "bg-sky-50 text-sky-800"
                      : "bg-[var(--admin-soft)] text-[var(--admin-muted)]"
                }`}
              >
                {row.status === "consuming" ? "Consuming catalog" : row.status === "partial" ? "Partial" : "Future"}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--admin-muted)]">{row.note}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
