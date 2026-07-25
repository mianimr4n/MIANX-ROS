/**
 * D3 notification outbox worker.
 *
 * Honesty rules:
 * - emailMode=disabled → mark provider_unavailable (never claim sent)
 * - emailMode=mock → mark sent with provider_message_id=mock-...
 * - emailMode=sandbox (or branch provider_mode=dev_smtp):
 *     write local outbox file; attempt SMTP only when EMAIL_SMTP_URL is set.
 *     If SMTP is not configured / fails → provider_unavailable (do NOT fake sent).
 *
 * No raw PII in logs — recipient_masked only.
 */

import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import net from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus, IntegrationMode } from "../../config/env.js";

export const OUTBOX_TEMPLATES = [
  "reservation_confirmation",
  "reservation_cancellation",
  "reservation_reminder",
  "waitlist_ready",
  "deposit_request",
  "deposit_confirmation",
] as const;

export type OutboxTemplateCode = (typeof OUTBOX_TEMPLATES)[number];

const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 30_000;

export interface OutboxWorker {
  processOutboxBatch(limit?: number): Promise<{
    claimed: number;
    sent: number;
    providerUnavailable: number;
    failed: number;
    deadLetter: number;
  }>;
}

export interface NotificationWorkerHandle {
  stop: () => void;
}

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SERVICE_UNAVAILABLE", "Supabase is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function backoffMs(retryCount: number): number {
  return BASE_BACKOFF_MS * 2 ** Math.max(0, retryCount);
}

function outboxDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..", "..", "..", ".notification-outbox");
}

async function writeLocalOutboxFile(entry: {
  id: string;
  templateCode: string | null;
  recipientMasked: string | null;
  subject: string;
  body: string;
}): Promise<string> {
  const dir = outboxDir();
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, `${Date.now()}-${entry.id}.json`);
  await writeFile(
    filePath,
    JSON.stringify(
      {
        id: entry.id,
        templateCode: entry.templateCode,
        recipientMasked: entry.recipientMasked,
        subject: entry.subject,
        body: entry.body,
        writtenAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf8",
  );
  return filePath;
}

function parseSmtpUrl(raw: string): { host: string; port: number; user?: string; pass?: string } | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "smtp:" && url.protocol !== "smtps:") return null;
    return {
      host: url.hostname || "127.0.0.1",
      port: url.port ? Number(url.port) : url.protocol === "smtps:" ? 465 : 1025,
      user: url.username ? decodeURIComponent(url.username) : undefined,
      pass: url.password ? decodeURIComponent(url.password) : undefined,
    };
  } catch {
    return null;
  }
}

/** Minimal SMTP DATA sender for local Mailpit/Inbucket (no AUTH required typically). */
async function sendViaSmtp(opts: {
  smtpUrl: string;
  from: string;
  to: string;
  subject: string;
  body: string;
}): Promise<string> {
  const parsed = parseSmtpUrl(opts.smtpUrl);
  if (!parsed) {
    throw new Error("Invalid EMAIL_SMTP_URL");
  }

  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: parsed.host, port: parsed.port }, () => {
      // conversation driven by onData
    });
    let buffer = "";
    let step = 0;
    const messageId = `<${randomUUID()}@telepizza.local>`;
    const lines = [
      `From: ${opts.from}`,
      `To: ${opts.to}`,
      `Subject: ${opts.subject}`,
      `Message-ID: ${messageId}`,
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
      "",
      opts.body,
      ".",
    ];

    const send = (cmd: string) => {
      socket.write(`${cmd}\r\n`);
    };

    socket.setTimeout(10_000);
    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("SMTP timeout"));
    });
    socket.on("error", reject);
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      const parts = buffer.split(/\r?\n/);
      buffer = parts.pop() ?? "";
      for (const line of parts) {
        if (!/^\d{3}/.test(line)) continue;
        const code = Number(line.slice(0, 3));
        if (code >= 400) {
          socket.end();
          reject(new Error(`SMTP error: ${line}`));
          return;
        }
        if (step === 0 && code === 220) {
          send(`EHLO telepizza.local`);
          step = 1;
        } else if (step === 1 && code === 250) {
          // Multi-line 250-… then final 250 — wait for a bare 250 without hyphen after EHLO.
          if (line.startsWith("250-")) continue;
          send(`MAIL FROM:<${opts.from}>`);
          step = 2;
        } else if (step === 2 && code === 250) {
          send(`RCPT TO:<${opts.to}>`);
          step = 3;
        } else if (step === 3 && (code === 250 || code === 251)) {
          send("DATA");
          step = 4;
        } else if (step === 4 && code === 354) {
          socket.write(`${lines.join("\r\n")}\r\n`);
          step = 5;
        } else if (step === 5 && code === 250) {
          send("QUIT");
          step = 6;
          resolve(messageId);
        }
      }
    });
  });
}

