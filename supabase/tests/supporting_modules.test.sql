begin;

select plan(55);

insert into auth.users (id, email, raw_user_meta_data, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000011', 'modules-one@example.test', '{}', now(), now()),
  ('20000000-0000-0000-0000-000000000022', 'modules-two@example.test', '{}', now(), now()),
  ('30000000-0000-0000-0000-000000000033', 'modules-cascade@example.test', '{}', now(), now());

select has_table('public', 'tasks', 'tasks table exists');
select has_table('public', 'study_logs', 'study logs table exists');
select has_table('public', 'workout_entries', 'workout entries table exists');
select has_table('public', 'sleep_entries', 'sleep entries table exists');
select has_table('public', 'diary_entries', 'diary entries table exists');
select has_table('public', 'finance_entries', 'finance entries table exists');
select has_table('public', 'meal_entries', 'meal entries table exists');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000011', true);
set local role authenticated;

insert into public.tasks (id, user_id, title, due_date)
values ('40000000-0000-0000-0000-000000000001', auth.uid(), 'Finish chapter', '2026-09-07');
insert into public.study_logs (id, user_id, entry_date, topic, notes)
values ('40000000-0000-0000-0000-000000000002', auth.uid(), '2026-09-07', 'Databases', 'Reviewed constraints');
insert into public.workout_entries (id, user_id, entry_date, activity, minutes)
values ('40000000-0000-0000-0000-000000000003', auth.uid(), '2026-09-07', 'Walking', 30);
insert into public.sleep_entries (id, user_id, entry_date, minutes)
values ('40000000-0000-0000-0000-000000000004', auth.uid(), '2026-09-07', 480);
insert into public.diary_entries (id, user_id, entry_date, content)
values ('40000000-0000-0000-0000-000000000005', auth.uid(), '2026-09-07', 'A calm day.');
insert into public.finance_entries (id, user_id, entry_date, label, amount_cents)
values ('40000000-0000-0000-0000-000000000006', auth.uid(), '2026-09-07', 'Lunch', -1295);
insert into public.meal_entries (user_id, entry_date, meal_type, food, has_produce, has_protein)
values (auth.uid(), '2026-09-07', 'lunch', 'Rice bowl', true, true);

select throws_ok(
  $$insert into public.tasks (user_id, title) values (auth.uid(), '')$$,
  '23514', null, 'empty task titles are rejected'
);
select throws_ok(
  $$insert into public.tasks (user_id, title) values (auth.uid(), repeat('a', 241))$$,
  '23514', null, 'task titles over 240 characters are rejected'
);
select throws_ok(
  $$insert into public.study_logs (user_id, entry_date, topic) values (auth.uid(), current_date, '')$$,
  '23514', null, 'empty study topics are rejected'
);
select throws_ok(
  $$insert into public.study_logs (user_id, entry_date, topic) values (auth.uid(), current_date, repeat('a', 241))$$,
  '23514', null, 'study topics over 240 characters are rejected'
);
select throws_ok(
  $$insert into public.study_logs (user_id, entry_date, topic, notes) values (auth.uid(), current_date, 'SQL', repeat('a', 2001))$$,
  '23514', null, 'study notes over 2000 characters are rejected'
);
select throws_ok(
  $$insert into public.workout_entries (user_id, entry_date, activity, minutes) values (auth.uid(), current_date, '', 30)$$,
  '23514', null, 'empty workout activities are rejected'
);
select throws_ok(
  $$insert into public.workout_entries (user_id, entry_date, activity, minutes) values (auth.uid(), current_date, repeat('a', 121), 30)$$,
  '23514', null, 'workout activities over 120 characters are rejected'
);
select throws_ok(
  $$insert into public.workout_entries (user_id, entry_date, activity, minutes) values (auth.uid(), current_date, 'Walking', -1)$$,
  '23514', null, 'negative workout minutes are rejected'
);
select throws_ok(
  $$insert into public.workout_entries (user_id, entry_date, activity, minutes) values (auth.uid(), current_date, 'Walking', 1441)$$,
  '23514', null, 'workout minutes over one day are rejected'
);
select throws_ok(
  $$insert into public.sleep_entries (user_id, entry_date, minutes) values (auth.uid(), current_date, -1)$$,
  '23514', null, 'negative sleep minutes are rejected'
);
select throws_ok(
  $$insert into public.sleep_entries (user_id, entry_date, minutes) values (auth.uid(), current_date, 1441)$$,
  '23514', null, 'sleep minutes over one day are rejected'
);
select throws_ok(
  $$insert into public.diary_entries (user_id, entry_date, content) values (auth.uid(), current_date, '')$$,
  '23514', null, 'empty diary entries are rejected'
);
select throws_ok(
  $$insert into public.diary_entries (user_id, entry_date, content) values (auth.uid(), current_date, repeat('a', 5001))$$,
  '23514', null, 'diary entries over 5000 characters are rejected'
);
select throws_ok(
  $$insert into public.finance_entries (user_id, entry_date, label, amount_cents) values (auth.uid(), current_date, '', 0)$$,
  '23514', null, 'empty finance labels are rejected'
);
select throws_ok(
  $$insert into public.finance_entries (user_id, entry_date, label, amount_cents) values (auth.uid(), current_date, repeat('a', 161), 0)$$,
  '23514', null, 'finance labels over 160 characters are rejected'
);
select throws_ok(
  $$insert into public.finance_entries (user_id, entry_date, label, amount_cents) values (auth.uid(), current_date, 'Large debit', -100000001)$$,
  '23514', null, 'finance debits below the allowed range are rejected'
);
select throws_ok(
  $$insert into public.finance_entries (user_id, entry_date, label, amount_cents) values (auth.uid(), current_date, 'Large credit', 100000001)$$,
  '23514', null, 'finance credits above the allowed range are rejected'
);
select throws_ok(
  $$insert into public.meal_entries (user_id, entry_date, meal_type, food) values (auth.uid(), current_date, 'lunch', '')$$,
  '23514', null, 'blank meal foods are rejected'
);
select throws_ok(
  $$insert into public.meal_entries (user_id, entry_date, meal_type, food) values (auth.uid(), current_date, 'brunch', 'Toast')$$,
  '23514', null, 'invalid meal types are rejected'
);
select is((select count(*)::integer from public.meal_entries), 1, 'user one can read their meals');

select throws_ok(
  $$insert into public.workout_entries (user_id, entry_date, activity, minutes) values (auth.uid(), '2026-09-07', 'Running', 20)$$,
  '23505', null, 'one workout entry per user and day'
);
select throws_ok(
  $$insert into public.sleep_entries (user_id, entry_date, minutes) values (auth.uid(), '2026-09-07', 420)$$,
  '23505', null, 'one sleep entry per user and day'
);
select throws_ok(
  $$insert into public.diary_entries (user_id, entry_date, content) values (auth.uid(), '2026-09-07', 'A duplicate day.')$$,
  '23505', null, 'one diary entry per user and day'
);

update public.tasks set updated_at = '2000-01-01' where id = '40000000-0000-0000-0000-000000000001';
select ok((select updated_at > '2001-01-01'::timestamptz from public.tasks where id = '40000000-0000-0000-0000-000000000001'), 'task updates refresh updated_at');
update public.study_logs set updated_at = '2000-01-01' where id = '40000000-0000-0000-0000-000000000002';
select ok((select updated_at > '2001-01-01'::timestamptz from public.study_logs where id = '40000000-0000-0000-0000-000000000002'), 'study log updates refresh updated_at');
update public.workout_entries set updated_at = '2000-01-01' where id = '40000000-0000-0000-0000-000000000003';
select ok((select updated_at > '2001-01-01'::timestamptz from public.workout_entries where id = '40000000-0000-0000-0000-000000000003'), 'workout updates refresh updated_at');
update public.sleep_entries set updated_at = '2000-01-01' where id = '40000000-0000-0000-0000-000000000004';
select ok((select updated_at > '2001-01-01'::timestamptz from public.sleep_entries where id = '40000000-0000-0000-0000-000000000004'), 'sleep updates refresh updated_at');
update public.diary_entries set updated_at = '2000-01-01' where id = '40000000-0000-0000-0000-000000000005';
select ok((select updated_at > '2001-01-01'::timestamptz from public.diary_entries where id = '40000000-0000-0000-0000-000000000005'), 'diary updates refresh updated_at');
update public.finance_entries set updated_at = '2000-01-01' where id = '40000000-0000-0000-0000-000000000006';
select ok((select updated_at > '2001-01-01'::timestamptz from public.finance_entries where id = '40000000-0000-0000-0000-000000000006'), 'finance updates refresh updated_at');

reset role;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000022', true);
set local role authenticated;
select is((select count(*)::integer from public.tasks), 0, 'user two cannot select user-one tasks');
select is((select count(*)::integer from public.meal_entries), 0, 'user two cannot select user-one meals');
select throws_ok(
  $$insert into public.tasks (user_id, title) values ('10000000-0000-0000-0000-000000000011', 'Not mine')$$,
  '42501', null, 'user two cannot insert for user one'
);
select is(
  (with changed as (
    update public.tasks set title = 'Changed' where id = '40000000-0000-0000-0000-000000000001' returning id
  ) select count(*)::integer from changed),
  0, 'user two cannot update user-one tasks'
);
select is(
  (with deleted as (
    delete from public.tasks where id = '40000000-0000-0000-0000-000000000001' returning id
  ) select count(*)::integer from deleted),
  0, 'user two cannot delete user-one tasks'
);

reset role;
set local role anon;
select throws_ok($$select * from public.tasks$$, '42501', null, 'anonymous users cannot select tasks');
select throws_ok($$select * from public.study_logs$$, '42501', null, 'anonymous users cannot select study logs');
select throws_ok($$select * from public.workout_entries$$, '42501', null, 'anonymous users cannot select workout entries');
select throws_ok($$select * from public.sleep_entries$$, '42501', null, 'anonymous users cannot select sleep entries');
select throws_ok($$select * from public.diary_entries$$, '42501', null, 'anonymous users cannot select diary entries');
select throws_ok($$select * from public.finance_entries$$, '42501', null, 'anonymous users cannot select finance entries');
select throws_ok($$select * from public.meal_entries$$, '42501', null, 'anonymous users cannot select meal entries');

reset role;
insert into public.tasks (user_id, title) values ('30000000-0000-0000-0000-000000000033', 'Cascade task');
insert into public.study_logs (user_id, entry_date, topic) values ('30000000-0000-0000-0000-000000000033', '2026-09-07', 'Cascade study');
insert into public.workout_entries (user_id, entry_date, activity, minutes) values ('30000000-0000-0000-0000-000000000033', '2026-09-07', 'Cascade workout', 1);
insert into public.sleep_entries (user_id, entry_date, minutes) values ('30000000-0000-0000-0000-000000000033', '2026-09-07', 1);
insert into public.diary_entries (user_id, entry_date, content) values ('30000000-0000-0000-0000-000000000033', '2026-09-07', 'Cascade diary');
insert into public.finance_entries (user_id, entry_date, label, amount_cents) values ('30000000-0000-0000-0000-000000000033', '2026-09-07', 'Cascade finance', 1);
insert into public.meal_entries (user_id, entry_date, meal_type, food) values ('30000000-0000-0000-0000-000000000033', '2026-09-07', 'dinner', 'Cascade meal');
delete from auth.users where id = '30000000-0000-0000-0000-000000000033';
select is((select count(*)::integer from public.tasks where user_id = '30000000-0000-0000-0000-000000000033'), 0, 'auth deletion cascades to tasks');
select is((select count(*)::integer from public.study_logs where user_id = '30000000-0000-0000-0000-000000000033'), 0, 'auth deletion cascades to study logs');
select is((select count(*)::integer from public.workout_entries where user_id = '30000000-0000-0000-0000-000000000033'), 0, 'auth deletion cascades to workout entries');
select is((select count(*)::integer from public.sleep_entries where user_id = '30000000-0000-0000-0000-000000000033'), 0, 'auth deletion cascades to sleep entries');
select is((select count(*)::integer from public.diary_entries where user_id = '30000000-0000-0000-0000-000000000033'), 0, 'auth deletion cascades to diary entries');
select is((select count(*)::integer from public.finance_entries where user_id = '30000000-0000-0000-0000-000000000033'), 0, 'auth deletion cascades to finance entries');
select is((select count(*)::integer from public.meal_entries where user_id = '30000000-0000-0000-0000-000000000033'), 0, 'auth deletion cascades to meal entries');

select * from finish();
rollback;
