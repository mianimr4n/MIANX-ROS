import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";

import { useAuth } from "@/contexts/AuthContext";

/**
 * Supplier login reuses the same Supabase email/password stack as staff.
 * Destination defaults to /supplier after success.
 */
export default function SupplierLogin() {
  const { signIn, session } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) setLocation("/supplier");
  }, [session, setLocation]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn({ email: email.trim(), password });
      setLocation("/supplier");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <h1 className="text-3xl font-semibold">Supplier login</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Sign in with the account provisioned by Telepizza procurement staff.
      </p>
      <form className="mt-6 space-y-3" onSubmit={onSubmit}>
        <label className="block text-sm" htmlFor="supplier-email">
          Email
          <input
            id="supplier-email"
            type="email"
            required
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </label>
        <label className="block text-sm" htmlFor="supplier-password">
          Password
          <input
            id="supplier-password"
            type="password"
            required
            className="mt-1 w-full rounded-lg border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-zinc-900 px-3 py-3 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