function renderTemplate(
  templateCode: string | null,
  payload: Record<string, unknown>,
): { subject: string; body: string } {
  const reservationNumber = String(payload.reservationNumber ?? "reservation");
  const startAt = String(payload.startAt ?? "");
  switch (templateCode) {
    case "reservation_confirmation":
      return {
        subject: `Reservation confirmed — ${reservationNumber}`,
        body: `Your Telepizza reservation ${reservationNumber} is confirmed for ${startAt}.`,
      };
    case "reservation_cancellation":
      return {
        subject: `Reservation cancelled — ${reservationNumber}`,
        body: `Your Telepizza reservation ${reservationNumber} has been cancelled.`,
      };
    case "reservation_reminder":
      return {
        subject: `Reminder — ${reservationNumber}`,
        body: `Reminder: your Telepizza reservation ${reservationNumber} is at ${startAt}.`,
      };
    case "waitlist_ready":
      return {
        subject: "Your table is ready",
        body: "Your waitlist party is ready to be seated.",
      };
    case "deposit_request":
      return {
        subject: `Deposit requested — ${reservationNumber}`,
        body: `A deposit is requested for reservation ${reservationNumber}.`,
      };
    case "deposit_confirmation":
      return {
        subject: `Deposit received — ${reservationNumber}`,
        body: `We received your deposit for reservation ${reservationNumber}.`,
      };
    default:
      return {
        subject: `Telepizza notification — ${reservationNumber}`,
        body: `Update for reservation ${reservationNumber}.`,
      };
  }
}

