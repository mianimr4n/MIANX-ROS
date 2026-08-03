/**
 * Local read-only EOD Pack exports (CSV / JSON). No upload, email, or WhatsApp.
 */

import type { EodPack } from "./types";

function csvEscape(value: string | number | null | undefined): string {
  let raw = value == null ? "" : String(value);
  // Mitigate spreadsheet formula injection when cells begin with = + - @.
  if (/^[=+\-@]/.test(raw)) raw = `'${raw}`;
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

/** Flat metrics + unresolved rows for CSV download. */
export function buildEodPackCsv(pack: EodPack): string {
  const lines: string[] = [];
  lines.push(
    [
      "rowType",
      "branchName",
      "businessDate",
      "generatedAt",
      "packState",
      "coveragePercent",
      "confidence",
      "sectionId",
      "metricOrItemId",
      "label",
      "rawValue",
      "unit",
      "maturityOrSeverity",
      "source",
      "limitation",
    ].join(","),
  );

  lines.push(
    [
      "meta",
      csvEscape(pack.branchName),
      csvEscape(pack.businessDate),
      csvEscape(pack.generatedAt),
      csvEscape(pack.state),
      csvEscape(pack.sourceCoveragePercent),
      csvEscape(pack.confidence),
      "",
      "PACK",
      csvEscape(pack.previewLabel),
      "",
      "text",
      "",
      "EOD Pack preview",
      csvEscape(pack.limitations.join(" | ")),
    ].join(","),
  );

  for (const section of pack.sections) {
    for (const m of section.metrics) {
      lines.push(
        [
          "metric",
          csvEscape(pack.branchName),
          csvEscape(pack.businessDate),
          csvEscape(pack.generatedAt),
          csvEscape(pack.state),
          csvEscape(pack.sourceCoveragePercent),
          csvEscape(pack.confidence),
          csvEscape(section.sectionId),
          csvEscape(m.metricId),
          csvEscape(m.label),
          csvEscape(m.rawValue),
          csvEscape(m.unit),
          csvEscape(m.maturity),
          csvEscape(m.source),
          csvEscape(m.limitation ?? ""),
        ].join(","),
      );
    }
  }

  for (const item of pack.unresolvedItems) {
    lines.push(
      [
        "unresolved",
        csvEscape(pack.branchName),
        csvEscape(pack.businessDate),
        csvEscape(pack.generatedAt),
        csvEscape(pack.state),
        csvEscape(pack.sourceCoveragePercent),
        csvEscape(pack.confidence),
        "closing-gaps",
        csvEscape(item.type),
        csvEscape(`${item.domain} · ${item.type}`),
        csvEscape(item.count),
        "count",
        csvEscape(item.severity),
        csvEscape(item.source),
        csvEscape(item.limitation ?? ""),
      ].join(","),
    );
  }

  for (const lim of pack.excludedDomains) {
    lines.push(
      [
        "limitation",
        csvEscape(pack.branchName),
        csvEscape(pack.businessDate),
        csvEscape(pack.generatedAt),
        csvEscape(pack.state),
        csvEscape(pack.sourceCoveragePercent),
        csvEscape(pack.confidence),
        "source-coverage",
        "DEFERRED",
        csvEscape(lim),
        "",
        "text",
        "Deferred",
        "EOD deferred domains",
        "",
      ].join(","),
    );
  }

  return lines.join("\n");
}

export function buildEodPackJson(pack: EodPack): string {
  // Strip nothing sensitive — pack contract already excludes PII.
  return JSON.stringify(
    {
      packId: pack.packId,
      previewLabel: pack.previewLabel,
      branchId: pack.branchId,
      branchName: pack.branchName,
      businessDate: pack.businessDate,
      timezone: pack.timezone,
      generatedAt: pack.generatedAt,
      state: pack.state,
      confidence: pack.confidence,
      sourceCoveragePercent: pack.sourceCoveragePercent,
      freshnessState: pack.freshnessState,
      limitations: pack.limitations,
      excludedDomains: pack.excludedDomains,
      sections: pack.sections.map((s) => ({
        sectionId: s.sectionId,
        title: s.title,
        coverage: s.coverage,
        metrics: s.metrics.map((m) => ({
          metricId: m.metricId,
          label: m.label,
          rawValue: m.rawValue,
          unit: m.unit,
          maturity: m.maturity,
          source: m.source,
          limitation: m.limitation,
        })),
      })),
      unresolvedItems: pack.unresolvedItems.map((u) => ({
        type: u.type,
        domain: u.domain,
        severity: u.severity,
        count: u.count,
        source: u.source,
      })),
    },
    null,
    2,
  );
}

export function eodExportFilename(pack: EodPack, ext: "csv" | "json"): string {
  const branch = (pack.branchName || "branch")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `eod-pack-preview-${branch}-${pack.businessDate}.${ext}`;
}

/** Trigger a local browser download — never uploads. */
export function downloadTextFile(filename: string, contents: string, mime: string): void {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadEodPackCsv(pack: EodPack): void {
  downloadTextFile(eodExportFilename(pack, "csv"), buildEodPackCsv(pack), "text/csv;charset=utf-8");
}

export function downloadEodPackJson(pack: EodPack): void {
  downloadTextFile(
    eodExportFilename(pack, "json"),
    buildEodPackJson(pack),
    "application/json;charset=utf-8",
  );
}
