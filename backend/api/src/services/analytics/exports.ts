/**
 * RC4-2 server-side exports — CSV, SpreadsheetML (Excel), minimal PDF.
 * No browser-side metric calculation.
 */

import type { AnalyticsExportResult, AnalyticsModuleSnapshot, ExportFormat } from "./types.js";

function csvEscape(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function flattenModule(module: AnalyticsModuleSnapshot): Array<{
  moduleId: string;
  metricId: string;
  name: string;
  value: string;
  unit: string;
  status: string;
  reason: string;
}> {
  return module.metrics.map((m) => ({
    moduleId: module.moduleId,
    metricId: m.metricId,
    name: m.name,
    value: m.value == null ? "" : String(m.value),
    unit: m.unit ?? "",
    status: m.status,
    reason: m.reason ?? "",
  }));
}

export function buildCsvExport(modules: AnalyticsModuleSnapshot[], stamp: string): AnalyticsExportResult {
  const header = ["module_id", "metric_id", "name", "value", "unit", "status", "reason"];
  const lines = [header.join(",")];
  for (const mod of modules) {
    for (const row of flattenModule(mod)) {
      lines.push(
        [
          csvEscape(row.moduleId),
          csvEscape(row.metricId),
          csvEscape(row.name),
          csvEscape(row.value),
          csvEscape(row.unit),
          csvEscape(row.status),
          csvEscape(row.reason),
        ].join(","),
      );
    }
  }
  return {
    filename: `telepizza-analytics-${stamp}.csv`,
    contentType: "text/csv; charset=utf-8",
    body: `${lines.join("\n")}\n`,
  };
}

export function buildExcelExport(modules: AnalyticsModuleSnapshot[], stamp: string): AnalyticsExportResult {
  const rows = modules.flatMap(flattenModule);
  const cells = (values: string[]) =>
    values.map((v) => `<Cell><Data ss:Type="String">${xmlEscape(v)}</Data></Cell>`).join("");
  const header = cells(["module_id", "metric_id", "name", "value", "unit", "status", "reason"]);
  const body = rows
    .map((r) => `<Row>${cells([r.moduleId, r.metricId, r.name, r.value, r.unit, r.status, r.reason])}</Row>`)
    .join("");
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Analytics">
  <Table>
   <Row>${header}</Row>
   ${body}
  </Table>
 </Worksheet>
</Workbook>`;
  return {
    filename: `telepizza-analytics-${stamp}.xls`,
    contentType: "application/vnd.ms-excel",
    body: xml,
  };
}

function pdfEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function buildPdfExport(modules: AnalyticsModuleSnapshot[], stamp: string): AnalyticsExportResult {
  const lines: string[] = ["Telepizza Analytics", `Generated ${stamp}`, ""];
  for (const mod of modules) {
    lines.push(`## ${mod.title} [${mod.status}]`);
    for (const m of mod.metrics) {
      lines.push(
        `- ${m.name}: ${m.value == null ? "n/a" : String(m.value)}${m.unit ? ` ${m.unit}` : ""} (${m.status})`,
      );
    }
    lines.push("");
  }
  const contentLines = lines.slice(0, 80).map((line, i) => {
    const y = 800 - i * 14;
    return `BT /F1 10 Tf 40 ${y} Td (${pdfEscape(line.slice(0, 90))}) Tj ET`;
  });
  const stream = contentLines.join("\n");
  const objects: string[] = [];
  objects.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj");
  objects.push("2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj");
  objects.push(
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj",
  );
  objects.push(`4 0 obj<< /Length ${Buffer.byteLength(stream, "utf8")} >>stream\n${stream}\nendstream endobj`);
  objects.push("5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj");

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${obj}\n`;
  }
  const xrefPos = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  return {
    filename: `telepizza-analytics-${stamp}.pdf`,
    contentType: "application/pdf",
    body: Buffer.from(pdf, "utf8"),
  };
}

export function buildAnalyticsExport(
  format: ExportFormat,
  modules: AnalyticsModuleSnapshot[],
  stamp: string,
): AnalyticsExportResult {
  if (format === "csv") return buildCsvExport(modules, stamp);
  if (format === "excel") return buildExcelExport(modules, stamp);
  return buildPdfExport(modules, stamp);
}
