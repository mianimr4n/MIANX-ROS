import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const dir = "apps/website/dist/public/assets";
const html = fs.readFileSync("apps/website/dist/public/index.html", "utf8");
const entryMatch = html.match(/assets\/(index-[^"']+\.js)/);
const cssMatch = html.match(/assets\/(index-[^"']+\.css)/);
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".js"));

function sizes(f) {
  const buf = fs.readFileSync(path.join(dir, f));
  return { f, raw: buf.length, gzip: zlib.gzipSync(buf, { level: 9 }).length };
}

const rows = files.map(sizes).sort((a, b) => b.raw - a.raw);
const entry = rows.find((r) => r.f === entryMatch[1]);
const totalRaw = rows.reduce((s, r) => s + r.raw, 0);
const totalGz = rows.reduce((s, r) => s + r.gzip, 0);
const css = cssMatch ? sizes(cssMatch[1]) : null;

const entryCode = fs.readFileSync(path.join(dir, entry.f), "utf8");
const staticImports = [...entryCode.matchAll(/from\s*["']\.\/([^"']+\.js)["']/g)].map((m) => m[1]);
const dynamicImports = [
  ...new Set([...entryCode.matchAll(/import\(\s*["']\.\/([^"']+\.js)["']\s*\)/g)].map((m) => m[1])),
];

function aggregate(extraNames) {
  const names = new Set([entry.f, ...staticImports, ...extraNames]);
  let raw = 0;
  let gzip = 0;
  for (const n of names) {
    const r = rows.find((x) => x.f === n);
    if (r) {
      raw += r.raw;
      gzip += r.gzip;
    }
  }
  return { raw, gzip, requests: names.size, files: [...names] };
}

const hero = rows.find((r) => r.f.startsWith("HeroSlider-"));
const embla = rows.find((r) => r.f.startsWith("vendor-embla-"));
const homeExtra = [hero?.f, embla?.f].filter(Boolean);

const before = JSON.parse(
  fs.readFileSync("docs/testing/acceptance-evidence/rc5-perf-01/bundle-before.json", "utf8"),
);

const after = {
  entry,
  css,
  totalRaw,
  totalGz,
  chunkCount: rows.length,
  staticImports,
  dynamicImports,
  routes: {
    "/": aggregate(homeExtra),
    "/menu": aggregate([]),
    "/admin/login": aggregate([]),
  },
  largest: rows[0],
  top15: rows.slice(0, 15),
  warningLargeChunk: entry.raw > 500_000,
  chunks: rows,
};

const pct = ((before.entry.gzip - entry.gzip) / before.entry.gzip) * 100;

const summary = {
  entryBefore: before.entry,
  entryAfter: entry,
  entryGzipReductionPct: Number(pct.toFixed(2)),
  totalBefore: { raw: before.totalRaw, gzip: before.totalGz, chunks: before.chunkCount },
  totalAfter: { raw: totalRaw, gzip: totalGz, chunks: rows.length },
  routesAfter: after.routes,
  // Before: all critical routes were entry-only (no sync siblings).
  routesBefore: {
    "/": { raw: before.entry.raw, gzip: before.entry.gzip, requests: 1 },
    "/menu": { raw: before.entry.raw, gzip: before.entry.gzip, requests: 1 },
    "/admin/login": { raw: before.entry.raw, gzip: before.entry.gzip, requests: 1 },
  },
  staticImportCount: staticImports.length,
};

fs.writeFileSync(
  "docs/testing/acceptance-evidence/rc5-perf-01/bundle-after.json",
  JSON.stringify(after, null, 2),
);
fs.writeFileSync(
  "docs/testing/acceptance-evidence/rc5-perf-01/bundle-summary.json",
  JSON.stringify(summary, null, 2),
);
console.log(JSON.stringify(summary, null, 2));
