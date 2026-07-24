import { cn } from "@/lib/utils";

/** Decorative sparkline only — never implies historical analytics. */
export function AdminSparkline({
  className,
  decorative = true,
}: {
  className?: string;
  decorative?: boolean;
}) {
  const series = [4, 6, 5, 8, 7, 9, 8];
  const max = Math.max(...series, 1);
  const min = Math.min(...series, 0);
  const range = Math.max(max - min, 1);
  const width = 72;
  const height = 28;
  const path = series
    .map((value, index) => {
      const x = (index / (series.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("text-[var(--brand-red)]/40", className)}
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "Decorative trend placeholder — not historical data"}
    >
      <title>Decorative placeholder</title>
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
