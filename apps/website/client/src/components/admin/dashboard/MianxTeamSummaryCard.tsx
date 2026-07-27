import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import { computeOpeningCountdown } from "@/lib/opening-countdown";

/** Compact Executive Dashboard summary — links to full Team Center. */
export function MianxTeamSummaryCard() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const countdown = useMemo(() => computeOpeningCountdown(now.getTime(), false), [now]);

  return (
    <AdminSurface className="bg-gradient-to-br from-white to-[var(--admin-soft)]" aria-labelledby="mianx-team-summary">
      <AdminSurfaceHeader
        title="Mianx.ai Team"
        description="Opening command center — countdown, blockers, and Owner decisions."
      />
      <AdminSurfaceBody>
        <h3 id="mianx-team-summary" className="sr-only">
          Mianx.ai Team summary
        </h3>
        <p className="text-2xl font-semibold tabular-nums text-[var(--admin-ink)]" aria-live="polite">
          {countdown.label}
        </p>
        <p className="mt-1 text-xs text-[var(--admin-muted)]">Target 14 Aug 2026 · 10:00 Asia/Karachi</p>
        <Link
          href="/admin/ai-team"
          className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-[var(--brand-red)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-red-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]"
        >
          Open Mianx.ai Team
        </Link>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}
