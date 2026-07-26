-- Local-only proof: audit insert failure rolls back the price update.
-- Run: psql -f scripts/sql/prove-menu-price-audit-rollback.sql

begin;

create temporary table _price_before on commit drop as
select id, price from public.menu_items where slug = 'tele-special-medium';

create or replace function pg_temp.fail_audit()
returns trigger
language plpgsql
as $fn$
begin
  raise exception 'INDUCED_AUDIT_FAILURE';
end;
$fn$;

create trigger trg_fail_audit
  before insert on public.menu_audit_events
  for each row execute function pg_temp.fail_audit();

do $do$
begin
  perform public.update_menu_item_price_atomic(
    (select id from public.menu_items where slug = 'tele-special-medium'),
    9999,
    null,
    'corr-fail-audit-1',
    null
  );
exception
  when others then
    raise notice 'caught expected failure: %', sqlerrm;
end;
$do$;

select
  (select price from public.menu_items where slug = 'tele-special-medium')
    = (select price from _price_before) as price_unchanged,
  (select count(*) from public.menu_audit_events where correlation_id = 'corr-fail-audit-1') as audit_rows;

rollback;
