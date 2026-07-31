/**
 * RC4-5 document upload validation — pure rules (no I/O).
 * Never trust client filenames; validate declared mime against allowlist + extension.
 */

import { createHash, randomUUID } from "node:crypto";

export const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "application/csv",
] as const;
export type DocumentMimeType = (typeof DOCUMENT_MIME_TYPES)[number];

const MIME_TO_EXT: Record<DocumentMimeType, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/csv": "csv",
  "application/csv": "csv",
};

const EXT_TO_MIME: Record<string, DocumentMimeType> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  csv: "text/csv",
};

/** Default max bytes (~1.4 MiB) so base64 JSON fits under Express 2mb limit. */
export const DEFAULT_DOC_MAX_BYTES = 1_400_000;

export function resolveDocMaxBytes(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.TELEPIZZA_DOC_MAX_BYTES?.trim();
  if (!raw) return DEFAULT_DOC_MAX_BYTES;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 10_000) return DEFAULT_DOC_MAX_BYTES;
  // Cap at 5 MiB even if env is higher (bucket limit); JSON body still constrains.
  return Math.min(Math.floor(n), 5 * 1024 * 1024);
}

export function normalizeMime(contentType: string): string {
  return contentType.trim().toLowerCase().split(";")[0]?.trim() ?? "";
}

export function isAllowedMime(contentType: string): contentType is DocumentMimeType {
  const mime = normalizeMime(contentType);
  return (DOCUMENT_MIME_TYPES as readonly string[]).includes(mime);
}

/** Strip path traversal and unsafe characters; return basename only. */
export function sanitizeOriginalFilename(input: string | null | undefined): string | null {
  if (!input) return null;
  const base = input.replace(/\\/g, "/").split("/").pop() ?? "";
  const cleaned = base.replace(/[^\w.\- ()[\]]+/g, "_").replace(/^\.+/, "").slice(0, 180);
  return cleaned.length > 0 ? cleaned : null;
}

export function extensionFromFilename(filename: string | null): string | null {
  if (!filename || !filename.includes(".")) return null;
  const ext = filename.split(".").pop()?.toLowerCase() ?? null;
  return ext && ext.length <= 8 ? ext : null;
}

export type ValidatedUpload = {
  bytes: Buffer;
  mime: DocumentMimeType;
  extension: string;
  checksumSha256: string;
  sizeBytes: number;
  safeOriginalFilename: string | null;
};

export function validateDocumentUpload(input: {
  dataBase64: string;
  contentType: string;
  originalFilename?: string | null;
  maxBytes?: number;
}): ValidatedUpload {
  const maxBytes = input.maxBytes ?? DEFAULT_DOC_MAX_BYTES;
  const mimeRaw = normalizeMime(input.contentType);
  if (!isAllowedMime(mimeRaw)) {
    throw Object.assign(new Error(`Unsupported content type: ${mimeRaw || "(empty)"}`), {
      code: "UNSUPPORTED_MEDIA_TYPE",
    });
  }
  const mime = mimeRaw as DocumentMimeType;

  let bytes: Buffer;
  try {
    bytes = Buffer.from(input.dataBase64, "base64");
  } catch {
    throw Object.assign(new Error("Invalid base64 payload."), { code: "VALIDATION_ERROR" });
  }
  if (bytes.byteLength === 0) {
    throw Object.assign(new Error("Upload payload is empty."), { code: "VALIDATION_ERROR" });
  }
  if (bytes.byteLength > maxBytes) {
    throw Object.assign(new Error(`File must be ${maxBytes} bytes or smaller.`), {
      code: "PAYLOAD_TOO_LARGE",
    });
  }

  const safeName = sanitizeOriginalFilename(input.originalFilename);
  const clientExt = extensionFromFilename(safeName);
  const expectedExt = MIME_TO_EXT[mime];
  if (clientExt) {
    const mapped = EXT_TO_MIME[clientExt];
    if (!mapped) {
      throw Object.assign(new Error(`Unsupported file extension: .${clientExt}`), {
        code: "UNSUPPORTED_MEDIA_TYPE",
      });
    }
    // jpeg/jpg and csv/application.csv aliases
    const clientMimeFamily = mapped === "application/csv" ? "text/csv" : mapped;
    const declaredFamily = mime === "application/csv" ? "text/csv" : mime;
    if (clientMimeFamily !== declaredFamily && !(clientExt === "jpg" && mime === "image/jpeg")) {
      throw Object.assign(new Error("File extension does not match content type."), {
        code: "VALIDATION_ERROR",
      });
    }
  }

  return {
    bytes,
    mime,
    extension: expectedExt,
    checksumSha256: createHash("sha256").update(bytes).digest("hex"),
    sizeBytes: bytes.byteLength,
    safeOriginalFilename: safeName,
  };
}

/**
 * Tenant-safe object path: {tenantKey}/{yyyy}/{mm}/{uuid}.{ext}
 * No client path segments.
 */
export function buildStorageObjectPath(input: {
  tenantKey: string;
  extension: string;
  now?: Date;
}): string {
  const tenant = input.tenantKey.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "tenant";
  const now = input.now ?? new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const id = randomUUID();
  const ext = input.extension.replace(/[^a-z0-9]/g, "") || "bin";
  return `${tenant}/${yyyy}/${mm}/${id}.${ext}`;
}

export const SUPPLIER_DOC_BUCKET = "supplier-documents";
export const HR_DOC_BUCKET = "hr-employee-documents";
