import type { LogLevel, StructuredLogFields } from "./types.js";
import { redactForLogs } from "./redact.js";

export type LogSink = (line: string) => void;

export interface Logger {
  log(fields: StructuredLogFields): void;
  info(msg: string, fields?: Omit<StructuredLogFields, "level" | "msg" | "timestamp">): void;
  warn(msg: string, fields?: Omit<StructuredLogFields, "level" | "msg" | "timestamp">): void;
  error(msg: string, fields?: Omit<StructuredLogFields, "level" | "msg" | "timestamp">): void;
}

export function createLogger(sink: LogSink = defaultSink): Logger {
  const write = (level: LogLevel, msg: string, fields: Record<string, unknown> = {}) => {
    const payload = redactForLogs({
      level,
      msg,
      timestamp: new Date().toISOString(),
      ...fields,
    }) as StructuredLogFields;

    sink(JSON.stringify(payload));
  };

  return {
    log(fields) {
      sink(JSON.stringify(redactForLogs({ ...fields, timestamp: fields.timestamp || new Date().toISOString() })));
    },
    info: (msg, fields) => write("info", msg, fields ?? {}),
    warn: (msg, fields) => write("warn", msg, fields ?? {}),
    error: (msg, fields) => write("error", msg, fields ?? {}),
  };
}

function defaultSink(line: string): void {
  // Structured logs go to stdout; operators ship host logs to their aggregator.
  console.log(line);
}

export const defaultLogger = createLogger();
