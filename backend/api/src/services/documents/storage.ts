/**
 * RC4-5 document storage abstraction over Supabase Storage (private buckets).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import { defaultLogger } from "../../observability/index.js";
import {
  buildStorageObjectPath,
  validateDocumentUpload,
  type ValidatedUpload,
} from "./validation.js";

const log = defaultLogger;

export type DocumentDomain = "supplier" | "hr";

export type StoredDocumentObject = ValidatedUpload & {
  bucket: string;
  storagePath: string;
};

export async function uploadDocumentBytes(input: {
  supabase: SupabaseClient;
  bucket: string;
  tenantKey: string;
  dataBase64: string;
  contentType: string;
  originalFilename?: string | null;
  maxBytes?: number;
  requestId?: string;
}): Promise<StoredDocumentObject> {
  const started = Date.now();
  let validated: ValidatedUpload;
  try {
    validated = validateDocumentUpload({
      dataBase64: input.dataBase64,
      contentType: input.contentType,
      originalFilename: input.originalFilename,
      maxBytes: input.maxBytes,
    });
  } catch (err) {
    const code = (err as { code?: string }).code ?? "VALIDATION_ERROR";
    const status = code === "PAYLOAD_TOO_LARGE" ? 413 : code === "UNSUPPORTED_MEDIA_TYPE" ? 415 : 400;
    throw new ApiError(status, code, err instanceof Error ? err.message : "Invalid upload.");
  }

  const storagePath = buildStorageObjectPath({
    tenantKey: input.tenantKey,
    extension: validated.extension,
  });

  const { error } = await input.supabase.storage.from(input.bucket).upload(storagePath, validated.bytes, {
    contentType: validated.mime,
    upsert: false,
  });
  if (error) {
    throw new ApiError(
      503,
      "DOCUMENT_UPLOAD_FAILED",
      error.message.includes("Bucket not found")
        ? "Document storage bucket is not configured. Apply the RC4-5 documents migration."
        : "Document upload failed.",
    );
  }

  const elapsedMs = Date.now() - started;
  if (elapsedMs >= 2000) {
    log.warn("slow_document_upload", {
      requestId: input.requestId,
      bucket: input.bucket,
      sizeBytes: validated.sizeBytes,
      elapsedMs,
    });
  } else {
    log.info("document_uploaded", {
      requestId: input.requestId,
      bucket: input.bucket,
      sizeBytes: validated.sizeBytes,
      elapsedMs,
    });
  }

  return {
    ...validated,
    bucket: input.bucket,
    storagePath,
  };
}

export async function createSignedDownloadUrl(input: {
  supabase: SupabaseClient;
  bucket: string;
  storagePath: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const { data, error } = await input.supabase.storage
    .from(input.bucket)
    .createSignedUrl(input.storagePath, input.expiresInSeconds ?? 120);
  if (error || !data?.signedUrl) {
    throw new ApiError(503, "DOCUMENT_DOWNLOAD_FAILED", "Could not create download URL.");
  }
  return data.signedUrl;
}

export async function writeDocumentAccessEvent(input: {
  supabase: SupabaseClient;
  documentDomain: DocumentDomain;
  documentId: string;
  action: "upload" | "download" | "replace" | "archive" | "delete";
  actorUserId: string | null;
  branchId?: string | null;
  supplierId?: string | null;
  employeeId?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await input.supabase.from("document_access_events").insert({
    document_domain: input.documentDomain,
    document_id: input.documentId,
    action: input.action,
    actor_user_id: input.actorUserId,
    branch_id: input.branchId ?? null,
    supplier_id: input.supplierId ?? null,
    employee_id: input.employeeId ?? null,
    request_id: input.requestId ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) {
    log.warn("document_audit_failed", {
      requestId: input.requestId ?? undefined,
      documentId: input.documentId,
      action: input.action,
      message: error.message,
    });
  }
}
