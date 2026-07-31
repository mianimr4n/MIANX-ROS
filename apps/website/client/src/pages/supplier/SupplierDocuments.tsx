import { useEffect, useState, type FormEvent } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { ApiRequestError, isApiConfigured } from "@/lib/api";
import {
  createSupplierPortalDocument,
  listSupplierPortalDocuments,
} from "@/lib/supplier-portal-api";
import { SupplierShell } from "./SupplierShell";

export default function SupplierDocuments() {
  const { session } = useAuth();
  const token = session?.access_token;
  const [docs, setDocs] = useState<
    Array<{ id: string; title: string; documentType: string; fileUrl: string }>
  >([]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploadNote] = useState(
    "Binary upload is not configured. Add an https URL reference only.",
  );

  async function refresh() {
    if (!token || !isApiConfigured) return;
    setDocs(await listSupplierPortalDocuments(token));
  }

  useEffect(() => {
    void refresh().catch((err) => {
      setError(err instanceof ApiRequestError ? err.message : "Unable to load documents.");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token) return;
    try {
      await createSupplierPortalDocument(token, {
        documentType: "other",
        title,
        fileUrl: url,
      });
      setTitle("");
      setUrl("");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Document save failed.");
    }
  }

  return (
    <SupplierShell title="Documents">
      <p className="mb-3 text-sm text-zinc-600" role="status">
        {uploadNote}
      </p>
      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="doc-title">
          Title
        </label>
        <input
          id="doc-title"
          className="rounded-lg border px-3 py-2 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Document title"
        />
        <label className="sr-only" htmlFor="doc-url">
          File URL
        </label>
        <input
          id="doc-url"
          className="rounded-lg border px-3 py-2 text-sm"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          placeholder="https://…"
        />
        <button type="submit" className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white">
          Add reference
        </button>
      </form>
      {docs.length === 0 ? (
        <p className="text-sm text-zinc-600">No documents uploaded yet.</p>
      ) : (
        <ul className="space-y-2">
          {docs.map((doc) => (
            <li key={doc.id} className="rounded-lg border bg-white px-3 py-2 text-sm">
              {doc.title} · {doc.documentType} ·{" "}
              <a className="text-red-700 underline" href={doc.fileUrl} target="_blank" rel="noreferrer">
                open
              </a>
            </li>
          ))}
        </ul>
      )}
    </SupplierShell>
  );
}
