/**
 * Opening Operations M4 — staff seed (local), live config snapshot, GO/NO-GO dry-run.
 * Never displays or requests plaintext passwords. Production apply stays blocked.
 */
import { useCallback, useEffect, useState } from "react";

import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { ApiRequestError } from "@/lib/api";
import {
  captureOpeningLiveConfigSnapshot,
  completeOpeningDryRun,
  listOpeningDryRuns,
  listOpeningLiveConfigSnapshots,
  listOpeningStaffSeedRuns,
  recordOpeningDryRunFounderDecision,
  recordOpeningDryRunStep,
  simulateOpeningStaffSeedLocal,
  startOpeningDryRun,
  type OpeningDryRunDecision,
  type OpeningDryRunSession,
  type OpeningLiveConfigSnapshot,
  type OpeningStaffSeedRun,
} from "@/lib/admin-api";

const DEFAULT_HANDOVER_DIR = "D:\\telepizza-private\\release-artifacts\\staff-handover";
const DEFAULT_KEY_DIR = "D:\\telepizza-private\\release-artifacts\\staff-handover\\founder-keys";

const DRY_RUN_STEP_CODES = [
  "FOUNDER_SIGN_IN",
  "VERIFY_BRANCH_SETTINGS",
  "VERIFY_PAYMENT_CONFIG",
  "VERIFY_NOTIFICATION_READY",
  "VERIFY_DEVICE_RECORDS",
  "INITIATE_STAFF_SEED",
  "BM_SIGN_IN",
  "BM_VERIFY_BRANCH_SCOPE",
  "CASHIER_SIGN_IN",
  "CASHIER_CREATE_TEST_ORDER",
  "KITCHEN_ACCEPT_TICKET",
  "KITCHEN_MARK_READY",
  "RIDER_ACCEPT_DELIVERY",
  "RIDER_MARK_COMPLETE",
  "SUPPORT_ORDER_LOOKUP",
  "HOST_RESERVATION_FLOW",
  "WAITER_TABLE_ASSIGNMENT",
  "FOUNDER_REVIEW_READINESS",
  "FOUNDER_GO_NO_GO",
] as const;

function errText(err: unknown): string {
  if (err instanceof ApiRequestError) return err.message || `Request failed (${err.statusCode})`;
  return err instanceof Error ? err.message : "The action failed.";
}

function honesty(status: string, problem: string, next: string) {
  return (
    <dl className="mt-2 grid gap-1 text-sm text-[var(--admin-muted)] sm:grid-cols-3">
      <div>
        <dt className="font-semibold text-[var(--admin-ink)]">Status</dt>
        <dd>{status}</dd>
      </div>
      <div>
        <dt className="font-semibold text-[var(--admin-ink)]">Problem</dt>
        <dd>{problem}</dd>
      </div>
      <div>
        <dt className="font-semibold text-[var(--admin-ink)]">Next action</dt>
        <dd>{next}</dd>
      </div>
    </dl>
  );
}

