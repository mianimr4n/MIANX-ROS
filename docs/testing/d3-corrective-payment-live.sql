-- D3 Corrective — live payment settlement, split reconciliation, unpaid-close denial.
-- Runs in a single transaction that ROLLS BACK (no fabricated data persists).
\set ON_ERROR_STOP on
begin;
set local telepizza.d3_test_mode = 'on';

do $$
declare
  v_branch uuid;
  v_actor uuid;
  v_floor uuid := gen_random_uuid();
  v_area uuid := gen_random_uuid();
  v_t uuid := gen_random_uuid();
  v_session uuid;
  v_bill uuid := gen_random_uuid();
  v_order uuid := gen_random_uuid();
  v_r jsonb;
  v_ok boolean;
  v_parts numeric[];
  v_sum numeric;
  v_paid numeric;
begin
  select id into v_branch from public.branches where branch_code = 'royal-orchard';
  select id into v_actor from public.users limit 1;

  -- Timezone helper sanity
  assert public.branch_local_date(v_branch, '2026-08-14 14:00:00+00'::timestamptz) = '2026-08-14'::date,
    'TZ: Karachi business date';
  assert public.branch_wall_to_utc(v_branch, '2026-08-14'::date, '19:00:00'::time) = '2026-08-14 14:00:00+00'::timestamptz,
    'TZ: wall to utc';

  -- Equal split rounding (3-way of 100.00 → 33.34 + 33.33 + 33.33)
  v_parts := public.split_amount_equal(100.00, 3);
  assert v_parts[1] + v_parts[2] + v_parts[3] = 100.00, 'SPLIT: equal reconciles';
  raise notice 'SPLIT equal 100/3 = % + % + %', v_parts[1], v_parts[2], v_parts[3];

  v_parts := public.split_amount_equal(10.00, 2);
  assert v_parts[1] + v_parts[2] = 10.00, 'SPLIT: two-way reconciles';

  insert into public.restaurant_floors (id, branch_id, code, display_name)
    values (v_floor, v_branch, 'pay-f', 'Pay Floor');
  insert into public.service_areas (id, branch_id, floor_id, code, display_name)
    values (v_area, v_branch, v_floor, 'pay-a', 'Pay Area');
  insert into public.restaurant_tables
    (id, branch_id, floor_id, service_area_id, table_number, capacity_min, capacity_max, is_active, operational_status, status)
  values (v_t, v_branch, v_floor, v_area, 'PAY1', 2, 4, true, 'available', 'available');

  v_r := public.seat_party_atomic(v_branch, 'walk_in', null, null, array[v_t], 2, 'Pay Guest', v_actor, v_actor, false);
  v_session := (v_r->>'id')::uuid;

  -- Minimal bill (no full order create required for settlement RPC test)
  insert into public.restaurant_bills (
    id, dine_in_session_id, branch_id, bill_number, status,
    subtotal, tax_amount, discount_amount, grand_total, opened_by_user_id
  ) values (
    v_bill, v_session, v_branch, 'PAY-TEST-1', 'open',
    900.00, 100.00, 0, 1000.00, v_actor
  );

  -- Unpaid close must fail
  v_ok := false;
  begin
    perform public.close_dining_session_atomic(v_session, v_actor, false, null);
  exception when others then
    if sqlerrm like '%SESSION_UNPAID_BALANCE%' then v_ok := true; else raise; end if;
  end;
  assert v_ok, 'CLOSE: unpaid denied';
  raise notice 'CLOSE unpaid denied. PASS';

  -- Override without reason denied
  v_ok := false;
  begin
    perform public.close_dining_session_atomic(v_session, v_actor, true, null);
  exception when others then
    if sqlerrm like '%UNPAID_OVERRIDE_REASON_REQUIRED%' then v_ok := true; else raise; end if;
  end;
  assert v_ok, 'CLOSE: override requires reason';
  raise notice 'CLOSE override reason required. PASS';

  -- Partial payment
  v_r := public.settle_bill_payment_atomic(
    'pay-idem-1', v_branch, v_bill, 400.00, 'cash', v_actor, 400.00, null, null, 'partial', 'PKR'
  );
  assert (v_r->>'idempotentReplay')::boolean = false, 'PAY: first settle';
  assert (v_r->>'remainingBalance')::numeric = 600.00, 'PAY: remaining 600';

  -- Idempotent replay
  v_r := public.settle_bill_payment_atomic(
    'pay-idem-1', v_branch, v_bill, 400.00, 'cash', v_actor, 400.00, null, null, 'partial', 'PKR'
  );
  assert (v_r->>'idempotentReplay')::boolean = true, 'PAY: replay';
  raise notice 'PAY idempotent replay. PASS';

  -- Overpayment rejected
  v_ok := false;
  begin
    perform public.settle_bill_payment_atomic(
      'pay-over', v_branch, v_bill, 700.00, 'card_terminal', v_actor, null, null, null, null, 'PKR'
    );
  exception when others then
    if sqlerrm like '%PAYMENT_EXCEEDS_BALANCE%' then v_ok := true; else raise; end if;
  end;
  assert v_ok, 'PAY: overpayment rejected';
  raise notice 'PAY overpayment rejected. PASS';

  -- Complete settlement
  v_r := public.settle_bill_payment_atomic(
    'pay-idem-2', v_branch, v_bill, 600.00, 'card_terminal', v_actor, null, 'TERM-1', null, null, 'PKR'
  );
  assert (v_r->>'remainingBalance')::numeric = 0, 'PAY: fully settled';
  assert (select status from public.restaurant_bills where id = v_bill) = 'paid', 'PAY: bill paid';
  raise notice 'PAY full settlement. PASS';

  -- Close succeeds without override after payment
  v_r := public.close_dining_session_atomic(v_session, v_actor, false, null);
  assert (v_r->>'serviceStatus') = 'completed', 'CLOSE: after payment';
  assert (select operational_status from public.restaurant_tables where id = v_t) = 'cleaning', 'CLOSE: cleaning';
  raise notice 'CLOSE after settlement. PASS';

  -- Forced payment failure leaves no orphan (rollback inside RPC)
  insert into public.restaurant_bills (
    id, dine_in_session_id, branch_id, bill_number, status,
    subtotal, tax_amount, discount_amount, grand_total, opened_by_user_id
  ) values (
    gen_random_uuid(), v_session, v_branch, 'PAY-TEST-2', 'open',
    100, 0, 0, 100, v_actor
  ) returning id into v_bill;

  select count(*) into v_paid from public.payments where restaurant_bill_id = v_bill;
  set local telepizza.d3_force_fail = 'payment_insert';
  v_ok := false;
  begin
    perform public.settle_bill_payment_atomic(
      'pay-rb', v_branch, v_bill, 100.00, 'cash', v_actor, 100.00, null, null, null, 'PKR'
    );
  exception when others then
    v_ok := true;
  end;
  set local telepizza.d3_force_fail = '';
  assert v_ok, 'PAY rollback raised';
  assert (select count(*) from public.payments where restaurant_bill_id = v_bill) = v_paid,
    'PAY rollback: no orphan payment';
  raise notice 'PAY atomic rollback. PASS';

  raise notice '=== D3 CORRECTIVE PAYMENT/SPLIT/CLOSE LIVE PASS ===';
end $$;

rollback;
