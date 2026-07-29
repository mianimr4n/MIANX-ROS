/**
 * Opening Operations M2 — payments, notifications, devices (Owner-facing).
 * Never surfaces secrets. Never claims WhatsApp CONNECTED.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { ApiRequestError } from "@/lib/api";
import {
  OPENING_DEVICE_TYPES,
  OPENING_EVIDENCE_TYPES,
  OPENING_NOTIFICATION_CHANNELS,
  OPENING_NOTIFICATION_PURPOSES,
  OPENING_PAYMENT_METHOD_CODES,
  approveOpeningCashProcedure,
  failOpeningPaymentProvider,
  fetchOpeningCashProcedure,
  listOpeningCardTerminals,
  listOpeningDevices,
  listOpeningMissingDeviceTypes,
  listOpeningNotificationChannels,
  listOpeningPaymentMethods,
  listOpeningPaymentProviders,
  localTestOpeningNotificationChannel,
  recordOpeningCardTerminal,
  removeOpeningDevice,
  upsertOpeningCashProcedure,
  upsertOpeningDevice,
  upsertOpeningNotificationChannel,
  upsertOpeningPaymentMethod,
  upsertOpeningPaymentProvider,
  verifyOpeningDevice,
  verifyOpeningNotificationChannel,
  verifyOpeningPaymentProvider,
  type OpeningCardTerminal,
  type OpeningCashProcedure,
  type OpeningDeviceVerification,
  type OpeningDeviceType,
  type OpeningEvidenceType,
  type OpeningNotificationChannelRow,
  type OpeningNotificationPurpose,
  type OpeningPaymentMethod,
  type OpeningPaymentProvider,
} from "@/lib/admin-api";

const PURPOSE_LABELS: Record<OpeningNotificationPurpose, string> = {
  CUSTOMER_ORDER: "Customer orders",
  KITCHEN_ALERT: "Kitchen alerts",
  RIDER_ALERT: "Rider dispatch",
  ESCALATION: "Escalation",
};

const DEVICE_LABELS: Record<OpeningDeviceType, string> = {
  POS_DEVICE: "POS",
  KDS_DEVICE: "KDS",
  RECEIPT_PRINTER: "Receipt printer",
  CARD_TERMINAL: "Card terminal (device)",
  RIDER_DEVICE: "Rider device",
  PRIMARY_INTERNET: "Primary internet",
  BACKUP_INTERNET: "Backup internet",
  UPS_POWER_BACKUP: "UPS / power",
};

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

function channelStatusLabel(row: OpeningNotificationChannelRow): string {
  if (row.localTestOnly) return "Local verification only";
  if (row.providerStatus === "VERIFIED") return "Production verified";
  if (row.providerStatus === "FAILED") return "Failed";
  if (row.enabled) return row.providerStatus.replaceAll("_", " ");
  return "Not enabled";
}

function paymentMethodsHonesty(methods: OpeningPaymentMethod[] | null) {
  const enabled = (methods ?? []).filter((m) => m.enabled);
  if (enabled.length === 0) {
    return honesty(
      "WAITING_ON_HUMAN",
      "No accepted payment methods enabled for this branch.",
      "Enable at least one payment method for opening day.",
    );
  }
  return honesty(
    "CONFIGURED",
    "None — methods selected.",
    "Verify provider and onsite terminal where card is accepted.",
  );
}

function providerHonesty(providers: OpeningPaymentProvider[] | null) {
  const rows = providers ?? [];
  if (rows.length === 0) {
    return honesty(
      "WAITING_ON_HUMAN",
      "No payment provider metadata recorded.",
      "Add provider name and environment (metadata only — no secrets).",
    );
  }
  const verified = rows.some((p) => p.providerStatus === "VERIFIED");
  const failed = rows.some((p) => p.providerStatus === "FAILED");
  if (failed) {
    return honesty("BLOCKED", "Provider verification failed.", "Fix provider setup or record a new verification.");
  }
  if (verified) {
    return honesty("COMPLETE", "None.", "Monitor expiry and terminal flags.");
  }
  return honesty(
    "ACTIVE",
    "Provider metadata present — Production verification pending.",
    "Founder verifies provider after onsite checks.",
  );
}

function cardTerminalHonesty(terminals: OpeningCardTerminal[] | null) {
  const rows = terminals ?? [];
  if (rows.length === 0) {
    return honesty(
      "WAITING_ON_HUMAN",
      "No card terminal verification on file.",
      "Record onsite terminal check (label evidence type honestly).",
    );
  }
  const verified = rows.some((t) => t.verificationResult === "VERIFIED" && t.evidenceType !== "LOCAL_TEST_ONLY");
  const localOnly = rows.some((t) => t.evidenceType === "LOCAL_TEST_ONLY");
  if (verified) return honesty("COMPLETE", "None.", "Schedule recheck before opening day if due.");
  if (localOnly) {
    return honesty(
      "ACTIVE",
      "Local verification only — not Production-ready.",
      "Repeat verification with onsite evidence (not LOCAL_TEST_ONLY).",
    );
  }
  return honesty("WAITING_ON_HUMAN", "Terminal not verified.", "Complete onsite card terminal verification.");
}

function cashHonesty(cash: OpeningCashProcedure | null) {
  if (!cash) {
    return honesty(
      "WAITING_ON_HUMAN",
      "Cash handling procedure not documented.",
      "Document drawer, reconciliation, and escalation steps.",
    );
  }
  if (cash.documentationStatus === "VERIFIED_ONSITE" && cash.approvedAt) {
    return honesty("COMPLETE", "None.", "Review with branch manager before opening week.");
  }
  const checklist =
    cash.procedureDocumented &&
    cash.procedureReviewed &&
    cash.cashDrawerProcessApproved &&
    cash.shiftReconciliationApproved &&
    cash.discrepancyEscalationDefined;
  if (checklist) {
    return honesty(
      "ACTIVE",
      "Checklist complete — Founder onsite approval pending.",
      "Super-admin approves cash procedure after review.",
    );
  }
  return honesty("WAITING_ON_HUMAN", "Cash SOP checklist incomplete.", "Complete all checklist items, then request approval.");
}

function purposeHonesty(purpose: OpeningNotificationPurpose, channels: OpeningNotificationChannelRow[]) {
  const rows = channels.filter((c) => c.purposeCode === purpose && c.enabled);
  if (rows.length === 0) {
    return honesty(
      "WAITING_ON_HUMAN",
      `No enabled channel for ${PURPOSE_LABELS[purpose]}.`,
      "Enable a channel, Save destination reference (no secrets), then verify.",
    );
  }
  const production = rows.some((c) => c.providerStatus === "VERIFIED" && !c.localTestOnly);
  if (production) return honesty("COMPLETE", "None.", "Re-test before opening week.");
  const local = rows.some((c) => c.localTestOnly);
  if (local) {
    return honesty(
      "ACTIVE",
      "Local verification only — not Production notification ready.",
      "Founder marks Production verified after real channel proof.",
    );
  }
  return honesty(
    "ACTIVE",
    "Channel enabled — verification pending.",
    "Run local test or Founder Production verify — never claim WhatsApp Connected.",
  );
}

function deviceTypeHonesty(type: OpeningDeviceType, devices: OpeningDeviceVerification[]) {
  const row = devices.find((d) => d.deviceType === type);
  if (!row) {
    return honesty(
      "WAITING_ON_HUMAN",
      `${DEVICE_LABELS[type]} not registered.`,
      "Save a device label, then verify onsite.",
    );
  }
  if (row.verificationStatus === "FAILED") {
    return honesty("BLOCKED", row.failureReason ?? "Verification failed.", "Fix hardware and re-verify.");
  }
  if (row.evidenceType === "LOCAL_TEST_ONLY") {
    return honesty(
      "ACTIVE",
      "Local verification only.",
      "Repeat with onsite evidence that satisfies Production readiness.",
    );
  }
  if (row.verificationStatus === "VERIFIED") {
    return honesty("COMPLETE", "None.", "Watch expiry / recheck dates.");
  }
  // Registered (NOT_VERIFIED / VERIFICATION_REQUIRED) — saved metadata, verification still pending.
  return honesty(
    "ACTIVE",
    `${DEVICE_LABELS[type]} saved — onsite verification pending.`,
    "Use Verify with honest evidence type (not LOCAL_TEST_ONLY for Production).",
  );
}

export function OpeningOperationsPanel() {
  const { session, isSuperAdmin, roles } = useAuth();
  const { branchIdFilter, allowedBranches, label: branchLabel } = useAdminBranch();
  const token = session?.access_token;
  const branchId = branchIdFilter ?? allowedBranches[0]?.id ?? null;
  const canWrite = isSuperAdmin || roles.includes("branch-manager");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [methods, setMethods] = useState<OpeningPaymentMethod[] | null>(null);
  const [providers, setProviders] = useState<OpeningPaymentProvider[] | null>(null);
  const [terminals, setTerminals] = useState<OpeningCardTerminal[] | null>(null);
  const [cash, setCash] = useState<OpeningCashProcedure | null>(null);
  const [channels, setChannels] = useState<OpeningNotificationChannelRow[] | null>(null);
  const [devices, setDevices] = useState<OpeningDeviceVerification[] | null>(null);
  const [missingDevices, setMissingDevices] = useState<OpeningDeviceType[] | null>(null);

  const [providerName, setProviderName] = useState("");
  const [providerEnv, setProviderEnv] = useState<"TEST" | "SANDBOX" | "PRODUCTION">("TEST");
  const [terminalLabel, setTerminalLabel] = useState("Front counter terminal");
  const [terminalEvidence, setTerminalEvidence] = useState<OpeningEvidenceType>("ONSITE_CHECK");

  const load = useCallback(async () => {
    if (!token || !branchId) {
      setMethods([]);
      return;
    }
    setLoading(true);
    try {
      const [m, p, t, c, ch, d, miss] = await Promise.all([
        listOpeningPaymentMethods(token, branchId),
        listOpeningPaymentProviders(token, branchId),
        listOpeningCardTerminals(token, branchId),
        fetchOpeningCashProcedure(token, branchId),
        listOpeningNotificationChannels(token, branchId),
        listOpeningDevices(token, branchId),
        listOpeningMissingDeviceTypes(token, branchId).catch(() => [] as OpeningDeviceType[]),
      ]);
      setMethods(m);
      setProviders(p);
      setTerminals(t);
      setCash(c);
      setChannels(ch);
      setDevices(d);
      setMissingDevices(miss);
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

  const methodByCode = useMemo(() => {
    const map = new Map<string, OpeningPaymentMethod>();
    for (const row of methods ?? []) map.set(row.methodCode, row);
    return map;
  }, [methods]);

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

  return (
    <AdminSurface aria-labelledby="opening-ops-heading">
      <AdminSurfaceHeader
        title="Opening operations"
        description={`Payments, notifications, and onsite devices for ${branchLabel}. Metadata only — credentials stay environment-managed.`}
      />
      <AdminSurfaceBody>
        <h2 id="opening-ops-heading" className="sr-only">
          Opening operations
        </h2>

        {error ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--admin-muted)]" aria-live="polite">
            Loading opening operations…
          </p>
        ) : null}

        <section className="mb-8" aria-labelledby="opening-payments-heading">
          <h3 id="opening-payments-heading" className="text-base font-semibold text-[var(--admin-ink)]">
            Accepted payment methods
          </h3>
          {paymentMethodsHonesty(methods)}
          <ul className="mt-3 space-y-2">
            {OPENING_PAYMENT_METHOD_CODES.map((code) => {
              const row = methodByCode.get(code);
              const enabled = row?.enabled ?? false;
              return (
                <li
                  key={code}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm"
                >
                  <span>
                    {code.replaceAll("_", " ")} · {row?.displayName ?? code}
                  </span>
                  <button
                    type="button"
                    disabled={!canWrite || !branchId || busy !== null}
                    className="rounded-md border border-[var(--admin-border)] px-2 py-1 text-xs font-medium disabled:opacity-50"
                    onClick={() =>
                      void run(
                        () =>
                          upsertOpeningPaymentMethod(token!, {
                            branchId: branchId!,
                            methodCode: code,
                            displayName: row?.displayName ?? code,
                            enabled: !enabled,
                          }),
                        `method-${code}`,
                      )
                    }
                  >
                    {enabled ? "Disable" : "Enable"}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mb-8" aria-labelledby="opening-provider-heading">
          <h3 id="opening-provider-heading" className="text-base font-semibold text-[var(--admin-ink)]">
            Provider configuration (metadata only)
          </h3>
          {providerHonesty(providers)}
          <form
            className="mt-3 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!token || !branchId || !providerName.trim()) return;
              void run(
                () =>
                  upsertOpeningPaymentProvider(token, {
                    branchId,
                    providerName: providerName.trim(),
                    providerEnvironment: providerEnv,
                  }),
                "provider-create",
              );
            }}
          >
            <input
              type="text"
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              placeholder="Provider name"
              className="min-h-10 flex-1 rounded-lg border border-[var(--admin-border)] px-2 text-sm"
              disabled={!canWrite}
            />
            <select
              value={providerEnv}
              onChange={(e) => setProviderEnv(e.target.value as typeof providerEnv)}
              className="min-h-10 rounded-lg border border-[var(--admin-border)] px-2 text-sm"
              disabled={!canWrite}
            >
              <option value="TEST">TEST</option>
              <option value="SANDBOX">SANDBOX</option>
              <option value="PRODUCTION">PRODUCTION</option>
            </select>
            <button
              type="submit"
              disabled={!canWrite || busy !== null}
              className="rounded-lg bg-[var(--brand-red)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Save provider
            </button>
          </form>
          <ul className="mt-3 space-y-2 text-sm">
            {(providers ?? []).map((p) => (
              <li key={p.id} className="rounded-lg border border-[var(--admin-border)] px-3 py-2">
                <p className="font-medium">
                  {p.providerName} · {p.providerEnvironment} · {p.providerStatus.replaceAll("_", " ")}
                </p>
                {p.verificationSummary ? (
                  <p className="mt-1 text-xs text-[var(--admin-muted)]">{p.verificationSummary}</p>
                ) : null}
                {canWrite ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded border border-[var(--admin-border)] px-2 py-1 text-xs"
                      disabled={busy !== null}
                      onClick={() =>
                        void run(
                          () =>
                            verifyOpeningPaymentProvider(token!, p.id, {
                              summary: "Onsite provider check recorded from Admin UI.",
                            }),
                          `verify-prov-${p.id}`,
                        )
                      }
                    >
                      Record verification
                    </button>
                    <button
                      type="button"
                      className="rounded border border-[var(--admin-border)] px-2 py-1 text-xs"
                      disabled={busy !== null}
                      onClick={() =>
                        void run(
                          () => failOpeningPaymentProvider(token!, p.id, "Verification failed onsite."),
                          `fail-prov-${p.id}`,
                        )
                      }
                    >
                      Mark failed
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-8" aria-labelledby="opening-card-terminal-heading">
          <h3 id="opening-card-terminal-heading" className="text-base font-semibold text-[var(--admin-ink)]">
            Card terminal verification
          </h3>
          {cardTerminalHonesty(terminals)}
          {canWrite ? (
            <form
              className="mt-3 flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!token || !branchId) return;
                void run(
                  () =>
                    recordOpeningCardTerminal(token, {
                      branchId,
                      terminalLabel,
                      evidenceType: terminalEvidence,
                      verificationNote:
                        terminalEvidence === "LOCAL_TEST_ONLY"
                          ? "Local verification only"
                          : "Onsite terminal check",
                    }),
                  "card-terminal",
                );
              }}
            >
              <input
                value={terminalLabel}
                onChange={(e) => setTerminalLabel(e.target.value)}
                className="min-h-10 flex-1 rounded-lg border border-[var(--admin-border)] px-2 text-sm"
              />
              <select
                value={terminalEvidence}
                onChange={(e) => setTerminalEvidence(e.target.value as OpeningEvidenceType)}
                className="min-h-10 rounded-lg border border-[var(--admin-border)] px-2 text-sm"
              >
                {OPENING_EVIDENCE_TYPES.map((ev) => (
                  <option key={ev} value={ev}>
                    {ev === "LOCAL_TEST_ONLY" ? "Local verification only" : ev.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={busy !== null}
                className="rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm font-medium"
              >
                Record terminal check
              </button>
            </form>
          ) : null}
        </section>

        <section className="mb-8" aria-labelledby="opening-cash-heading">
          <h3 id="opening-cash-heading" className="text-base font-semibold text-[var(--admin-ink)]">
            Cash handling procedure
          </h3>
          {cashHonesty(cash)}
          {canWrite && branchId ? (
            <CashProcedureForm
              cash={cash}
              disabled={busy !== null}
              isSuperAdmin={isSuperAdmin}
              onSave={(patch) => void run(() => upsertOpeningCashProcedure(token!, { branchId, ...patch }), "cash-save")}
              onApprove={() => void run(() => approveOpeningCashProcedure(token!, branchId), "cash-approve")}
            />
          ) : null}
        </section>

        <section className="mb-8" aria-labelledby="opening-notif-heading">
          <h3 id="opening-notif-heading" className="text-base font-semibold text-[var(--admin-ink)]">
            Notification channels
          </h3>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">
            Status shows provider mode honestly — WhatsApp is never labeled Connected without Production verification.
          </p>
          {OPENING_NOTIFICATION_PURPOSES.map((purpose) => (
            <div key={purpose} className="mt-4 rounded-xl border border-[var(--admin-border)] p-3">
              <h4 className="font-medium text-[var(--admin-ink)]">{PURPOSE_LABELS[purpose]}</h4>
              {purposeHonesty(purpose, channels ?? [])}
              <NotificationPurposeEditor
                purpose={purpose}
                channels={channels ?? []}
                canWrite={canWrite}
                busy={busy}
                token={token}
                branchId={branchId}
                onRun={run}
              />
            </div>
          ))}
        </section>

        <section aria-labelledby="opening-devices-heading">
          <h3 id="opening-devices-heading" className="text-base font-semibold text-[var(--admin-ink)]">
            Devices and infrastructure
          </h3>
          {missingDevices && missingDevices.length > 0 ? (
            <p className="mt-2 text-sm text-[var(--admin-muted)]">
              Missing Production-verified types: {missingDevices.map((d) => DEVICE_LABELS[d]).join(", ")}
            </p>
          ) : null}
          <div className="mt-3 space-y-3">
            {OPENING_DEVICE_TYPES.map((type) => (
              <DeviceTypeRow
                key={type}
                type={type}
                devices={devices ?? []}
                canWrite={canWrite}
                busy={busy}
                token={token}
                branchId={branchId}
                onRun={run}
              />
            ))}
          </div>
        </section>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

function CashProcedureForm({
  cash,
  disabled,
  isSuperAdmin,
  onSave,
  onApprove,
}: {
  cash: OpeningCashProcedure | null;
  disabled: boolean;
  isSuperAdmin: boolean;
  onSave: (patch: Partial<OpeningCashProcedure>) => void;
  onApprove: () => void;
}) {
  const [state, setState] = useState({
    procedureDocumented: cash?.procedureDocumented ?? false,
    procedureReviewed: cash?.procedureReviewed ?? false,
    cashDrawerProcessApproved: cash?.cashDrawerProcessApproved ?? false,
    shiftReconciliationApproved: cash?.shiftReconciliationApproved ?? false,
    discrepancyEscalationDefined: cash?.discrepancyEscalationDefined ?? false,
  });

  useEffect(() => {
    setState({
      procedureDocumented: cash?.procedureDocumented ?? false,
      procedureReviewed: cash?.procedureReviewed ?? false,
      cashDrawerProcessApproved: cash?.cashDrawerProcessApproved ?? false,
      shiftReconciliationApproved: cash?.shiftReconciliationApproved ?? false,
      discrepancyEscalationDefined: cash?.discrepancyEscalationDefined ?? false,
    });
  }, [cash]);

  return (
    <div className="mt-3 space-y-2 text-sm">
      {(
        [
          ["procedureDocumented", "Procedure documented"],
          ["procedureReviewed", "Procedure reviewed with BM"],
          ["cashDrawerProcessApproved", "Cash drawer process approved"],
          ["shiftReconciliationApproved", "Shift reconciliation approved"],
          ["discrepancyEscalationDefined", "Discrepancy escalation defined"],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={state[key]}
            onChange={(e) => setState((s) => ({ ...s, [key]: e.target.checked }))}
            disabled={disabled}
          />
          {label}
        </label>
      ))}
      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="button"
          disabled={disabled}
          className="rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm"
          onClick={() => onSave(state)}
        >
          Save checklist
        </button>
        {isSuperAdmin ? (
          <button
            type="button"
            disabled={disabled}
            className="rounded-lg bg-[var(--brand-red)] px-3 py-2 text-sm text-white disabled:opacity-50"
            onClick={onApprove}
          >
            Founder approve onsite
          </button>
        ) : null}
      </div>
    </div>
  );
}

function NotificationChannelRowEditor({
  row,
  canWrite,
  busy,
  token,
  branchId,
  onRun,
}: {
  row: OpeningNotificationChannelRow;
  canWrite: boolean;
  busy: string | null;
  token: string;
  branchId: string;
  onRun: (action: () => Promise<unknown>, key: string) => Promise<void>;
}) {
  const [destination, setDestination] = useState(row.destinationReference ?? "");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDestination(row.destinationReference ?? "");
    setDirty(false);
  }, [row.id, row.destinationReference]);

  if (!canWrite) {
    return (
      <li className="rounded border border-[var(--admin-border)] px-2 py-2 text-sm">
        {row.channelCode.replaceAll("_", " ")} · {channelStatusLabel(row)}
        {row.destinationReference ? (
          <span className="ml-2 text-xs text-[var(--admin-muted)]">ref: {row.destinationReference}</span>
        ) : null}
      </li>
    );
  }

  return (
    <li className="rounded border border-[var(--admin-border)] px-2 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">
          {row.channelCode.replaceAll("_", " ")} · {channelStatusLabel(row)}
        </span>
        {!row.enabled ? (
          <span className="text-xs text-[var(--admin-muted)]">(disabled)</span>
        ) : null}
      </div>
      <input
        value={destination}
        onChange={(e) => {
          setDestination(e.target.value);
          setDirty(true);
        }}
        placeholder="Destination reference (not a secret)"
        className="mt-2 min-h-9 w-full rounded border px-2 text-sm"
        aria-label={`Destination for ${row.channelCode}`}
      />
      <div className="mt-2 flex flex-wrap gap-1">
        <button
          type="button"
          className="rounded border border-[var(--brand-red)] bg-[var(--brand-red)] px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
          disabled={busy !== null || (!dirty && row.enabled)}
          onClick={() =>
            void onRun(
              () =>
                upsertOpeningNotificationChannel(token, {
                  branchId,
                  purposeCode: row.purposeCode,
                  channelCode: row.channelCode,
                  enabled: true,
                  destinationReference: destination.trim() || null,
                }),
              `save-ch-${row.id}`,
            )
          }
        >
          Save
        </button>
        <button
          type="button"
          className="rounded border px-2 py-1 text-xs text-red-800 disabled:opacity-50"
          disabled={busy !== null || !row.enabled}
          onClick={() =>
            void onRun(
              () =>
                upsertOpeningNotificationChannel(token, {
                  branchId,
                  purposeCode: row.purposeCode,
                  channelCode: row.channelCode,
                  enabled: false,
                  destinationReference: destination.trim() || null,
                }),
              `del-ch-${row.id}`,
            )
          }
        >
          Delete
        </button>
        <button
          type="button"
          className="rounded border px-2 py-1 text-xs disabled:opacity-50"
          disabled={busy !== null || !row.enabled}
          onClick={() => void onRun(() => localTestOpeningNotificationChannel(token, row.id, true), `lt-${row.id}`)}
        >
          Local verification only
        </button>
        <button
          type="button"
          className="rounded border px-2 py-1 text-xs disabled:opacity-50"
          disabled={busy !== null || !row.enabled}
          onClick={() => void onRun(() => verifyOpeningNotificationChannel(token, row.id), `v-${row.id}`)}
        >
          Production verify
        </button>
      </div>
    </li>
  );
}

function NotificationPurposeEditor({
  purpose,
  channels,
  canWrite,
  busy,
  token,
  branchId,
  onRun,
}: {
  purpose: OpeningNotificationPurpose;
  channels: OpeningNotificationChannelRow[];
  canWrite: boolean;
  busy: string | null;
  token: string | undefined;
  branchId: string | null;
  onRun: (action: () => Promise<unknown>, key: string) => Promise<void>;
}) {
  const [channelCode, setChannelCode] = useState<(typeof OPENING_NOTIFICATION_CHANNELS)[number]>("IN_APP");
  const [destination, setDestination] = useState("");
  const [draft, setDraft] = useState<{
    channelCode: (typeof OPENING_NOTIFICATION_CHANNELS)[number];
    destination: string;
  } | null>(null);
  const rows = channels.filter((c) => c.purposeCode === purpose);

  return (
    <div className="mt-2">
      <ul className="space-y-2 text-sm">
        {rows.map((row) =>
          token && branchId ? (
            <NotificationChannelRowEditor
              key={row.id}
              row={row}
              canWrite={canWrite}
              busy={busy}
              token={token}
              branchId={branchId}
              onRun={onRun}
            />
          ) : (
            <li key={row.id} className="rounded border border-[var(--admin-border)] px-2 py-1">
              {row.channelCode.replaceAll("_", " ")} · {channelStatusLabel(row)}
            </li>
          ),
        )}
        {draft && canWrite && token && branchId ? (
          <li className="rounded border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-2 py-2 text-sm">
            <p className="font-medium">
              New · {draft.channelCode.replaceAll("_", " ")} · pending save
            </p>
            <input
              value={draft.destination}
              onChange={(e) => setDraft({ ...draft, destination: e.target.value })}
              placeholder="Destination reference (not a secret)"
              className="mt-2 min-h-9 w-full rounded border bg-white px-2 text-sm"
            />
            <div className="mt-2 flex flex-wrap gap-1">
              <button
                type="button"
                className="rounded border border-[var(--brand-red)] bg-[var(--brand-red)] px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
                disabled={busy !== null}
                onClick={() =>
                  void onRun(async () => {
                    await upsertOpeningNotificationChannel(token, {
                      branchId,
                      purposeCode: purpose,
                      channelCode: draft.channelCode,
                      enabled: true,
                      destinationReference: draft.destination.trim() || null,
                    });
                    setDraft(null);
                    setDestination("");
                  }, `save-draft-${purpose}`)
                }
              >
                Save
              </button>
              <button
                type="button"
                className="rounded border px-2 py-1 text-xs text-red-800 disabled:opacity-50"
                disabled={busy !== null}
                onClick={() => setDraft(null)}
              >
                Delete
              </button>
            </div>
          </li>
        ) : null}
      </ul>
      {canWrite && branchId && token && !draft ? (
        <form
          className="mt-2 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setDraft({ channelCode, destination });
          }}
        >
          <select
            value={channelCode}
            onChange={(e) => setChannelCode(e.target.value as typeof channelCode)}
            className="rounded border px-2 py-1 text-sm"
          >
            {OPENING_NOTIFICATION_CHANNELS.map((c) => (
              <option key={c} value={c}>
                {c.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Destination reference (not a secret)"
            className="min-h-9 flex-1 rounded border px-2 text-sm"
          />
          <button type="submit" disabled={busy !== null} className="rounded border px-2 py-1 text-sm font-medium">
            Add channel
          </button>
        </form>
      ) : null}
      {!canWrite ? (
        <p className="mt-2 text-xs text-[var(--admin-muted)]">
          Save / Delete require super-admin or branch-manager.
        </p>
      ) : null}
    </div>
  );
}

function DeviceTypeRow({
  type,
  devices,
  canWrite,
  busy,
  token,
  branchId,
  onRun,
}: {
  type: OpeningDeviceType;
  devices: OpeningDeviceVerification[];
  canWrite: boolean;
  busy: string | null;
  token: string | undefined;
  branchId: string | null;
  onRun: (action: () => Promise<unknown>, key: string) => Promise<void>;
}) {
  const row = devices.find((d) => d.deviceType === type);
  const [label, setLabel] = useState(row?.deviceLabel ?? DEVICE_LABELS[type]);
  const [summary, setSummary] = useState("Onsite check recorded");
  const [evidence, setEvidence] = useState<OpeningEvidenceType>("ONSITE_CHECK");
  const [labelDirty, setLabelDirty] = useState(false);

  useEffect(() => {
    if (row?.deviceLabel) {
      setLabel(row.deviceLabel);
      setLabelDirty(false);
    }
  }, [row?.deviceLabel]);

  return (
    <div className="rounded-xl border border-[var(--admin-border)] p-3">
      <h4 className="font-medium">{DEVICE_LABELS[type]}</h4>
      {deviceTypeHonesty(type, devices)}
      {canWrite && token && branchId ? (
        <div className="mt-2 space-y-2 text-sm">
          <input
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              setLabelDirty(true);
            }}
            className="min-h-9 w-full rounded border px-2"
            aria-label={`${DEVICE_LABELS[type]} label`}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy !== null || (!labelDirty && Boolean(row)) || label.trim().length < 2}
              className="rounded border border-[var(--brand-red)] bg-[var(--brand-red)] px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
              onClick={() =>
                void onRun(
                  () =>
                    upsertOpeningDevice(token, {
                      id: row?.id,
                      branchId,
                      deviceType: type,
                      deviceLabel: label.trim(),
                    }),
                  `save-dev-${type}`,
                )
              }
            >
              Save
            </button>
            {row ? (
              <>
                <select
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value as OpeningEvidenceType)}
                  className="rounded border px-2 text-xs"
                  aria-label="Evidence type"
                >
                  {OPENING_EVIDENCE_TYPES.map((ev) => (
                    <option key={ev} value={ev}>
                      {ev === "LOCAL_TEST_ONLY" ? "Local verification only" : ev.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={busy !== null}
                  className="rounded border px-2 py-1 text-xs disabled:opacity-50"
                  onClick={() =>
                    void onRun(
                      () =>
                        verifyOpeningDevice(token, row.id, {
                          evidenceType: evidence,
                          evidenceSummary:
                            evidence === "LOCAL_TEST_ONLY" ? "Local verification only" : summary,
                        }),
                      `verify-dev-${type}`,
                    )
                  }
                >
                  Verify
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  className="rounded border px-2 py-1 text-xs text-red-800 disabled:opacity-50"
                  onClick={() =>
                    void onRun(() => removeOpeningDevice(token, row.id), `del-dev-${row.id}`)
                  }
                >
                  Delete
                </button>
              </>
            ) : null}
          </div>
          {row && evidence !== "LOCAL_TEST_ONLY" ? (
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Evidence summary for Verify"
              className="min-h-9 w-full rounded border px-2 text-xs"
            />
          ) : null}
        </div>
      ) : !canWrite ? (
        <p className="mt-2 text-xs text-[var(--admin-muted)]">
          Save / Delete require super-admin or branch-manager.
        </p>
      ) : null}
    </div>
  );
}
