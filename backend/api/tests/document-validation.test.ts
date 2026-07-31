import { describe, expect, it } from "vitest";

import {
  buildStorageObjectPath,
  sanitizeOriginalFilename,
  validateDocumentUpload,
} from "../src/services/documents/validation.js";

describe("RC4-5 document validation", () => {
  it("accepts PDF with matching extension", () => {
    const bytes = Buffer.from("%PDF-1.4 demo");
    const result = validateDocumentUpload({
      dataBase64: bytes.toString("base64"),
      contentType: "application/pdf",
      originalFilename: "Invoice #12.pdf",
    });
    expect(result.mime).toBe("application/pdf");
    expect(result.extension).toBe("pdf");
    expect(result.checksumSha256).toHaveLength(64);
    expect(result.safeOriginalFilename).toBe("Invoice _12.pdf");
  });

  it("rejects unsupported mime", () => {
    expect(() =>
      validateDocumentUpload({
        dataBase64: Buffer.from("x").toString("base64"),
        contentType: "application/zip",
        originalFilename: "x.zip",
      }),
    ).toThrow(/Unsupported content type/);
  });

  it("rejects extension/mime mismatch", () => {
    expect(() =>
      validateDocumentUpload({
        dataBase64: Buffer.from("x").toString("base64"),
        contentType: "application/pdf",
        originalFilename: "photo.png",
      }),
    ).toThrow(/extension does not match/);
  });

  it("rejects oversized payloads", () => {
    const big = Buffer.alloc(1000, 1);
    expect(() =>
      validateDocumentUpload({
        dataBase64: big.toString("base64"),
        contentType: "text/csv",
        originalFilename: "a.csv",
        maxBytes: 100,
      }),
    ).toThrow(/or smaller/);
  });

  it("strips path traversal from filenames", () => {
    expect(sanitizeOriginalFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeOriginalFilename("C:\\\\Windows\\\\evil.docx")).toBe("evil.docx");
  });

  it("builds tenant-safe storage paths without client names", () => {
    const path = buildStorageObjectPath({
      tenantKey: "sup-123/../hack",
      extension: "pdf",
      now: new Date("2026-07-31T12:00:00Z"),
    });
    expect(path).toMatch(/^sup-123hack\/2026\/07\/[0-9a-f-]{36}\.pdf$/i);
    expect(path).not.toContain("..");
  });
});
