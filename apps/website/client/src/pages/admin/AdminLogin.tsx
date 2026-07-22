import { useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";

import { useAuth } from "@/contexts/AuthContext";
import { canAccessAdmin, isBranchManagerOnly, isKitchenOnly } from "@/lib/admin-access";

function staffHome(isBmOnly: boolean, isKitchenStaffOnly: boolean): string {
  if (isKitchenStaffOnly) return "/admin/kitchen-dashboard";
  if (isBmOnly) return "/admin/branch";
  return "/admin/dashboard";
}

function safeAdminNext(raw: string | null, isBmOnly: boolean, isKitchenStaffOnly: boolean): string {
  const fallback = staffHome(isBmOnly, isKitchenStaffOnly);
  if (!raw) return fallback;
  if (!raw.startsWith("/admin")) return fallback;
  if (raw.startsWith("/admin/login")) return fallback;
  if (isKitchenStaffOnly && (raw === "/admin" || raw.startsWith("/admin/dashboard") || raw.startsWith("/admin/branch"))) {
    return "/admin/kitchen-dashboard";
  }
  if (isBmOnly && (raw === "/admin" || raw.startsWith("/admin/dashboard"))) return "/admin/branch";
  return raw;
}

export default function AdminLogin() {
  const { signIn, isAuthenticated, roles, permissions, isSuperAdmin, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const reason = params.get("reason");
  const principal = { roles, permissions, isSuperAdmin };
  const bmOnly = isBranchManagerOnly(principal);
  const kitchenStaffOnly = isKitchenOnly(principal);
  const next = safeAdminNext(params.get("next"), bmOnly, kitchenStaffOnly);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated && canAccessAdmin({ roles, permissions, isSuperAdmin })) {
      setLocation(next);
    }
  }, [isLoading, isAuthenticated, roles, permissions, isSuperAdmin, setLocation, next]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const result = await signIn({ email, password });
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    // Redirect waits for /auth/me role hydration (kitchen → KDS, BM → branch).
  }

  const reasonMessage =
    reason === "expired"
      ? "Your session expired. Sign in again to continue."
      : reason === "unauthorized"
        ? "You do not have access to Admin ERP with this account."
        : null;

  if (isLoading) {
    return (
      <div className="admin-shell flex min-h-screen items-center justify-center bg-[var(--admin-canvas)] text-sm text-[var(--admin-muted)]">
        Checking session…
      </div>
    );
  }

  return (
    <div className="admin-shell flex min-h-screen items-center justify-center bg-[var(--admin-canvas)] px-4 py-10 text-[var(--admin-ink)]">
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-[var(--brand-red)]/10 blur-3xl" />
        <div className="absolute -right-16 bottom-10 h-64 w-64 rounded-full bg-[var(--brand-gold)]/20 blur-3xl" />
      </div>

      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-md space-y-5 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-7 shadow-[0_20px_60px_rgba(31,31,31,0.08)]"
        noValidate
      >
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--brand-red)]">
            Telepizza Admin
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to ERP</h1>
          <p className="text-sm text-[var(--admin-muted)]">
            Secure operations access for authorized staff only.
          </p>
        </div>

        {reasonMessage ? (
          <p
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            role="status"
          >
            {reasonMessage}
          </p>
        ) : null}

        <label className="block text-sm font-medium">
          Email
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--brand-red)] focus:ring-2 focus:ring-[var(--brand-red)]/20"
          />
        </label>

        <label className="block text-sm font-medium">
          Password
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--brand-red)] focus:ring-2 focus:ring-[var(--brand-red)]/20"
          />
        </label>

        {message ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-[var(--brand-red)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-red-dark)] disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-center text-xs text-[var(--admin-muted)]">
          <Link href="/" className="font-medium text-[var(--brand-red)] hover:underline">
            Back to website
          </Link>
        </p>
      </form>
    </div>
  );
}
