import { useEffect, useState, type FormEvent } from "react";

import { DocumentUploadDropzone } from "@/components/documents/DocumentUploadDropzone";
import { useAuth } from "@/contexts/AuthContext";
import { ApiRequestError, isApiConfigured } from "@/lib/api";
import {
  fetchSupplierDocumentDownloadUrl,
  listSupplierPortalDocuments,
  uploadSupplierPortalDocument,
} from "@/lib/supplier-portal-api";
import { SupplierShell } from "./SupplierShell";

const DOC_TYPES = [
  { value: "invoice", label: "Invoice" },
  { value: "delivery_note", label: "Delivery note" },
  { value: "purchase_order_acknowledgement", label: "PO attachment" },
  { value: "quality_certificate", label: "Certificate" },
  { value: "tax_document", label: "Supporting / tax" },
  { value: "other", label: "Other" },
] as const;

type DocRow = {
  id: string;
  title: string;
  documentType: string;
  fileUrl: string | null;
  hasBinary?: boolean;
  mimeType?: string | null;
  originalFilename?: string | null;
};

export default function SupplierDocuments() {
  const { session } = useAuth();
  const token = session?.access_token;
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState<string>("invoice");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

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

  async function onUpload(payload: {
    dataBase64: string;
    contentType: string;
    originalFilename: string;
  }) {
    if (!token) return;
    if (!title.trim()) {
      setError("Enter a document title before uploading.");
      return;
    }
    setBusy(true);
    setProgress("Uploading to secure storage…");
    setError(null);
    try {
      await uploadSupplierPortalDocument(token, {
        documentType,
        title: title.trim(),
        dataBase64: payload.dataBase64,
        contentType: payload.contentType,
        originalFilename: payload.originalFilename,
      });
      setTitle("");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Document upload failed.");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  async function onDownload(doc: DocRow) {
    if (!token) return;
    try {
      const { url } = await fetchSupplierDocumentDownloadUrl(token, doc.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Download failed.");
    }
  }

  function onManualTitle(event: FormEvent) {
    event.preventDefault();
  }

  return (
    <SupplierShell title="Documents">
      <p className="mb-3 text-sm text-zinc-600" role="status">
        Secure binary upload for your supplier only. Cross-supplier access is denied. Virus scanning is
        not claimed.
      </p>
      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
          <button type="button" className="ml-2 font-semibold underline" onClick={() => setError(null)}>
            Dismiss
          </button>
        </p>
      ) : null}

      <form className="mb-3 grid gap-2 sm:grid-cols-2" onSubmit={onManualTitle}>
        <label className="text-xs font-medium text-zinc-600">
          Title
          <input
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Document title"
          />
        </label>
        <label className="text-xs font-medium text-zinc-600">
          Type
          <select
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
          >
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </form>

      <div className="mb-6">
        <DocumentUploadDropzone
          busy={busy}
          progressLabel={progress}
          onFileReady={onUpload}
          onError={(message) => setError(message)}
        />
      </div>

      {docs.length === 0 ? (
        <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-zinc-500">
          No documents yet. Upload a PDF, image, DOCX, or CSV.
        </p>
      ) : (
        <ul className="space-y-2">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 text-sm"
            >
              <div>
                <p className="font-semibold">{doc.title}</p>
                <p className="text-xs text-zinc-500">
                  {doc.documentType}
                  {doc.originalFilename ? ` · ${doc.originalFilename}` : ""}
                  {doc.mimeType ? ` · ${doc.mimeType}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                {doc.hasBinary || doc.fileUrl ? (
                  <button
                    type="button"
                    className="rounded-lg border px-3 py-1.5 text-sm font-semibold hover:bg-zinc-50"
                    onClick={() => void onDownload(doc)}
                  >
                    Download
                  </button>
                ) : null}
                {doc.mimeType?.startsWith("image/") ? (
                  <span className="rounded-lg border border-dashed px-3 py-1.5 text-xs text-zinc-500">
                    Preview via download
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SupplierShell>
  );
}
