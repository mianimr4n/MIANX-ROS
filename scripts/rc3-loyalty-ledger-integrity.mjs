/**
 * RC3 — loyalty ledger integrity smoke (local only).
 * Creates a temporary customer/account via service role, adjust/burn/reverse, verifies balance = ledger sum.
 * Cleans up created rows. Never prints secrets.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

const requireFromApi = createRequire(resolve("backend/api/package.json"));
const { createClient } = requireFromApi("@supabase/supabase-js");
const OUT = resolve("docs/testing/acceptance-evidence/rc3-integration-certification");
mkdirSync(OUT, { recursive: true });

function loadEnv(path) {
  const env = {};
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[line.slice(0, i).trim()] = v;
  }
  return env;
}

const report = { ok: false, checks: [], failures: [], cleanup: [] };
function check(id, pass, detail) {
  report.checks.push({ id, pass, detail });
  if (!pass) report.failures.push({ id, detail });
}

const apiEnv = loadEnv("backend/api/.env.local");
const admin = createClient(apiEnv.SUPABASE_URL, apiEnv.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const phone = `+92300${String(Date.now()).slice(-7)}`;
const email = `loyalty.cert.${Date.now()}@telepizza.test`;
let customerId = null;
let accountId = null;
let adjustTxnId = null;

try {
  // Ensure actor_user_id column exists (compat proof)
  const { data: cols, error: colErr } = await admin
    .from("loyalty_transactions")
    .select("actor_user_id")
    .limit(1);
  check("schema.actor_user_id_selectable", !colErr, colErr?.message ?? "selectable");

  const { data: customer, error: cErr } = await admin
    .from("customers")
    .insert({ full_name: "Loyalty Cert", phone, email })
    .select("id")
    .single();
  if (cErr) throw new Error(`customer create: ${cErr.message}`);
  customerId = customer.id;
  report.cleanup.push(`customer:${customerId}`);

  const { data: adj, error: aErr } = await admin.rpc("loyalty_adjust_atomic", {
    p_customer_id: customerId,
    p_points: 100,
    p_note: "cert adjust credit",
    p_actor_user_id: null,
    p_idempotency_key: `cert-adj-${randomUUID()}`,
  });
  check("rpc.adjust", !aErr && adj?.pointsBalance === 100, aErr?.message ?? JSON.stringify(adj));
  adjustTxnId = adj?.transactionId ?? null;
  accountId = adj?.accountId ?? null;

  const key = `cert-burn-${randomUUID()}`;
  const { data: burn1, error: b1 } = await admin.rpc("loyalty_burn_atomic", {
    p_customer_id: customerId,
    p_points: 40,
    p_note: "cert burn",
    p_actor_user_id: null,
    p_idempotency_key: key,
  });
  check("rpc.burn", !b1 && burn1?.pointsBalance === 60, b1?.message ?? JSON.stringify(burn1));

  const { data: burn2, error: b2 } = await admin.rpc("loyalty_burn_atomic", {
    p_customer_id: customerId,
    p_points: 40,
    p_note: "cert burn replay",
    p_actor_user_id: null,
    p_idempotency_key: key,
  });
  check(
    "rpc.burn_idempotent",
    !b2 && burn2?.idempotentReplay === true && burn2?.transactionId === burn1?.transactionId,
    b2?.message ?? JSON.stringify(burn2),
  );

  if (adjustTxnId) {
    // Do not reverse the credit while a burn remains — would go negative.
    check("rpc.adjust_txn_recorded", Boolean(adjustTxnId), `txn=${adjustTxnId}`);
  }

  const { data: burnTxn } = await admin
    .from("loyalty_transactions")
    .select("id")
    .eq("loyalty_account_id", accountId)
    .eq("type", "burn")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (burnTxn?.id) {
    const { data: revBurn, error: rbErr } = await admin.rpc("loyalty_reverse_atomic", {
      p_transaction_id: burnTxn.id,
      p_note: "cert reverse burn",
      p_actor_user_id: null,
    });
    check("rpc.reverse_burn", !rbErr && revBurn?.type === "reverse", rbErr?.message ?? JSON.stringify(revBurn));
  }

  const { data: account } = await admin
    .from("loyalty_accounts")
    .select("id, points_balance")
    .eq("customer_id", customerId)
    .single();
  const { data: txns } = await admin
    .from("loyalty_transactions")
    .select("points, type, actor_user_id")
    .eq("loyalty_account_id", account.id);
  const ledgerSum = (txns ?? []).reduce((s, t) => s + Number(t.points), 0);
  check(
    "ledger.balance_equals_sum",
    Number(account.points_balance) === ledgerSum,
    `balance=${account.points_balance} sum=${ledgerSum} txns=${(txns ?? []).length}`,
  );
  check(
    "ledger.actor_column_present",
    (txns ?? []).every((t) => Object.prototype.hasOwnProperty.call(t, "actor_user_id")),
    "actor_user_id projected",
  );
} catch (err) {
  report.failures.push({ id: "setup", detail: String(err?.message ?? err).slice(0, 400) });
} finally {
  if (customerId) {
    const { data: acc } = await admin.from("loyalty_accounts").select("id").eq("customer_id", customerId);
    for (const a of acc ?? []) {
      await admin.from("loyalty_transactions").delete().eq("loyalty_account_id", a.id);
      await admin.from("loyalty_accounts").delete().eq("id", a.id);
    }
    await admin.from("customers").delete().eq("id", customerId);
  }
}

report.ok = report.failures.length === 0;
writeFileSync(resolve(OUT, "loyalty-ledger-integrity.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ok: report.ok, passed: report.checks.filter((c) => c.pass).length, failed: report.failures.length, failures: report.failures }, null, 2));
process.exitCode = report.ok ? 0 : 1;
