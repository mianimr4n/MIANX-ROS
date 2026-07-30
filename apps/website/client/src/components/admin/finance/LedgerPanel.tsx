import { useState } from "react";

import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import {
  createFinanceAccount,
  createFinanceJournalEntry,
  type FinanceAccount,
  type FinanceAccountType,
  type FinanceJournalEntry,
  type ProfitLossReport,
  type TrialBalanceReport,
} from "@/lib/admin-api";
import { formatPkr } from "@/lib/admin-finance";
import { ApiRequestError } from "@/lib/api";

type LedgerPanelProps = {
  accessToken: string | undefined;
  branchId: string | null;
  canManage: boolean;
  accounts: FinanceAccount[] | null;
  entries: FinanceJournalEntry[] | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
};

const ACCOUNT_TYPES: FinanceAccountType[] = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];

export function LedgerPanel({
  accessToken,
  branchId,
  canManage,
  accounts,
  entries,
  loading,
  error,
  onRefresh,
}: LedgerPanelProps) {
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<FinanceAccountType>("ASSET");
  const [description, setDescription] = useState("");
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [debitAccountId, setDebitAccountId] = useState("");
  const [creditAccountId, setCreditAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function onCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !branchId) {
      setFormError("Select a branch and sign in to create an account.");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await createFinanceAccount(accessToken, {
        branchId,
        accountCode: code,
        accountName: name,
        accountType,
      });
      setCode("");
      setName("");
      setShowAccountForm(false);
      onRefresh();
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : "Failed to create account.");
    } finally {
      setBusy(false);
    }
  }

  async function onCreateJournal(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !branchId) {
      setFormError("Select a branch and sign in to post a journal.");
      return;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setFormError("Amount must be a positive number.");
      return;
    }
    if (!debitAccountId || !creditAccountId) {
      setFormError("Select debit and credit accounts.");
      return;
    }
    if (debitAccountId === creditAccountId) {
      setFormError("Debit and credit accounts must differ.");
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await createFinanceJournalEntry(accessToken, {
        branchId,
        entryDate,
        description,
        status: "posted",
        lines: [
          { accountId: debitAccountId, debit: value, credit: 0 },
          { accountId: creditAccountId, debit: 0, credit: value },
        ],
      });
      setDescription("");
      setAmount("");
      setShowJournalForm(false);
      onRefresh();
    } catch (err) {
      setFormError(err instanceof ApiRequestError ? err.message : "Failed to create journal entry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminSurface aria-labelledby="finance-ledger-heading" className="mb-6">
      <AdminSurfaceHeader
        title="General ledger"
        description="Live chart of accounts and balanced journal entries (debits = credits)."
        action={
          canManage && branchId ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowAccountForm((v) => !v);
                  setShowJournalForm(false);
                  setFormError(null);
                }}
                className="min-h-9 rounded-lg border border-[var(--admin-border)] bg-white px-3 text-sm font-semibold"
              >
                {showAccountForm ? "Cancel" : "Add account"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowJournalForm((v) => !v);
                  setShowAccountForm(false);
                  setFormError(null);
                }}
                className="min-h-9 rounded-lg bg-[var(--admin-ink)] px-3 text-sm font-semibold text-[var(--admin-panel)]"
              >
                {showJournalForm ? "Cancel" : "Post journal"}
              </button>
            </div>
          ) : null
        }
      />
      <AdminSurfaceBody>
        <h2 id="finance-ledger-heading" className="sr-only">
          General ledger
        </h2>

        {showAccountForm ? (
          <form onSubmit={(e) => void onCreateAccount(e)} className="mb-5 grid gap-3 sm:grid-cols-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Code
              <input
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)] sm:col-span-2">
              Name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Type
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as FinanceAccountType)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={busy}
              className="min-h-11 rounded-lg bg-[var(--admin-ink)] px-4 text-sm font-semibold text-[var(--admin-panel)] disabled:opacity-40 sm:col-span-4 sm:w-auto sm:justify-self-start"
            >
              {busy ? "Saving…" : "Create account"}
            </button>
          </form>
        ) : null}

        {showJournalForm ? (
          <form onSubmit={(e) => void onCreateJournal(e)} className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)] sm:col-span-2 lg:col-span-3">
              Description
              <input
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Date
              <input
                required
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Amount (PKR)
              <input
                required
                type="number"
                min={0.01}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Debit account
              <select
                required
                value={debitAccountId}
                onChange={(e) => setDebitAccountId(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              >
                <option value="">Select…</option>
                {(accounts ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.accountCode} — {a.accountName}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Credit account
              <select
                required
                value={creditAccountId}
                onChange={(e) => setCreditAccountId(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
              >
                <option value="">Select…</option>
                {(accounts ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.accountCode} — {a.accountName}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-[var(--admin-muted)] sm:col-span-2 lg:col-span-3">
              Server rejects unbalanced entries. Create at least two accounts before posting.
            </p>
            <button
              type="submit"
              disabled={busy || !(accounts && accounts.length >= 2)}
              className="min-h-11 rounded-lg bg-[var(--admin-ink)] px-4 text-sm font-semibold text-[var(--admin-panel)] disabled:opacity-40"
            >
              {busy ? "Posting…" : "Post balanced journal"}
            </button>
          </form>
        ) : null}

        {formError ? (
          <p className="mb-3 text-sm text-red-700" role="alert">
            {formError}
          </p>
        ) : null}

        {!branchId ? (
          <p className="text-sm text-[var(--admin-muted)]">Select a branch to view the general ledger.</p>
        ) : loading ? (
          <p className="text-sm text-[var(--admin-muted)]">Loading journal entries…</p>
        ) : error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : !entries || entries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-8 text-center text-sm text-[var(--admin-muted)]">
            <span className="block font-semibold text-[var(--admin-ink)]">No journal entries recorded yet</span>
            <span className="mt-2 block text-xs">
              {(accounts?.length ?? 0) === 0
                ? "Create chart-of-accounts entries, then post a balanced journal."
                : "Post a balanced journal (debits = credits) to populate the ledger."}
            </span>
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--admin-border)]">
            <table className="min-w-full text-left text-sm">
              <caption className="sr-only">General ledger journal entries</caption>
              <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-soft)] text-xs uppercase tracking-wide text-[var(--admin-muted)]">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Date
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Description
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Account
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Debit
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Credit
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.flatMap((entry) =>
                  entry.lines.map((line) => (
                    <tr key={`${entry.id}-${line.id}`} className="border-b border-[var(--admin-border)]/60">
                      <td className="px-3 py-2 whitespace-nowrap">{entry.entryDate}</td>
                      <td className="px-3 py-2">{entry.description}</td>
                      <td className="px-3 py-2">
                        {line.accountCode ?? "—"} {line.accountName ? `· ${line.accountName}` : ""}
                      </td>
                      <td className="px-3 py-2 tabular-nums">{line.debit ? formatPkr(line.debit) : "—"}</td>
                      <td className="px-3 py-2 tabular-nums">{line.credit ? formatPkr(line.credit) : "—"}</td>
                      <td className="px-3 py-2 capitalize">{entry.status}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        )}

        {accounts && accounts.length > 0 ? (
          <p className="mt-3 text-xs text-[var(--admin-muted)]">
            Chart of accounts: {accounts.length} account{accounts.length === 1 ? "" : "s"} in scope.
          </p>
        ) : null}
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

type StatementsPanelProps = {
  trialBalance: TrialBalanceReport | null;
  profitLoss: ProfitLossReport | null;
  loading: boolean;
  error: string | null;
  hasBranch: boolean;
};

export function StatementsPanel({
  trialBalance,
  profitLoss,
  loading,
  error,
  hasBranch,
}: StatementsPanelProps) {
  const hasTb = Boolean(trialBalance && trialBalance.rows.length > 0);
  const hasPl = Boolean(
    profitLoss && (profitLoss.revenue !== 0 || profitLoss.expenses !== 0 || profitLoss.revenueAccounts.length > 0),
  );

  return (
    <AdminSurface aria-labelledby="finance-statements-heading" className="mb-6">
      <AdminSurfaceHeader
        title="Financial statements"
        description="Trial balance and P&L calculated dynamically from posted journal lines — no snapshot tables."
      />
      <AdminSurfaceBody>
        <h2 id="finance-statements-heading" className="sr-only">
          Financial statements
        </h2>

        {!hasBranch ? (
          <p className="text-sm text-[var(--admin-muted)]">Select a branch to load statements.</p>
        ) : loading ? (
          <p className="text-sm text-[var(--admin-muted)]">Loading statements…</p>
        ) : error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Trial balance</h3>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-900">
                  LIVE
                </span>
              </div>
              {!hasTb ? (
                <p className="text-sm text-[var(--admin-muted)]">No financial data available</p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="text-xs uppercase tracking-wide text-[var(--admin-muted)]">
                        <tr>
                          <th className="py-1 font-semibold">Account</th>
                          <th className="py-1 font-semibold">Debit</th>
                          <th className="py-1 font-semibold">Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trialBalance!.rows.map((row) => (
                          <tr key={row.accountId} className="border-t border-[var(--admin-border)]/50">
                            <td className="py-1.5">
                              {row.accountCode} · {row.accountName}
                            </td>
                            <td className="py-1.5 tabular-nums">{formatPkr(row.debit)}</td>
                            <td className="py-1.5 tabular-nums">{formatPkr(row.credit)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-[var(--admin-border)] font-semibold">
                          <td className="py-2">Totals</td>
                          <td className="py-2 tabular-nums">{formatPkr(trialBalance!.totalDebit)}</td>
                          <td className="py-2 tabular-nums">{formatPkr(trialBalance!.totalCredit)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  <p className="mt-2 text-xs text-[var(--admin-muted)]">
                    As of {trialBalance!.asOf} · {trialBalance!.balanced ? "Balanced" : "Out of balance"}
                  </p>
                </>
              )}
            </section>

            <section className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Profit &amp; loss</h3>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-900">
                  LIVE
                </span>
              </div>
              {!hasPl ? (
                <p className="text-sm text-[var(--admin-muted)]">No financial data available</p>
              ) : (
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--admin-muted)]">Revenue</dt>
                    <dd className="tabular-nums font-semibold">{formatPkr(profitLoss!.revenue)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--admin-muted)]">Expenses</dt>
                    <dd className="tabular-nums font-semibold">{formatPkr(profitLoss!.expenses)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-[var(--admin-border)] pt-2">
                    <dt className="font-semibold">Net income</dt>
                    <dd className="tabular-nums font-semibold">{formatPkr(profitLoss!.netIncome)}</dd>
                  </div>
                  <p className="text-xs text-[var(--admin-muted)]">
                    {profitLoss!.fromDate} → {profitLoss!.toDate}
                  </p>
                </dl>
              )}
            </section>
          </div>
        )}

        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            { id: "balance-sheet", label: "Balance sheet" },
            { id: "cash-flow", label: "Cash flow" },
            { id: "vat-gst", label: "VAT/GST returns" },
          ].map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-3"
            >
              <span className="text-sm font-semibold">{item.label}</span>
              <span className="rounded-full bg-[var(--admin-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--admin-muted)]">
                Planned for Phase 2
              </span>
            </li>
          ))}
        </ul>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}
