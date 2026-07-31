import { useEffect, useState, type FormEvent } from "react";
import { Link } from "wouter";

import { useAuth } from "@/contexts/AuthContext";
import { ApiRequestError, isApiConfigured } from "@/lib/api";
import {
  createSupplierPortalDocument,
  fetchSupplierPerformance,
  fetchSupplierPortalMe,
  listSupplierPortalDocuments,
  listSupplierPortalOrders,
  respondSupplierPortalOrder,
  type SupplierPortalOrder,
} from "@/lib/supplier-portal-api";

export default function SupplierPortal() {
  const { session, permissions, roles, signOut } = useAuth();
  const token = session?.access_token;
  const canPortal = roles.includes("supplier") || permissions.includes("supplier.portal");

  const [error, setError] = useState<string | null>(null);
  const [supplierName, setSupplierName] = useState<string | null>(null);
  const [orders, setOrders] = useState<SupplierPortalOrder[]>([]);
  const [docs, setDocs] = useState<
    Array<{ id: string; documentType: string; title: string; fileUrl: string }>
  >([]);
  const [performanceNote, setPerformanceNote] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [docTitle, setDocTitle] = useState("");
  const [docUrl, setDocUrl] = useState("");

  async function refresh() {
    if (!token || !canPortal || !isApiConfigured) return;
    setError(null);
    try {
      const me = await fetchSupplierPortalMe(token);
      setSupplierName(String(me.context.supplierName));
      setOrders(await listSupplierPortalOrders(token));
      setDocs(await listSupplierPortalDocuments(token));
      const perf = await fetchSupplierPerformance(token);
      setPerformanceNote(
        `Orders: ${perf.orderCount}. Outstanding balance: ${
          perf.outstandingBalance == null ? "unavailable" : `Rs ${perf.outstandingBalance}`
        }. On-time delivery: unavailable (${perf.onTimeDeliveryUnavailableReason})`,
      );
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Unable to load supplier portal.");
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, canPortal]);

  async function onRespond(
    orderId: string,
    responseType: "acknowledge" | "accept" | "request_amendment" | "reject",
  ) {
    if (!token) return;
    setRespondingId(orderId);
    setError(null);
    try {
      const reason =
        responseType === "reject" || responseType === "request_amendment"
          ? window.prompt("Reason (required)")
          : null;
      if (
        (responseType === "reject" || responseType === "request_amendment") &&
        !reason?.trim()
      ) {
        setError("Reason is required for reject and amendment requests.");
        return;
      }
      await respondSupplierPortalOrder(token, orderId, { responseType, reason });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Response failed.");
    } finally {
      setRespondingId(null);
    }
  }

  async function onAddDocument(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    setError(null);
    try {
      await createSupplierPortalDocument(token, {
        documentType: "other",
        title: docTitle,
        fileUrl: docUrl,
      });
      setDocTitle("");
      setDocUrl("");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Document save failed.");
    }
  }

  if (!session) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Supplier portal</h1>
        <p className="mt-2 text-zinc-600">Sign in with your supplier account to continue.</p>
        <Link href="/staff/login?next=/supplier" className="mt-4 inline-block text-red-700 underline">
          Staff / supplier login
        </Link>
      </main>
    );
  }

  if (!canPortal) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold">Supplier portal</h1>
        <p className="mt-2 text-zinc-600">This account is not linked to a supplier portal.</p>
        <button type="button" className="mt-4 text-red-700 underline" onClick={() => void signOut()}>
          Sign out
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-wide text-zinc-500">Supplier portal</p>
          <h1 className="text-3xl font-semibold">{supplierName ?? "Your supplier workspace"}</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Purchase orders assigned to you. You cannot approve your own POs internally.
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border px-3 py-2 text-sm"
          onClick={() => void signOut()}
        >
          Sign out
        </button>
      </header>

      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      {performanceNote ? (
        <section className="mb-6 rounded-xl border bg-zinc-50 p-4 text-sm text-zinc-700">
          <h2 className="font-semibold">Performance (source-backed)</h2>
          <p className="mt-1">{performanceNote}</p>
        </section>
      ) : null}

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">Purchase orders</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-zinc-600">No purchase orders are available for this supplier.</p>
        ) : (
          <ul className="space-y-4">
            {orders.map((order) => (
              <li key={order.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {order.poNumber} · {order.status}
                    </p>
                    <p className="text-sm text-zinc-600">
                      {order.branchName ?? "Branch"} · Rs {order.totalAmount}
                      {order.expectedDeliveryDate
                        ? ` · expected ${order.expectedDeliveryDate}`
                        : ""}
                    </p>
                    <p className="text-sm text-zinc-600">
                      Response: {order.supplierResponseStatus ?? "unacknowledged"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(["acknowledge", "accept", "request_amendment", "reject"] as const).map(
                      (type) => (
                        <button
                          key={type}
                          type="button"
                          disabled={respondingId === order.id}
                          className="rounded-lg border px-2 py-1 text-xs capitalize"
                          onClick={() => void onRespond(order.id, type)}
                        >
                          {type.replace("_", " ")}
                        </button>
                      ),
                    )}
                  </div>
                </div>
                {order.lines.length > 0 ? (
                  <ul className="mt-3 space-y-1 text-sm text-zinc-700">
                    {order.lines.map((line) => (
                      <li key={line.id}>
                        {line.lineNumber}. {line.description} — qty {line.quantity} @ Rs{" "}
                        {line.unitPrice}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-zinc-500">No line items on this PO yet.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Documents</h2>
        <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]" onSubmit={onAddDocument}>
          <input
            className="rounded-lg border px-3 py-2 text-sm"
            placeholder="Document title"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            required
          />
          <input
            className="rounded-lg border px-3 py-2 text-sm"
            placeholder="https://… file URL"
            value={docUrl}
            onChange={(e) => setDocUrl(e.target.value)}
            required
          />
          <button type="submit" className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white">
            Add reference
          </button>
        </form>
        {docs.length === 0 ? (
          <p className="text-sm text-zinc-600">No documents uploaded yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {docs.map((doc) => (
              <li key={doc.id} className="rounded-lg border px-3 py-2">
                <span className="font-medium">{doc.title}</span> · {doc.documentType} ·{" "}
                <a className="text-red-700 underline" href={doc.fileUrl} target="_blank" rel="noreferrer">
                  open
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
