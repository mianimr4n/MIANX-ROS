-- =============================================================================
-- D3 — live runtime journeys F–K + idempotency + atomic rollback
--
-- Runs against local Supabase (postgres superuser executes the security-definer
-- RPCs directly). Everything happens inside ONE transaction that ROLLS BACK at
-- the end, so NO fabricated reservations/customers/tables persist. This proves
-- the atomic workflows, concurrency guards, and cross-branch denial at runtime.
--
-- Usage:
--   docker exec -i supabase_db_telepizza-platform \
--     psql -U postgres -d postgres -v ON_ERROR_STOP=1 < docs/testing/d3-live-journeys.sql
-- =============================================================================

\set ON_ERROR_STOP on
begin;

set local telepizza.d3_test_mode = 'on';

-- ---- ephemeral fixtures (rolled back) ---------------------------------------
-- Reuse the real operating branch + an existing user as actor/server.
do $$
declare
  v_branch uuid;
  v_other  uuid;
  v_actor  uuid;
  v_floor  uuid := gen_random_uuid();
  v_area   uuid := gen_random_uuid();
  v_t1 uuid := gen_random_uuid();
  v_t2 uuid := gen_random_uuid();
  v_t3 uuid := gen_random_uuid();
  v_t4 uuid := gen_random_uuid();
  v_res jsonb;
  v_result jsonb;
  v_res_id uuid;
  v_session_id uuid;
  v_session2 uuid;
  v_wl uuid;
  v_combo uuid := gen_random_uuid();
  v_ok boolean;
  v_status text;