export function createOutboxWorker(envStatus: EnvironmentStatus): OutboxWorker {
  let client: SupabaseClient | null = null;
  const getClient = () => (client ??= createServiceClient(envStatus));

  return {
    async processOutboxBatch(limit = 20) {
      const supabase = getClient();
      const nowIso = new Date().toISOString();
      const emailMode: IntegrationMode = envStatus.config.emailMode;
      const smtpUrl = (process.env.EMAIL_SMTP_URL ?? "").trim();

      const { data: rows, error } = await supabase
        .from("reservation_communications")
        .select("*")
        .in("status", ["pending", "queued", "failed"])
        .or(`next_attempt_at.is.null,next_attempt_at.lte.${nowIso}`)
        .order("next_attempt_at", { ascending: true, nullsFirst: true })
        .limit(Math.min(Math.max(limit, 1), 100));

      if (error) throw new ApiError(500, "OUTBOX_CLAIM_FAILED", error.message);

      const claimed = rows ?? [];
      let sent = 0;
      let providerUnavailable = 0;
      let failed = 0;
      let deadLetter = 0;

      for (const row of claimed) {
        const id = row.id as string;
        const retryCount = Number(row.retry_count ?? 0);

        const { data: claimedRow, error: claimErr } = await supabase
          .from("reservation_communications")
          .update({
            status: "sending",
            last_attempt_at: nowIso,
          })
          .eq("id", id)
          .in("status", ["pending", "queued", "failed"])
          .select("id")
          .maybeSingle();
        if (claimErr || !claimedRow) continue;

        const templateCode = (row.template_code as string | null) ?? null;
        const payload = (row.payload ?? {}) as Record<string, unknown>;
        const rendered = renderTemplate(templateCode, payload);
        const recipientMasked = (row.recipient_masked as string | null) ?? null;

        try {
          if (emailMode === "disabled") {
            await supabase
              .from("reservation_communications")
              .update({
                status: "provider_unavailable",
                provider_code: "disabled",
                failure_reason: "TELEPIZZA_EMAIL_MODE=disabled",
                next_attempt_at: null,
              })
              .eq("id", id);
            providerUnavailable += 1;
            console.info("[outbox] provider_unavailable", { id, provider: "disabled", recipientMasked });
            continue;
          }

          if (emailMode === "mock") {
            const providerMessageId = `mock-${createHash("sha256").update(id).digest("hex").slice(0, 16)}`;
            await writeLocalOutboxFile({
              id,
              templateCode,
              recipientMasked,
              subject: rendered.subject,
              body: rendered.body,
            });
            await supabase
              .from("reservation_communications")
              .update({
                status: "sent",
                provider_code: "mock",
                provider_message_id: providerMessageId,
                sent_at: new Date().toISOString(),
                failure_reason: null,
                next_attempt_at: null,
              })
              .eq("id", id);
            sent += 1;
            console.info("[outbox] sent", { id, provider: "mock", providerMessageId, recipientMasked });
            continue;
          }

          // sandbox / live / explicit SMTP path — require real transport evidence.
          await writeLocalOutboxFile({
            id,
            templateCode,
            recipientMasked,
            subject: rendered.subject,
            body: rendered.body,
          });

          if (!smtpUrl) {
            await supabase
              .from("reservation_communications")
              .update({
                status: "provider_unavailable",
                provider_code: "dev_smtp",
                failure_reason: "EMAIL_SMTP_URL not configured; local outbox file written only",
                next_attempt_at: null,
              })
              .eq("id", id);
            providerUnavailable += 1;
            console.info("[outbox] provider_unavailable", {
              id,
              provider: "dev_smtp",
              reason: "no_smtp_url",
              recipientMasked,
            });
            continue;
          }

          // Prefer a synthetic mailbox when only masked recipient is stored.
          const toAddress =
            typeof payload.guestEmail === "string" && payload.guestEmail.includes("@")
              ? payload.guestEmail
              : "guest@telepizza.local";

          const messageId = await sendViaSmtp({
            smtpUrl,
            from: "reservations@telepizza.local",
            to: toAddress,
            subject: rendered.subject,
            body: rendered.body,
          });

          await supabase
            .from("reservation_communications")
            .update({
              status: "sent",
              provider_code: emailMode === "live" ? "smtp" : "dev_smtp",
              provider_message_id: messageId,
              sent_at: new Date().toISOString(),
              failure_reason: null,
              next_attempt_at: null,
            })
            .eq("id", id);
          sent += 1;
          console.info("[outbox] sent", {
            id,
            provider: "dev_smtp",
            providerMessageId: messageId,
            recipientMasked,
          });
        } catch (err) {
          const nextRetry = retryCount + 1;
          const reason = err instanceof Error ? err.message : "delivery_failed";
          if (nextRetry >= MAX_RETRIES) {
            await supabase
              .from("reservation_communications")
              .update({
                status: "dead_letter",
                retry_count: nextRetry,
                failure_reason: reason.slice(0, 500),
                next_attempt_at: null,
              })
              .eq("id", id);
            deadLetter += 1;
            console.warn("[outbox] dead_letter", { id, recipientMasked, reason: reason.slice(0, 120) });
          } else {
            await supabase
              .from("reservation_communications")
              .update({
                status: "failed",
                retry_count: nextRetry,
                failure_reason: reason.slice(0, 500),
                next_attempt_at: new Date(Date.now() + backoffMs(nextRetry)).toISOString(),
              })
              .eq("id", id);
            failed += 1;
            console.warn("[outbox] failed_retry", {
              id,
              retryCount: nextRetry,
              recipientMasked,
              reason: reason.slice(0, 120),
            });
          }
        }
      }

      return { claimed: claimed.length, sent, providerUnavailable, failed, deadLetter };
    },
  };
}

/**
 * Starts a periodic outbox poller for non-production email modes.
 * Does not start when emailMode is disabled or when envClass is production
 * unless TELEPIZZA_NOTIFICATION_WORKER=1.
 */
export function startNotificationWorker(
  envStatus: EnvironmentStatus,
  intervalMs = 15_000,
): NotificationWorkerHandle | null {
  const emailMode = envStatus.config.emailMode;
  const force = process.env.TELEPIZZA_NOTIFICATION_WORKER === "1";
  const isProd = envStatus.config.envClass === "production";

  if (emailMode === "disabled") return null;
  if (isProd && !force) return null;
  if (!["mock", "sandbox", "live"].includes(emailMode) && !force) return null;

  const worker = createOutboxWorker(envStatus);
  let stopped = false;
  let timer: ReturnType<typeof setInterval> | null = null;

  const tick = () => {
    if (stopped) return;
    void worker.processOutboxBatch(25).catch((err) => {
      const message = err instanceof Error ? err.message : "unknown";
      console.warn("[outbox] batch_error", { message: message.slice(0, 160) });
    });
  };

  tick();
  timer = setInterval(tick, Math.max(5_000, intervalMs));
  if (typeof timer.unref === "function") timer.unref();

  console.info(
    `[outbox] worker started intervalMs=${intervalMs} emailMode=${emailMode} envClass=${envStatus.config.envClass}`,
  );

  return {
    stop: () => {
      stopped = true;
      if (timer) clearInterval(timer);
    },
  };
}
