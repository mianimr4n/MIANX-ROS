/**
 * Sync live local postgres menu_items.price from menu_canon for matching slugs.
 * LOCAL ONLY — implements founder price lock without rewriting historical orders.
 */
import { spawnSync } from "node:child_process";

const CONTAINER = "supabase_db_telepizza-platform";

const dump = spawnSync(
  "docker",
  [
    "exec",
    CONTAINER,
    "psql",
    "-U",
    "postgres",
    "-d",
    "menu_canon",
    "-t",
    "-A",
    "-F",
    "|",
    "-c",
    "select slug, price::text, coalesce(size_label,''), coalesce(size_code,'') from menu_items where price is not null order by slug;",
  ],
  { encoding: "utf8" },
);
if (dump.status !== 0) throw new Error(dump.stderr);

const rows = (dump.stdout || "")
  .trim()
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => {
    const [slug, price, sizeLabel, sizeCode] = line.split("|");
    return { slug, price: Number(price), sizeLabel, sizeCode };
  });

const values = rows
  .map(
    (r) =>
      `('${r.slug.replace(/'/g, "''")}', ${r.price}, ${
        r.sizeLabel ? `'${r.sizeLabel.replace(/'/g, "''")}'` : "NULL"
      }, ${r.sizeCode ? `'${r.sizeCode.replace(/'/g, "''")}'` : "NULL"})`,
  )
  .join(",\n");

const sql = `
begin;
create temporary table _founder_prices (
  slug text primary key,
  price numeric not null,
  size_label text,
  size_code text
) on commit drop;
insert into _founder_prices (slug, price, size_label, size_code) values
${values};

update public.menu_items mi
set
  price = fp.price,
  size_label = coalesce(nullif(mi.size_label, ''), fp.size_label, mi.size_label),
  size_code = coalesce(nullif(mi.size_code, ''), fp.size_code, mi.size_code),
  updated_at = now()
from _founder_prices fp
where mi.slug = fp.slug
  and mi.price is distinct from fp.price;

select
  (select count(*) from menu_items mi join _founder_prices fp on fp.slug = mi.slug) as matched,
  (select count(*) from menu_items mi join _founder_prices fp on fp.slug = mi.slug where mi.price = fp.price) as price_aligned,
  (select price from menu_items where slug = 'tele-special-medium') as tele_special_medium;
commit;
`;

const run = spawnSync(
  "docker",
  ["exec", "-i", CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"],
  { encoding: "utf8", input: sql },
);
console.log(run.stdout);
if (run.status !== 0) {
  console.error(run.stderr);
  process.exit(1);
}
