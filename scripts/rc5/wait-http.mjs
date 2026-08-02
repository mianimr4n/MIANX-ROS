/**
 * Poll an HTTP URL until status is in the accepted set or timeout.
 * Usage: node scripts/rc5/wait-http.mjs <url> [timeoutSec] [acceptCsv]
 * Example: node scripts/rc5/wait-http.mjs http://127.0.0.1:4000/readyz 120 200
 */
const url = process.argv[2];
const timeoutSec = Number(process.argv[3] || 120);
const accept = new Set(
  (process.argv[4] || "200")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n)),
);

if (!url) {
  console.error("Usage: node scripts/rc5/wait-http.mjs <url> [timeoutSec] [acceptCsv]");
  process.exit(2);
}

const deadline = Date.now() + timeoutSec * 1000;
let last = "none";

while (Date.now() < deadline) {
  try {
    const res = await fetch(url, { method: "GET", redirect: "manual" });
    last = String(res.status);
    if (accept.has(res.status)) {
      console.log(JSON.stringify({ ok: true, url, status: res.status }));
      process.exit(0);
    }
  } catch (err) {
    last = err instanceof Error ? err.message : String(err);
  }
  await new Promise((r) => setTimeout(r, 1500));
}

console.error(JSON.stringify({ ok: false, url, last, timeoutSec }));
process.exit(1);
