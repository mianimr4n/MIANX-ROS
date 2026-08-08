import { useCallback, useEffect, useState } from "react";

import { BranchReadinessWorkspace } from "@/components/admin/branches/BranchReadinessWorkspace";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import { canAccessBranchReadiness } from "@/lib/admin-access";
import {
  fetchBranchConfigurationHistory,
  fetchBranchEffectiveConfiguration,
  fetchBranchReadinessList,
  type BranchReadiness,
  type ConfigurationHistory,
  type EffectiveConfiguration,
} from "@/lib/admin-api";
import { AdminShell } from "./AdminShell";

export default function AdminBranches() {
  const { session, roles, isSuperAdmin } = useAuth();
  const allowed = canAccessBranchReadiness({ roles, isSuperAdmin, permissions: [] });
  const { gateReady, isAuthLoading } = useAdminAccessGate(allowed);
  const [reports, setReports] = useState<BranchReadiness[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [effective, setEffective] = useState<EffectiveConfiguration | null>(null);
  const [history, setHistory] = useState<ConfigurationHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const token = session?.access_token;

  useEffect(() => {
    if (!gateReady || !token) return;
    const controller = new AbortController();
    setLoading(true); setError(null);
    fetchBranchReadinessList(token, { signal: controller.signal })
      .then((data) => { setReports(data); setSelectedId((current) => current && data.some((item) => item.branchId === current) ? current : data[0]?.branchId ?? null); })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Branch readiness could not be loaded."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [gateReady, refresh, token]);

  useEffect(() => {
    if (!selectedId || !token || !gateReady) { setEffective(null); setHistory(null); return; }
    const controller = new AbortController();
    setDetailLoading(true);
    Promise.all([
      fetchBranchEffectiveConfiguration(token, selectedId, { signal: controller.signal }),
      fetchBranchConfigurationHistory(token, selectedId, { limit: 50 }, { signal: controller.signal }),
    ]).then(([configuration, audit]) => { setEffective(configuration); setHistory(audit); })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Branch detail could not be loaded."); })
      .finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
    return () => controller.abort();
  }, [gateReady, selectedId, refresh, token]);

  const retry = useCallback(() => setRefresh((value) => value + 1), []);

  if (isAuthLoading || loading) return <AdminShell title="Branch readiness"><p className="text-sm text-[var(--admin-muted)]" aria-live="polite">Loading live branch readiness…</p></AdminShell>;
  if (!allowed) return <AdminShell title="Branch readiness"><p className="text-sm text-[var(--admin-muted)]">You do not have access to enterprise branch readiness.</p></AdminShell>;

  return <AdminShell title="Branch readiness & settings">
    <header className="mb-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-red-dark)]">PHASE2-04 · Read-only control plane</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--admin-ink)] sm:text-3xl">Branch readiness</h1>
      <p className="mt-2 max-w-3xl text-sm text-[var(--admin-muted)]">Review live launch blockers, effective configuration provenance, active versions, and immutable change history without developer access.</p></header>
    {error ? <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="alert"><p>{error}</p><button type="button" onClick={retry} className="mt-2 font-semibold underline">Retry</button></div> : null}
    {!error && reports.length === 0 ? <div className="rounded-xl border border-[var(--admin-border)] bg-white p-8 text-center"><h2 className="font-semibold">No branches in scope</h2><p className="mt-2 text-sm text-[var(--admin-muted)]">No repository-authorized branch is available to this session.</p></div> : null}
    {reports.length > 0 ? <BranchReadinessWorkspace reports={reports} selectedId={selectedId} onSelect={setSelectedId}
      effective={effective} history={history} detailLoading={detailLoading} onRetry={retry} /> : null}
  </AdminShell>;
}
