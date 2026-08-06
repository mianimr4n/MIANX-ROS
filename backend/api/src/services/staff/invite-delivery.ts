import { randomUUID } from "node:crypto";
import net from "node:net";
import tls from "node:tls";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";

export interface StaffInviteDeliveryMessage {
  recipient: string;
  recipientName: string;
  acceptanceUrl: string;
  expiresAt: string;
}

export interface StaffInviteDelivery {
  send(message: StaffInviteDeliveryMessage): Promise<{ provider: string; messageId: string }>;
}

type SmtpTarget = { host: string; port: number; secure: boolean; user?: string; pass?: string };

function smtpTarget(raw: string): SmtpTarget | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "smtp:" && url.protocol !== "smtps:") return null;
    return {
      host: url.hostname,
      port: Number(url.port || (url.protocol === "smtps:" ? 465 : 1025)),
      secure: url.protocol === "smtps:",
      user: url.username ? decodeURIComponent(url.username) : undefined,
      pass: url.password ? decodeURIComponent(url.password) : undefined,
    };
  } catch {
    return null;
  }
}

function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]/g, " ").trim();
}

async function smtpSend(target: SmtpTarget, from: string, message: StaffInviteDeliveryMessage) {
  const messageId = `<${randomUUID()}@telepizza.local>`;
  const subject = "Your Telepizza staff invitation";
  const body = [
    `Hello ${message.recipientName},`,
    "",
    "You have been invited to Telepizza. Set your password using this single-use link:",
    message.acceptanceUrl,
    "",
    `This invitation expires at ${message.expiresAt}.`,
    "If you did not expect this invitation, ignore this email.",
  ].join("\r\n");
  const content = [
    `From: ${sanitizeHeader(from)}`,
    `To: ${sanitizeHeader(message.recipient)}`,
    `Subject: ${subject}`,
    `Message-ID: ${messageId}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ].join("\r\n").replace(/^\./gm, "..");

  await new Promise<void>((resolve, reject) => {
    const socket = target.secure
      ? tls.connect({ host: target.host, port: target.port, servername: target.host })
      : net.createConnection({ host: target.host, port: target.port });
    let buffer = "";
    let step = 0;
    const send = (line: string) => socket.write(`${line}\r\n`);
    socket.setTimeout(10_000);
    socket.on("timeout", () => { socket.destroy(); reject(new Error("SMTP timeout")); });
    socket.on("error", reject);
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!/^\d{3}/.test(line)) continue;
        const code = Number(line.slice(0, 3));
        if (code >= 400) { socket.destroy(); reject(new Error(`SMTP rejected at step ${step}`)); return; }
        if (step === 0 && code === 220) { send("EHLO telepizza.local"); step = 1; }
        else if (step === 1 && code === 250 && !line.startsWith("250-")) {
          if (target.user && target.pass) {
            send(`AUTH PLAIN ${Buffer.from(`\u0000${target.user}\u0000${target.pass}`).toString("base64")}`);
            step = 7;
          } else { send(`MAIL FROM:<${from}>`); step = 2; }
        }
        else if (step === 7 && code === 235) { send(`MAIL FROM:<${from}>`); step = 2; }
        else if (step === 2 && code === 250) { send(`RCPT TO:<${message.recipient}>`); step = 3; }
        else if (step === 3 && (code === 250 || code === 251)) { send("DATA"); step = 4; }
        else if (step === 4 && code === 354) { socket.write(`${content}\r\n.\r\n`); step = 5; }
        else if (step === 5 && code === 250) { send("QUIT"); step = 6; resolve(); }
      }
    });
  });
  return messageId;
}

export function createStaffInviteDelivery(envStatus: EnvironmentStatus): StaffInviteDelivery {
  return {
    async send(message) {
      if (envStatus.config.emailMode === "disabled") {
        throw new ApiError(503, "INVITE_DELIVERY_UNAVAILABLE", "Staff invitation email delivery is disabled.");
      }
      const rawSmtp = (process.env.EMAIL_SMTP_URL ?? "").trim();
      const target = smtpTarget(rawSmtp);
      if (!target) {
        throw new ApiError(
          503,
          "INVITE_DELIVERY_UNAVAILABLE",
          envStatus.config.envClass === "production"
            ? "Staff invitation email delivery is not configured."
            : "Configure local Mailpit with EMAIL_SMTP_URL=smtp://127.0.0.1:1025.",
        );
      }
      const from = sanitizeHeader(process.env.STAFF_INVITE_FROM_EMAIL ?? "no-reply@telepizza.local");
      const messageId = await smtpSend(target, from, message);
      return { provider: envStatus.config.envClass === "production" ? "smtp" : "mailpit", messageId };
    },
  };
}
