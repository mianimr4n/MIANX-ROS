import type { ReportChartDatum } from "@/lib/admin-reports";

export function ReportBarChart({
  data,
  title,
  valueLabel = "Count",
}: {
  data: ReportChartDatum[];
  title: string;
  valueLabel?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  if (data.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[var(--admin-muted)]" role="status">
        No data in current scope for {title.toLowerCase()}.
      </p>
    );
  }

  const summary = data.map((d) => `${d.label}: ${d.value}`).join(", ");

  return (
    <div role="img" aria-label={`${title} bar chart. ${summary}`}>
      <ul className="space-y-3">
        {data.map((datum) => {
          const widthPercent = Math.round((datum.value / max) * 100);
          return (
            <li key={datum.label}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="font-medium capitalize">{datum.label}</span>
                <span className="tabular-nums text-[var(--admin-muted)]">
                  {datum.value} {valueLabel.toLowerCase()}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[var(--admin-soft)]">
                <div
                  className="h-full rounded-full bg-[var(--brand-red)]/80"
                  style={{ width: `${widthPercent}%` }}
                  aria-hidden
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ReportPieLegend({ data }: { data: ReportChartDatum[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  return (
    <ul className="mt-4 grid gap-2 sm:grid-cols-2" aria-label="Distribution breakdown">
      {data.map((datum) => {
        const pct = Math.round((datum.value / total) * 100);
        return (
          <li key={datum.label} className="flex items-center justify-between rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm">
            <span className="capitalize">{datum.label}</span>
            <span className="tabular-nums text-[var(--admin-muted)]">
              {datum.value} ({pct}%)
            </span>
          </li>
        );
      })}
    </ul>
  );
}