export function OpeningDryRunPanel() {
  const { session, isSuperAdmin, roles } = useAuth();
  const { branchIdFilter, allowedBranches, label: branchLabel } = useAdminBranch();
  const token = session?.access_token;
  const branchId = branchIdFilter ?? allowedBranches[0]?.id ?? null;
  const canWrite = isSuperAdmin || roles.includes("branch-manager");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [seedRuns, setSeedRuns] = useState<OpeningStaffSeedRun[]>([]);
  const [configs, setConfigs] = useState<OpeningLiveConfigSnapshot[]>([]);
  const [dryRuns, setDryRuns] = useState<OpeningDryRunSession[]>([]);
  const [decision, setDecision] = useState<OpeningDryRunDecision>("REVIEW_REQUIRED");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [lastHandoverPath, setLastHandoverPath] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token || !branchId) return;
    setLoading(true);
    setError(null);
    try {
      const [seeds, snaps, runs] = await Promise.all([
        listOpeningStaffSeedRuns(token, branchId),
        listOpeningLiveConfigSnapshots(token, branchId),
        listOpeningDryRuns(token, branchId),
      ]);
      setSeedRuns(seeds);
      setConfigs(snaps);
      setDryRuns(runs);
    } catch (err) {
      setError(errText(err));
    } finally {
      setLoading(false);
    }
  }, [token, branchId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function run(action: () => Promise<unknown>, key: string) {
    if (!token || !branchId) return;
    setBusy(key);
    setError(null);
    try {
      await action();
      await refresh();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(null);
    }
  }

  const latestSeed = seedRuns[0];
  const latestConfig = configs[0];
  const latestDryRun = dryRuns[0];

  return (
    <AdminSurface>
      <AdminSurfaceHeader
        title="Opening dry-run & staff seeding"
        description={`${branchLabel ?? "Selected branch"} — local simulation only. Passwords never shown here. Northern Bypass stays coming-soon.`}
      />
      <AdminSurfaceBody>
        {!branchId ? (
          <p className="text-sm text-[var(--admin-muted)]">Select a branch to manage opening dry-run workflows.</p>
        ) : null}
        {loading ? <p className="text-sm text-[var(--admin-muted)]">Loading opening dry-run state…</p> : null}
        {error ? (
          <p className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}

        <section className="mb-8" aria-labelledby="staff-seed-heading">
          <h3 id="staff-seed-heading" className="text-base font-semibold text-[var(--admin-ink)]">
            Staff seeding (local)
          </h3>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            Generates sealed AES-256-GCM handover outside Git. API never returns plaintext passwords. Production apply is blocked
            in this delivery.
          </p>
          {latestSeed
            ? honesty(
                latestSeed.runStatus === "SIMULATED_LOCAL" ? "ACTIVE" : latestSeed.runStatus,
                latestSeed.localTestOnly
                  ? "Local simulation only — Production apply unauthorized."
                  : "None.",
                "Keep Founder key file private; rotate temp passwords on first login.",
              )
            : honesty("WAITING_ON_HUMAN", "No staff seed run.", "Run local simulation as super-admin.")}
          {lastHandoverPath ? (
            <p className="mt-2 text-xs text-[var(--admin-muted)]">Last sealed handover path recorded (no secrets): {lastHandoverPath}</p>
          ) : null}
          {isSuperAdmin ? (
            <button
              type="button"
              className="mt-3 rounded-md bg-[var(--brand-red)] px-3 py-1.5 text-sm text-white disabled:opacity-50"
              disabled={Boolean(busy) || !token || !branchId}
              onClick={() =>
                void run(async () => {
                  const result = await simulateOpeningStaffSeedLocal(token!, {
                    branchId: branchId!,
                    handoverDir: DEFAULT_HANDOVER_DIR,
                    keyDir: DEFAULT_KEY_DIR,
                  });
                  setLastHandoverPath(result.handoverCipherPath);
                }, "seed-sim")
              }
            >
              {busy === "seed-sim" ? "Seeding…" : "Simulate local staff seed"}
            </button>
          ) : (
            <p className="mt-2 text-sm text-[var(--admin-muted)]">Super-admin required to initiate staff seeding.</p>
          )}
        </section>

        <section className="mb-8" aria-labelledby="live-config-heading">
          <h3 id="live-config-heading" className="text-base font-semibold text-[var(--admin-ink)]">
            Live configuration snapshot
          </h3>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            Asia/Karachi · 10:00–02:30 · dine-in/takeaway/delivery · CASH dry-run only · mock notifications · documented devices.
          </p>
          {latestConfig
            ? honesty("COMPLETE", "None.", "Re-capture after configuration changes.")
            : honesty("WAITING_ON_HUMAN", "No snapshot.", "Capture live-config snapshot.")}
          {canWrite ? (
            <button
              type="button"
              className="mt-3 rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
              disabled={Boolean(busy) || !token || !branchId}
              onClick={() =>
                void run(
                  () => captureOpeningLiveConfigSnapshot(token!, { branchId: branchId! }),
                  "live-config",
                )
              }
            >
              {busy === "live-config" ? "Capturing…" : "Capture live-config snapshot"}
            </button>
          ) : null}
        </section>

        <section aria-labelledby="dry-run-heading">
          <h3 id="dry-run-heading" className="text-base font-semibold text-[var(--admin-ink)]">
            GO/NO-GO dry-run
          </h3>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            Nineteen role-tagged steps with simulated order/ticket/delivery IDs. Does not send notifications or charge cards.
          </p>
          {latestDryRun
            ? honesty(
                latestDryRun.sessionStatus === "COMPLETED" && latestDryRun.result === "PASS"
                  ? latestDryRun.localTestOnly
                    ? "ACTIVE"
                    : "COMPLETE"
                  : latestDryRun.sessionStatus === "FAILED"
                    ? "BLOCKED"
                    : "ACTIVE",
                latestDryRun.localTestOnly
                  ? "Local dry-run evidence — not Production opening approval."
                  : "None.",
                "Record Founder GO/NO-GO when steps are complete.",
              )
            : honesty("WAITING_ON_HUMAN", "No dry-run session.", "Start dry-run after seed + config.")}

          {canWrite ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
                disabled={Boolean(busy) || !token || !branchId}
                onClick={() =>
                  void run(
                    () =>
                      startOpeningDryRun(token!, {
                        branchId: branchId!,
                        seedRunId: latestSeed?.id ?? null,
                        liveConfigSnapshotId: latestConfig?.id ?? null,
                      }),
                    "dry-start",
                  )
                }
              >
                Start dry-run
              </button>
              {latestDryRun && latestDryRun.sessionStatus === "IN_PROGRESS" ? (
                <>
                  <button
                    type="button"
                    className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
                    disabled={Boolean(busy) || !token}
                    onClick={() =>
                      void run(async () => {
                        for (const stepCode of DRY_RUN_STEP_CODES) {
                          await recordOpeningDryRunStep(token!, latestDryRun.id, {
                            stepCode,
                            stepStatus: "PASSED",
                            evidenceSummary: `Local simulation step ${stepCode}`,
                            screenshotHash: `sha256:local-${stepCode.toLowerCase()}`,
                          });
                        }
                        await completeOpeningDryRun(token!, latestDryRun.id, {
                          readinessPercentage: null,
                        });
                      }, "dry-pass-all")
                    }
                  >
                    Pass all local steps
                  </button>
                </>
              ) : null}
            </div>
          ) : null}

          {isSuperAdmin && latestDryRun ? (
            <div className="mt-4 space-y-2 rounded-md border p-3">
              <label className="block text-sm">
                Founder dry-run decision
                <select
                  className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                  value={decision}
                  onChange={(e) => setDecision(e.target.value as OpeningDryRunDecision)}
                >
                  <option value="REVIEW_REQUIRED">REVIEW_REQUIRED</option>
                  <option value="GO">GO</option>
                  <option value="NO_GO">NO_GO</option>
                </select>
              </label>
              <label className="block text-sm">
                Notes (required for NO_GO)
                <textarea
                  className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                  rows={2}
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="rounded-md bg-[var(--brand-red)] px-3 py-1.5 text-sm text-white disabled:opacity-50"
                disabled={Boolean(busy) || !token}
                onClick={() =>
                  void run(
                    () =>
                      recordOpeningDryRunFounderDecision(token!, latestDryRun.id, {
                        decision,
                        notes: decisionNotes || null,
                      }),
                    "dry-decide",
                  )
                }
              >
                Record immutable decision
              </button>
            </div>
          ) : null}
        </section>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}
