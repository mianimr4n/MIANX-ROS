import { useCallback, useId, useRef, useState } from "react";

const ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.docx,.csv,application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv";

export type DocumentUploadPayload = {
  dataBase64: string;
  contentType: string;
  originalFilename: string;
  sizeBytes: number;
};

function readFileAsBase64(file: File): Promise<DocumentUploadPayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      const dataBase64 = comma >= 0 ? result.slice(comma + 1) : result;
      resolve({
        dataBase64,
        contentType: file.type || "application/octet-stream",
        originalFilename: file.name,
        sizeBytes: file.size,
      });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Accessible drag-and-drop document picker — RC4-5.
 * Does not claim virus scanning or message delivery.
 */
export function DocumentUploadDropzone({
  disabled,
  busy,
  progressLabel,
  onFileReady,
  onError,
}: {
  disabled?: boolean;
  busy?: boolean;
  progressLabel?: string | null;
  onFileReady: (payload: DocumentUploadPayload) => void | Promise<void>;
  onError?: (message: string) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localBusy, setLocalBusy] = useState(false);

  const handleFile = useCallback(
    async (file: File | null | undefined) => {
      if (!file) return;
      setLocalBusy(true);
      try {
        const payload = await readFileAsBase64(file);
        await onFileReady(payload);
      } catch (err) {
        onError?.(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setLocalBusy(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [onError, onFileReady],
  );

  const isBusy = Boolean(busy || localBusy);

  return (
    <div
      className={`rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
        dragOver ? "border-[var(--brand-red)] bg-red-50" : "border-[var(--admin-border)] bg-[var(--admin-soft)]"
      } ${disabled || isBusy ? "opacity-60" : ""}`}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (disabled || isBusy) return;
        void handleFile(e.dataTransfer.files?.[0]);
      }}
    >
      <p className="text-sm font-medium text-[var(--admin-ink)]">
        {isBusy ? progressLabel || "Uploading…" : "Drag & drop a document here"}
      </p>
      <p className="mt-1 text-xs text-[var(--admin-muted)]">PDF, PNG, JPEG, DOCX, CSV · size limited by server</p>
      {isBusy ? (
        <div
          className="mx-auto mt-3 h-2 w-40 overflow-hidden rounded-full bg-white"
          role="progressbar"
          aria-valuetext={progressLabel || "Uploading"}
          aria-busy="true"
        >
          <div className="h-full w-2/3 animate-pulse bg-[var(--brand-red)]" />
        </div>
      ) : null}
      <label htmlFor={inputId} className="mt-3 inline-block">
        <span className="sr-only">Choose document file</span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPT}
          disabled={disabled || isBusy}
          className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--brand-red)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </label>
    </div>
  );
}
