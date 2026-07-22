import { useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";

import { useAuth } from "@/contexts/AuthContext";
import { canAccessAdmin } from "@/lib/admin-access";

function safeAdminNext(raw: string | null): string {
  if (!raw) return "/admin/dashboard";
  if (!raw.startsWith("/admin")) return "/admin/dashboard";
  if (raw.startsWith("/admin/login")) return "/admin/dashboard";
  return raw;
}

export default function AdminLogin() {
  const { signIn, isAuthenticated, roles, permissions, isSuperAdmin, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const reason = params.get("reason");
  const next = safeAdminNext(params.get("next"));

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
    setLocation(next);
  }

  const reasonMessage =
    reason === "expired"
      ? "Your session expired. Sign in again to continue."
      : reason === "unauthorized"
        ? "You do not have access to Admin ERP with this account."
        : null;

  return (
    <div className="admin-shell flex min-h-screen items-center justify-center bg-[var(--admin-canvas)] px-4 py-10 text-[var(--admin-ink)]">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-[var(--brand-red)]/10 blur-3xl" />
        <div className="absolute -right-16 bottom-10 h-64 w-64 rounded-full bg-[var(--brand-gold)]/20 blur-3xl" />
      </div>

      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-md space-y-5 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-7 shadow-[0_20px_60px_rgba(31,31,31,0.08)]"
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
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
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
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[var(--admin-border)] bg-white px-3 py-3 outline-none focus:border-[var(--brand-red)] focus:ring-2 focus:ring-[var(--brand-red)]/20"
          />
        </label>

        <label className="block text-sm font-medium">
          Password
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[var(--admin-border)] bg-white px-3 py-3 outline-none focus:border-[var(--brand-red)] focus:ring-2 focus:ring-[var(--brand-red)]/20"
          />
        </label>

        {message ? (
          <p className="text-sm text-[var(--brand-red)]" role="alert">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="w-full min-h-12 rounded-xl bg-[var(--brand-red)] text-sm font-semibold text-white hover:bg-[var(--brand-red-dark)] disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-center text-xs text-[var(--admin-muted)]">Powered by Mianx.ai</p>
        <p className="text-center text-sm text-[var(--admin-muted)]">
          Customer account?{" "}
          <Link href="/login" className="font-medium text-[var(--brand-red)] underline-offset-2 hover:underline">
            Use customer login
          </Link>
        </p>
      </form>
    </div>
  );
}