begin
  select id into v_branch from public.branches where branch_code = 'royal-orchard';
  select id into v_other  from public.branches where branch_code = 'northern-bypass';
  select id into v_actor  from public.users limit 1;

  raise notice '=== D3 fixtures: branch=% actor=% ===', v_branch, v_actor;

  insert into public.restaurant_floors (id, branch_id, code, display_name)
    values (v_floor, v_branch, 'test-ground', 'Test Ground Floor');
  insert into public.service_areas (id, branch_id, floor_id, code, display_name)
    values (v_area, v_branch, v_floor, 'test-hall', 'Test Hall');

  insert into public.restaurant_tables
    (id, branch_id, floor_id, service_area_id, table_number, capacity_min, capacity_max,
     is_active, operational_status, status)
  values
    (v_t1, v_branch, v_floor, v_area, 'JT1', 2, 4, true, 'available', 'available'),
    (v_t2, v_branch, v_floor, v_area, 'JT2', 2, 4, true, 'available', 'available'),
    (v_t3, v_branch, v_floor, v_area, 'JT3', 2, 6, true, 'available', 'available'),
    (v_t4, v_branch, v_floor, v_area, 'JT4', 2, 4, true, 'available', 'available');

  -- =========================================================================
  -- Journey F — staff reservation lifecycle
  --   create → confirm → arrive → assign → seat → bill request → close → clean
  -- =========================================================================
  v_res := jsonb_build_object(
    'guest_name', 'Journey F Guest',
    'guest_phone', '+923000000001',
    'start_at', (timezone('utc', now()) + interval '2 hours')::text,
    'expected_end_at', (timezone('utc', now()) + interval '3.5 hours')::text,
    'party_size', 3,
    'reservation_status', 'pending',
    'booking_channel', 'staff'
  );
  v_result := public.create_reservation_atomic('jf-key-1', 'jf-hash-1', v_branch, v_res, '{}'::uuid[], v_actor, false);
  v_res_id := (v_result->>'id')::uuid;
  assert v_result->>'reservationNumber' like 'RES-%', 'F: reservation number issued';
  raise notice 'F: created reservation % (%).', v_result->>'reservationNumber', v_res_id;

  update public.reservations set reservation_status = 'confirmed' where id = v_res_id;
  update public.reservations set reservation_status = 'arrived', arrived_at = timezone('utc', now()) where id = v_res_id;

  -- assign table via the assignment table (GiST-protected)
  insert into public.reservation_table_assignments (reservation_id, table_id, reserved_range, assigned_by)
  values (v_res_id, v_t1,
          tstzrange(timezone('utc', now()) + interval '2 hours', timezone('utc', now()) + interval '3.5 hours'),
          v_actor);
  raise notice 'F: assigned table JT1.';

  v_result := public.seat_party_atomic(v_branch, 'reservation', v_res_id, null, array[v_t1], 3, null, v_actor, v_actor, false);
  v_session_id := (v_result->>'id')::uuid;
  assert (v_result->>'serviceStatus') = 'seated', 'F: session seated';
  select operational_status into v_status from public.restaurant_tables where id = v_t1;
  assert v_status = 'occupied', 'F: table now occupied';
  select reservation_status into v_status from public.reservations where id = v_res_id;
  assert v_status = 'seated', 'F: reservation now seated';
  raise notice 'F: seated session % ; table JT1 occupied ; reservation seated.', v_result->>'sessionNumber';

  -- bill request
  update public.dine_in_sessions set service_status = 'bill_requested', bill_requested_at = timezone('utc', now())
    where id = v_session_id;
  update public.restaurant_tables set operational_status = 'bill_requested' where id = v_t1;

  -- close (override open bill: no payment ledger — honest limitation)
  v_result := public.close_dining_session_atomic(v_session_id, v_actor, true, 'journey F close');
  select service_status into v_status from public.dine_in_sessions where id = v_session_id;
  assert v_status = 'completed', 'F: session completed';
  select operational_status into v_status from public.restaurant_tables where id = v_t1;
  assert v_status = 'cleaning', 'F: table moved to cleaning on close';
  raise notice 'F: closed session; table JT1 -> cleaning. PASS';

  -- cleaning → available (housekeeping)
  update public.restaurant_tables set operational_status = 'available', status = 'available' where id = v_t1;

  -- =========================================================================
  -- Journey G — walk-in via waitlist: waitlist → notify → seat → close
  -- =========================================================================
  insert into public.waitlist_entries (id, branch_id, guest_name, party_size, status, created_by)
    values (gen_random_uuid(), v_branch, 'Journey G Guest', 2, 'waiting', v_actor)
    returning id into v_wl;
  update public.waitlist_entries set status = 'notified', notified_at = timezone('utc', now()) where id = v_wl;

  v_result := public.seat_party_atomic(v_branch, 'waitlist', null, v_wl, array[v_t2], 2, 'Journey G Guest', v_actor, v_actor, false);
  v_session2 := (v_result->>'id')::uuid;
  select status into v_status from public.waitlist_entries where id = v_wl;
  assert v_status = 'seated', 'G: waitlist marked seated';
  raise notice 'G: waitlist seated as session % ; JT2 occupied.', v_result->>'sessionNumber';

  v_result := public.close_dining_session_atomic(v_session2, v_actor, true, 'journey G close');
  select operational_status into v_status from public.restaurant_tables where id = v_t2;
  assert v_status = 'cleaning', 'G: JT2 -> cleaning';
  update public.restaurant_tables set operational_status = 'available', status='available' where id = v_t2;
  raise notice 'G: closed. PASS';

  -- =========================================================================
  -- Journey H — table combination for a large party → seat → complete → release
  -- =========================================================================
  insert into public.table_combinations (id, branch_id, code, display_name, min_party_size, max_party_size)
    values (v_combo, v_branch, 'jt3-jt4', 'JT3+JT4', 6, 10);
  insert into public.table_combination_members (combination_id, table_id, sort_order)
    values (v_combo, v_t3, 1), (v_combo, v_t4, 2);

  v_res := jsonb_build_object(
    'guest_name', 'Journey H Party',
    'start_at', (timezone('utc', now()) + interval '2 hours')::text,
    'expected_end_at', (timezone('utc', now()) + interval '3.5 hours')::text,
    'party_size', 8,
    'reservation_status', 'confirmed',
    'booking_channel', 'staff'
  );
  v_result := public.create_reservation_atomic('jh-key-1', 'jh-hash-1', v_branch, v_res, '{}'::uuid[], v_actor, false);
  v_res_id := (v_result->>'id')::uuid;
  update public.reservations set reservation_status = 'arrived' where id = v_res_id;

  v_result := public.seat_party_atomic(v_branch, 'reservation', v_res_id, null, array[v_t3, v_t4], 8, null, v_actor, v_actor, false);
  v_session_id := (v_result->>'id')::uuid;
  assert (select count(*) from public.dining_session_tables where dine_in_session_id = v_session_id and released_at is null) = 2,
    'H: two tables attached to session';
  raise notice 'H: seated party of 8 across JT3+JT4 (combination). ';

  v_result := public.close_dining_session_atomic(v_session_id, v_actor, true, 'journey H close');
  assert (select count(*) from public.restaurant_tables where id in (v_t3, v_t4) and operational_status = 'cleaning') = 2,
    'H: both tables released to cleaning';
  update public.restaurant_tables set operational_status='available', status='available' where id in (v_t3, v_t4);
  raise notice 'H: completed and released all tables. PASS';

  -- =========================================================================
  -- Journey I — table transfer: seat at JT1 → transfer to JT2, preserve session
  -- =========================================================================
  v_result := public.seat_party_atomic(v_branch, 'walk_in', null, null, array[v_t1], 2, 'Journey I', v_actor, v_actor, false);
  v_session_id := (v_result->>'id')::uuid;
  v_result := public.transfer_session_tables_atomic(v_session_id, array[v_t2], array[v_t1], 'guest request', v_actor);
  assert (select count(*) from public.dining_session_tables where dine_in_session_id = v_session_id and table_id = v_t2 and released_at is null) = 1,
    'I: JT2 now attached';
  assert (select count(*) from public.dining_session_tables where dine_in_session_id = v_session_id and table_id = v_t1 and released_at is null) = 0,
    'I: JT1 released';
  select operational_status into v_status from public.restaurant_tables where id = v_t1;
  assert v_status = 'cleaning', 'I: old table JT1 -> cleaning';
  select operational_status into v_status from public.restaurant_tables where id = v_t2;
  assert v_status = 'occupied', 'I: new table JT2 occupied';
  raise notice 'I: session % transferred JT1 -> JT2, session preserved. PASS', v_session_id;
  perform public.close_dining_session_atomic(v_session_id, v_actor, true, 'journey I cleanup');
  update public.restaurant_tables set operational_status='available', status='available' where id in (v_t1, v_t2);

  -- =========================================================================
  -- Journey J — conflict: DB-level double-booking prevention (GiST exclusion)
  -- =========================================================================
  -- First hold on JT3 for a window
  insert into public.reservation_table_assignments (reservation_id, table_id, reserved_range, assigned_by)
  values (v_res_id, v_t3,
          tstzrange(timezone('utc', now()) + interval '5 hours', timezone('utc', now()) + interval '6 hours'),
          v_actor);
  -- Overlapping hold on the SAME table must be rejected by the exclusion constraint
  v_ok := true;
  begin
    insert into public.reservation_table_assignments (reservation_id, table_id, reserved_range, assigned_by)
    values (v_res_id, v_t3,
            tstzrange(timezone('utc', now()) + interval '5.5 hours', timezone('utc', now()) + interval '6.5 hours'),
            v_actor);
    v_ok := false; -- should not reach here
  exception when exclusion_violation then
    v_ok := true;
  end;
  assert v_ok, 'J: overlapping reservation on same table rejected by GiST exclusion';
  raise notice 'J: double-booking prevented at DB level (exclusion_violation). PASS';

  -- Double-seat: seat JT4, then attempt to seat JT4 again. The occupancy guard
  -- (operational_status) fires first (TABLE_NOT_AVAILABLE); the dining-session
  -- occupancy guard (TABLE_ALREADY_OCCUPIED) is the deeper backstop. Either one
  -- proves a table cannot be double-seated.
  v_result := public.seat_party_atomic(v_branch, 'walk_in', null, null, array[v_t4], 2, 'J seat', v_actor, v_actor, false);
  v_session_id := (v_result->>'id')::uuid;
  v_ok := false;
  begin
    perform public.seat_party_atomic(v_branch, 'walk_in', null, null, array[v_t4], 2, 'J dup', v_actor, v_actor, false);
  exception when others then
    if sqlerrm like '%TABLE_ALREADY_OCCUPIED%' or sqlerrm like '%TABLE_NOT_AVAILABLE%' then
      v_ok := true;
    else
      raise;
    end if;
  end;
  assert v_ok, 'J: second seating on an occupied table rejected';
  raise notice 'J: double-seat rejected (occupied table guard). PASS';
  perform public.close_dining_session_atomic(v_session_id, v_actor, true, 'J cleanup');
  update public.restaurant_tables set operational_status='available', status='available' where id = v_t4;

  -- =========================================================================
  -- Journey K — cross-branch denial (server-side, inside the RPC)
  -- =========================================================================
  -- Reservation in royal-orchard cannot be seated against northern-bypass branch id
  v_res := jsonb_build_object('guest_name','K','start_at',(timezone('utc',now())+interval '2 hours')::text,'expected_end_at',(timezone('utc',now())+interval '3.5 hours')::text,'party_size',2,'reservation_status','confirmed');
  v_result := public.create_reservation_atomic('jk-key-1','jk-hash-1', v_branch, v_res, '{}'::uuid[], v_actor, false);
  v_res_id := (v_result->>'id')::uuid;
  update public.reservations set reservation_status='arrived' where id = v_res_id;
  v_ok := false;
  begin
    perform public.seat_party_atomic(v_other, 'reservation', v_res_id, null, array[v_t1], 2, null, v_actor, v_actor, false);
  exception when others then
    -- northern-bypass is coming-soon → BRANCH_NOT_OPERATIONAL fires first (also valid denial)
    if sqlerrm like '%BRANCH_NOT_OPERATIONAL%' or sqlerrm like '%RESERVATION_BRANCH_MISMATCH%' then v_ok := true; else raise; end if;
  end;
  assert v_ok, 'K: cross-branch / non-operating seating denied server-side';
  raise notice 'K: cross-branch seating denied. PASS';

  -- Seating a royal-orchard reservation onto a table from another branch is denied.
  -- (northern-bypass has no tables here; simulate with a table id not in branch → TABLE_NOT_FOUND)
  v_ok := false;
  begin
    perform public.seat_party_atomic(v_branch, 'reservation', v_res_id, null, array[gen_random_uuid()], 2, null, v_actor, v_actor, false);
  exception when others then
    if sqlerrm like '%TABLE_NOT_FOUND%' then v_ok := true; else raise; end if;
  end;
  assert v_ok, 'K: unknown/foreign table rejected';
  raise notice 'K: foreign table rejected (TABLE_NOT_FOUND). PASS';

  -- =========================================================================
  -- Idempotency — same key+hash replays; same key+different hash conflicts
  -- =========================================================================
  v_res := jsonb_build_object('guest_name','Idem','start_at',(timezone('utc',now())+interval '4 hours')::text,'expected_end_at',(timezone('utc',now())+interval '5.5 hours')::text,'party_size',2,'reservation_status','pending');
  v_result := public.create_reservation_atomic('idem-key','idem-hash', v_branch, v_res, '{}'::uuid[], v_actor, false);
  v_res_id := (v_result->>'id')::uuid;
  v_result := public.create_reservation_atomic('idem-key','idem-hash', v_branch, v_res, '{}'::uuid[], v_actor, false);
  assert (v_result->>'idempotentReplay')::boolean, 'Idem: same key+hash replays';
  assert (v_result->>'id')::uuid = v_res_id, 'Idem: replay returns original id';
  raise notice 'Idem: same key+hash returned original reservation (replay). PASS';

  v_ok := false;
  begin
    perform public.create_reservation_atomic('idem-key','different-hash', v_branch, v_res, '{}'::uuid[], v_actor, false);
  exception when others then
    if sqlerrm like '%IDEMPOTENCY_CONFLICT%' then v_ok := true; else raise; end if;
  end;
  assert v_ok, 'Idem: same key + different payload conflicts';
  raise notice 'Idem: same key + changed payload -> IDEMPOTENCY_CONFLICT. PASS';

  -- =========================================================================
  -- Atomic rollback — forced failure leaves NO partial reservation
  -- =========================================================================
  declare
    v_before bigint;
    v_after bigint;
  begin
    select count(*) into v_before from public.reservations where branch_id = v_branch;
    set local telepizza.d3_force_fail = 'audit';
    v_ok := false;
    begin
      perform public.create_reservation_atomic('rb-key','rb-hash', v_branch,
        jsonb_build_object('guest_name','Rollback','start_at',(timezone('utc',now())+interval '7 hours')::text,'expected_end_at',(timezone('utc',now())+interval '8.5 hours')::text,'party_size',2,'reservation_status','pending'),
        '{}'::uuid[], v_actor, false);
    exception when others then
      v_ok := true; -- forced failure
    end;
    set local telepizza.d3_force_fail = '';
    select count(*) into v_after from public.reservations where branch_id = v_branch;
    assert v_ok, 'Rollback: forced audit failure raised';
    assert v_before = v_after, 'Rollback: no partial reservation persisted';
    raise notice 'Rollback: forced failure produced no orphan reservation (% -> %). PASS', v_before, v_after;
  end;

  raise notice '=== ALL D3 JOURNEYS PASSED (transaction will roll back) ===';
end $$;

rollback;
