import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { ApiRequestError, isApiConfigured } from "@/lib/api";
import { fetchSupplierPortalMe, fetchSupplierPerformance } from "@/lib/supplier-portal-api";
import { SupplierShell } from "./SupplierShell";

export default function SupplierProfilePage() {
  const { session } = useAuth();
  const token = session?.access_token;
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [perfNote, setPerfNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !isApiConfigured) return;
    void (async () => {
      try {
        const me = await fetchSupplierPortalMe(token);
        setProfile(me.profile);
        const perf = await fetchSupplierPerformance(token);
        setPerfNote(
          `Orders issued: ${perf.orderCount}. Outstanding balance: ${
            perf.outstandingBalance == null ? "unavailable" : `Rs ${perf.outstandingBalance}`
          }. On-time delivery: unavailable (${perf.onTimeDeliveryUnavailableReason})`,
        );
      } catch (err) {
        setError(err instanceof ApiRequestError ? err.message : "Unable to load profile.");
      }
    })();
  }, [token]);

  return (
    <SupplierShell title="Profile">
      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {!profile ? (
        <p className="text-sm text-zinc-600">Loading…</p>
      ) : (
        <dl className="grid gap-3 rounded-xl border bg-white p-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Name</dt>
            <dd className="font-medium">{String(profile.name ?? "")}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Status</dt>
            <dd className="font-medium">{String(profile.status ?? "")}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Contact</dt>
            <dd className="font-medium">{String(profile.contactPerson ?? "—")}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Payment terms</dt>
            <dd className="font-medium">{String(profile.paymentTerms ?? "Staff-controlled")}</dd>
          </div>
        </dl>
      )}
      {perfNote ? (
        <section className="mt-4 rounded-xl border bg-zinc-50 p-4 text-sm text-zinc-700">
          <h2 className="font-semibold">Performance (source-backed)</h2>
          <p className="mt-1">{perfNote}</p>
        </section>
      ) : null}
    </SupplierShell>
  );
}
