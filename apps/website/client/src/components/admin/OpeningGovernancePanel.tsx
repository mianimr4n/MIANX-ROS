/**
 * Opening Operations M3 — SOPs, training, rehearsals, Founder go/no-go, Owner handover.
 * Never invents GO_APPROVED. Never creates owner/founder role codes.
 */
import { useCallback, useEffect, useState } from "react";

import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { ApiRequestError } from "@/lib/api";
import {
  OPENING_FOUNDER_DECISIONS,
  OPENING_ROLE_REHEARSAL_CODES,
  OPENING_SOP_CODES,
  OPENING_TRAINING_CODES,
  approveOpeningSop,
  completeOpeningE2eRehearsal,
  completeOpeningRoleRehearsal,
  completeOpeningTrainingSession,
  failOpeningE2eRehearsal,
  failOpeningRoleRehearsal,
  failOpeningSop,
  failOpeningTrainingSession,
  fetchOpeningOwnerHandover,
  listOpeningE2eRehearsals,
  listOpeningFounderDecisions,
  listOpeningRoleRehearsals,
  listOpeningSops,
  listOpeningTraining,
  markOpeningOwnerHandoverReady,
  recordOpeningFounderDecision,
  scheduleOpeningE2eRehearsal,
  upsertOpeningOwnerHandover,
  upsertOpeningRoleRehearsal,
  upsertOpeningSop,
  upsertOpeningTrainingSession,
  verifyOpeningSopOperational,
  type OpeningE2eRehearsal,
  type OpeningFounderDecision,
  type OpeningFounderDecisionRecord,
  type OpeningOwnerHandoverRecord,
  type OpeningRoleRehearsal,
  type OpeningSopReview,
  type OpeningTrainingSession,
} from "@/lib/admin-api";

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

function sopHonesty(row: OpeningSopReview | undefined, code: string) {
  if (!row) {
    return honesty("WAITING_ON_HUMAN", `${code} not reviewed.`, "Create review record and assign reviewer.");
  }
  if (row.operationalVerificationStatus === "FAILED") {
    return honesty("BLOCKED", "Operational verification failed.", "Fix issues and re-verify onsite.");
  }
  if (row.reviewStatus === "APPROVED" && row.operationalVerificationStatus === "VERIFIED_ONSITE") {
    return honesty("COMPLETE", "None.", "Watch review due dates.");
  }
  if (row.reviewStatus === "APPROVED") {
    return honesty("ACTIVE", "Approved — onsite/rehearsal verification pending.", "Record VERIFIED_ONSITE evidence.");
  }
  if (row.reviewStatus === "REVIEWED" || row.reviewStatus === "REVIEW_REQUIRED") {
    return honesty("ACTIVE", "Review in progress — Founder approval pending.", "Submit for Founder (super-admin) approval.");
  }
  return honesty("WAITING_ON_HUMAN", "Not reviewed.", "Document reference and mark reviewed.");
}

export function OpeningGovernancePanel() {
  const { session, isSuperAdmin, roles } = useAuth();
  const { branchIdFilter, allowedBranches, label: branchLabel } = useAdminBranch();
  const token = session?.access_token;
  const branchId = branchIdFilter ?? allowedBranches[0]?.id ?? null;
  const canWrite = isSuperAdmin || roles.includes("branch-manager");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [sops, setSops] = useState<OpeningSopReview[] | null>(null);
  const [training, setTraining] = useState<OpeningTrainingSession[] | null>(null);
  const [rehearsals, setRehearsals] = useState<OpeningRoleRehearsal[] | null>(null);
  const [e2e, setE2e] = useState<OpeningE2eRehearsal[] | null>(null);
  const [decisions, setDecisions] = useState<OpeningFounderDecisionRecord[] | null>(null);
  const [handover, setHandover] = useState<OpeningOwnerHandoverRecord | null>(null);

  const [founderDecision, setFounderDecision] = useState<OpeningFounderDecision>("REVIEW_REQUIRED");
  const [founderNotes, setFounderNotes] = useState("");
  const [founderConditions, setFounderConditions] = useState("");

  const load = useCallback(async () => {
    if (!token || !branchId) {
      setSops([]);
      return;
    }
    setLoading(true);
    try {
      const [s, t, r, e, d, h] = await Promise.all([
        listOpeningSops(token, branchId),
        listOpeningTraining(token, branchId),
        listOpeningRoleRehearsals(token, branchId),
        listOpeningE2eRehearsals(token, branchId),
        listOpeningFounderDecisions(token, branchId),
        fetchOpeningOwnerHandover(token, branchId),
      ]);
      setSops(s);
      setTraining(t);
      setRehearsals(r);
      setE2e(e);
      setDecisions(d);
      setHandover(h);
      setError(null);
    } catch (err) {
      setError(errText(err));
    } finally {
      setLoading(false);
    }
  }, [token, branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<unknown>, key: string) {
    setBusy(key);
    try {
      await action();
      await load();
      setError(null);
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(null);
    }
  }

  const latestDecision = decisions?.[0] ?? null;
  const latestE2e = e2e?.[0] ?? null;

  return (
    <AdminSurface aria-labelledby="opening-governance-heading">
      <AdminSurfaceHeader
        title="Opening governance"
        description={`SOPs, training, rehearsals, Founder go/no-go, and Owner handover for ${branchLabel}. Documentation ≠ rehearsal.`}
      />
      <AdminSurfaceBody>
        <h2 id="opening-governance-heading" className="sr-only">
          Opening governance
        </h2>
        {!branchId ? (
          <p className="text-sm text-[var(--admin-muted)]">Select a branch to manage opening governance.</p>
        ) : null}
        {loading ? <p className="text-sm text-[var(--admin-muted)]">Loading governance…</p> : null}
        {error ? (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}

        <section className="mb-8" aria-labelledby="sop-readiness-heading">
          <h3 id="sop-readiness-heading" className="text-base font-semibold text-[var(--admin-ink)]">
            SOP readiness
          </h3>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            Documented → Reviewed → Approved → Rehearsed / Verified onsite. Documentation alone never completes readiness.
          </p>
          <ul className="mt-3 space-y-3">
            {OPENING_SOP_CODES.map((code) => {
              const row = (sops ?? []).find((s) => s.sopCode === code);
              return (
                <li key={code} className="rounded-xl border border-[var(--admin-border)] px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-[var(--admin-ink)]">{code.replaceAll("_", " ")}</p>
                    {canWrite ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-md border px-2 py-1 text-xs"
                          disabled={busy !== null}
                          onClick={() =>
                            void run(
                              () =>
                                upsertOpeningSop(token!, {
                                  branchId: branchId!,
                                  sopCode: code,
                                  documentReference: `docs/runbooks/${code.toLowerCase()}`,
                                  documentVersion: "v1",
                                }),
                              `sop-upsert-${code}`,
                            )
                          }
                        >
                          Ensure record
                        </button>
                        {row && isSuperAdmin ? (
                          <button
                            type="button"
                            className="rounded-md border px-2 py-1 text-xs"
                            disabled={busy !== null}
                            onClick={() => void run(() => approveOpeningSop(token!, row.id), `sop-approve-${code}`)}
                          >
                            Approve
                          </button>
                        ) : null}
                        {row && isSuperAdmin ? (
                          <button
                            type="button"
                            className="rounded-md border px-2 py-1 text-xs"
                            disabled={busy !== null}
                            onClick={() =>
                              void run(
                                () =>
                                  verifyOpeningSopOperational(token!, row.id, {
                                    summary: "Onsite verification recorded",
                                    evidenceType: "ONSITE_CHECK",
                                  }),
                                `sop-verify-${code}`,
                              )
                            }
                          >
                            Verify onsite
                          </button>
                        ) : null}
                        {row ? (
                          <button
                            type="button"
                            className="rounded-md border px-2 py-1 text-xs"
                            disabled={busy !== null}
                            onClick={() => void run(() => failOpeningSop(token!, row.id, "Verification failed"), `sop-fail-${code}`)}
                          >
                            Record failure
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {sopHonesty(row, code)}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mb-8" aria-labelledby="training-heading">
          <h3 id="training-heading" className="text-base font-semibold text-[var(--admin-ink)]">
            Training
          </h3>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            Real active branch participants only. Local verification only does not satisfy Production readiness.
          </p>
          <ul className="mt-3 space-y-3">
            {OPENING_TRAINING_CODES.map((code) => {
              const row = (training ?? []).find((t) => t.trainingCode === code);
              return (
                <li key={code} className="rounded-xl border border-[var(--admin-border)] px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{code.replaceAll("_", " ")}</p>
                    {canWrite ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-md border px-2 py-1 text-xs"
                          disabled={busy !== null}
                          onClick={() =>
                            void run(
                              () =>
                                upsertOpeningTrainingSession(token!, {
                                  branchId: branchId!,
                                  trainingCode: code,
                                  title: `${code} training`,
                                  scheduledAt: new Date().toISOString(),
                                }),
                              `train-${code}`,
                            )
                          }
                        >
                          Schedule
                        </button>
                        {row ? (
                          <button
                            type="button"
                            className="rounded-md border px-2 py-1 text-xs"
                            disabled={busy !== null}
                            onClick={() =>
                              void run(
                                () =>
                                  completeOpeningTrainingSession(token!, row.id, {
                                    result: "PASS",
                                    localTestOnly: true,
                                    notes: "Local verification only",
                                  }),
                                `train-complete-${code}`,
                              )
                            }
                          >
                            Local verification only
                          </button>
                        ) : null}
                        {row ? (
                          <button
                            type="button"
                            className="rounded-md border px-2 py-1 text-xs"
                            disabled={busy !== null}
                            onClick={() =>
                              void run(() => failOpeningTrainingSession(token!, row.id, "Assessment failed"), `train-fail-${code}`)
                            }
                          >
                            Fail
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {!row
                    ? honesty("WAITING_ON_HUMAN", "Not scheduled.", "Schedule training with named trainer.")
                    : row.localTestOnly
                      ? honesty("ACTIVE", "Local verification only — not Production complete.", "Repeat with real participants.")
                      : row.trainingStatus === "COMPLETED" && row.result === "PASS"
                        ? honesty("COMPLETE", "None.", "Monitor remediation if any.")
                        : row.trainingStatus === "FAILED" || row.result === "FAIL"
                          ? honesty("BLOCKED", "Training failed.", "Schedule remediation.")
                          : honesty("ACTIVE", `Status ${row.trainingStatus}.`, "Complete attendance and assessment.")}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mb-8" aria-labelledby="rehearsal-heading">
          <h3 id="rehearsal-heading" className="text-base font-semibold text-[var(--admin-ink)]">
            Role rehearsals
          </h3>
          <ul className="mt-3 space-y-3">
            {OPENING_ROLE_REHEARSAL_CODES.map((code) => {
              const row = (rehearsals ?? []).find((r) => r.rehearsalCode === code);
              return (
                <li key={code} className="rounded-xl border border-[var(--admin-border)] px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{code.replaceAll("_", " ")}</p>
                    {canWrite ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-md border px-2 py-1 text-xs"
                          disabled={busy !== null}
                          onClick={() =>
                            void run(
                              () =>
                                upsertOpeningRoleRehearsal(token!, {
                                  branchId: branchId!,
                                  rehearsalCode: code,
                                  scenario: `${code} opening scenario`,
                                }),
                              `reh-${code}`,
                            )
                          }
                        >
                          Create
                        </button>
                        {row ? (
                          <button
                            type="button"
                            className="rounded-md border px-2 py-1 text-xs"
                            disabled={busy !== null}
                            onClick={() =>
                              void run(
                                () =>
                                  completeOpeningRoleRehearsal(token!, row.id, {
                                    result: "PASS",
                                    localTestOnly: true,
                                    notes: "Local verification only",
                                  }),
                                `reh-complete-${code}`,
                              )
                            }
                          >
                            Local verification only
                          </button>
                        ) : null}
                        {row ? (
                          <button
                            type="button"
                            className="rounded-md border px-2 py-1 text-xs"
                            disabled={busy !== null}
                            onClick={() =>
                              void run(() => failOpeningRoleRehearsal(token!, row.id, "Critical failure"), `reh-fail-${code}`)
                            }
                          >
                            Fail
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {!row
                    ? honesty("WAITING_ON_HUMAN", "Rehearsal not scheduled.", "Create and facilitate scenario.")
                    : row.localTestOnly
                      ? honesty("ACTIVE", "Local verification only.", "Re-run with Production evidence.")
                      : row.rehearsalStatus === "COMPLETED" && row.result === "PASS"
                        ? honesty("COMPLETE", "None.", "Watch retest dates.")
                        : row.result === "FAIL"
                          ? honesty("BLOCKED", row.issuesFound ?? "Failed.", "Corrective actions then retest.")
                          : honesty("ACTIVE", `Status ${row.rehearsalStatus}.`, "Complete and verify.")}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mb-8" aria-labelledby="e2e-heading">
          <h3 id="e2e-heading" className="text-base font-semibold text-[var(--admin-ink)]">
            End-to-end opening rehearsal
          </h3>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            Does not execute Production orders. Local automated tests do not count as Production completion.
          </p>
          {canWrite ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md border px-2 py-1 text-xs"
                disabled={busy !== null || !branchId}
                onClick={() =>
                  void run(
                    () => scheduleOpeningE2eRehearsal(token!, { branchId: branchId!, scheduledAt: new Date().toISOString() }),
                    "e2e-schedule",
                  )
                }
              >
                Schedule E2E
              </button>
              {latestE2e ? (
                <>
                  <button
                    type="button"
                    className="rounded-md border px-2 py-1 text-xs"
                    disabled={busy !== null}
                    onClick={() =>
                      void run(
                        () =>
                          completeOpeningE2eRehearsal(token!, latestE2e.id, {
                            result: "PASS",
                            localTestOnly: true,
                            notes: "Local verification only",
                          }),
                        "e2e-local",
                      )
                    }
                  >
                    Local verification only
                  </button>
                  <button
                    type="button"
                    className="rounded-md border px-2 py-1 text-xs"
                    disabled={busy !== null}
                    onClick={() => void run(() => failOpeningE2eRehearsal(token!, latestE2e.id, "Critical stage failed"), "e2e-fail")}
                  >
                    Record failure
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
          {!latestE2e
            ? honesty("WAITING_ON_HUMAN", "No E2E rehearsal scheduled.", "Schedule full opening rehearsal.")
            : latestE2e.localTestOnly
              ? honesty("ACTIVE", "Local verification only — not Production complete.", "Run real branch E2E with verifier.")
              : latestE2e.status === "COMPLETED" && latestE2e.result === "PASS" && (latestE2e.criticalFailures ?? 0) === 0
                ? honesty("COMPLETE", "None.", "Keep evidence for Founder snapshot.")
                : latestE2e.result === "FAIL" || (latestE2e.criticalFailures ?? 0) > 0
                  ? honesty("BLOCKED", "Critical failures remain.", "Corrective actions and retest.")
                  : honesty("ACTIVE", `Status ${latestE2e.status}.`, "Complete all 14 stages.")}
        </section>

        <section className="mb-8" aria-labelledby="founder-heading">
          <h3 id="founder-heading" className="text-base font-semibold text-[var(--admin-ink)]">
            Founder go / no-go
          </h3>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            Internal authorization: super-admin. GO_APPROVED does not auto-change branch status. Northern Bypass stays separate.
          </p>
          {latestDecision
            ? honesty(
                latestDecision.decision === "GO_APPROVED" ? "COMPLETE" : latestDecision.decision === "NO_GO" ? "BLOCKED" : "ACTIVE",
                `Latest: ${latestDecision.decision}`,
                latestDecision.decision === "GO_APPROVED"
                  ? "Branch status still requires separate Founder action if changing."
                  : "Resolve blockers then record a superseding decision.",
              )
            : honesty("WAITING_ON_HUMAN", "No Founder decision recorded.", "Founder records go/no-go with immutable snapshot.")}
          {isSuperAdmin && branchId ? (
            <div className="mt-3 space-y-2 rounded-xl border border-[var(--admin-border)] p-3">
              <label className="block text-xs font-semibold">
                Decision
                <select
                  className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                  value={founderDecision}
                  onChange={(e) => setFounderDecision(e.target.value as OpeningFounderDecision)}
                >
                  {OPENING_FOUNDER_DECISIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold">
                Notes (required for NO_GO)
                <textarea className="mt-1 w-full rounded-md border px-2 py-1 text-sm" value={founderNotes} onChange={(e) => setFounderNotes(e.target.value)} rows={2} />
              </label>
              <label className="block text-xs font-semibold">
                Conditions (required for GO_CONDITIONAL)
                <textarea className="mt-1 w-full rounded-md border px-2 py-1 text-sm" value={founderConditions} onChange={(e) => setFounderConditions(e.target.value)} rows={2} />
              </label>
              <button
                type="button"
                className="rounded-md bg-[var(--brand-red)] px-3 py-1.5 text-xs font-semibold text-white"
                disabled={busy !== null}
                onClick={() =>
                  void run(
                    () =>
                      recordOpeningFounderDecision(token!, {
                        branchId: branchId!,
                        decision: founderDecision,
                        decisionNotes: founderNotes || null,
                        conditions: founderConditions || null,
                      }),
                    "founder-decide",
                  )
                }
              >
                Record Founder decision
              </button>
            </div>
          ) : (
            <p className="mt-2 text-xs text-[var(--admin-muted)]">Only Founder (super-admin) may record go/no-go.</p>
          )}
        </section>

        <section aria-labelledby="handover-heading">
          <h3 id="handover-heading" className="text-base font-semibold text-[var(--admin-ink)]">
            Future Owner handover
          </h3>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">
            No `owner` role code. Handover readiness does not imply restaurant opening approval. Secrets never stored.
          </p>
          {handover
            ? honesty(
                handover.handoverStatus === "ACCEPTED" || handover.handoverStatus === "READY_FOR_HANDOVER"
                  ? "COMPLETE"
                  : handover.handoverStatus === "CANCELLED"
                    ? "BLOCKED"
                    : "ACTIVE",
                `Status ${handover.handoverStatus}`,
                "Clear unresolved items before READY_FOR_HANDOVER.",
              )
            : honesty("WAITING_ON_HUMAN", "Handover not started.", "Prepare intended Owner contact reference (no secrets).")}
          {canWrite && branchId ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md border px-2 py-1 text-xs"
                disabled={busy !== null}
                onClick={() =>
                  void run(
                    () =>
                      upsertOpeningOwnerHandover(token!, {
                        branchId: branchId!,
                        intendedOwnerName: "Intended Owner (display)",
                        intendedOwnerContactReference: "masked-contact-ref",
                        handoverScope: "Royal Orchard operations handover",
                        operationalDocumentsReviewed: true,
                        financialProcedureReviewed: true,
                        staffStructureReviewed: true,
                        deviceInventoryReviewed: true,
                      }),
                    "handover-upsert",
                  )
                }
              >
                Prepare draft
              </button>
              <button
                type="button"
                className="rounded-md border px-2 py-1 text-xs"
                disabled={busy !== null}
                onClick={() => void run(() => markOpeningOwnerHandoverReady(token!, branchId!), "handover-ready")}
              >
                Mark ready
              </button>
            </div>
          ) : null}
        </section>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}
