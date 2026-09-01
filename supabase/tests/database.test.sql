begin;

select plan(18);

insert into auth.users (id, email, raw_user_meta_data, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', 'one@example.test', '{"display_name":"One","timezone":"Europe/Stockholm"}', now(), now()),
  ('20000000-0000-0000-0000-000000000002', 'two@example.test', '{"display_name":"Two"}', now(), now());

select has_table('public', 'highlights', 'highlights table exists');
select has_function('public', 'get_comfort_signal', array['text'], 'comfort signal RPC exists');
select is((select display_name from public.profiles where id = '10000000-0000-0000-0000-000000000001'), 'One', 'signup trigger creates a profile');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select lives_ok(
  $$insert into public.highlights (user_id, content) values (auth.uid(), 'A private win')$$,
  'user one can insert their highlight'
);
select throws_ok(
  $$insert into public.highlights (user_id, content) values ('20000000-0000-0000-0000-000000000002', 'Not mine')$$,
  '42501', null, 'user one cannot insert for user two'
);
select throws_ok(
  $$insert into public.mood_entries (user_id, entry_date, mood) values (auth.uid(), current_date, 'steady');
    insert into public.mood_entries (user_id, entry_date, mood) values (auth.uid(), current_date, 'bright')$$,
  '23505', null, 'one mood entry per user and day'
);
select throws_ok(
  $$insert into public.health_entries (user_id, entry_date, hydration_glasses) values (auth.uid(), current_date, -1)$$,
  '23514', null, 'negative health values are rejected'
);

reset role;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
set local role authenticated;
select is((select count(*)::integer from public.highlights), 0, 'user two sees no user-one highlights');
select throws_ok(
  $$update public.highlights set content = 'changed' where content = 'A private win'$$,
  '42501', null, 'user two cannot update user-one data'
);
select throws_ok(
  $$delete from public.highlights where content = 'A private win'$$,
  '42501', null, 'user two cannot delete user-one data'
);

reset role;
insert into public.goals (id, user_id, title) values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'One goal');
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
set local role authenticated;
select throws_ok(
  $$insert into public.milestones (goal_id, label) values ('30000000-0000-0000-0000-000000000001', 'Not mine')$$,
  '42501', null, 'user two cannot add a milestone to user-one goal'
);

select is((select status from public.get_comfort_signal('drained')), 'insufficient_data', 'small cohorts are suppressed');

reset role;
insert into public.feeling_checkins (user_id, feeling)
select '10000000-0000-0000-0000-000000000001', case when series <= 7 then 'drained' else 'lonely' end
from generate_series(1, 10) as generated(series);
select is((select percentage from public.get_comfort_signal('drained')), 70, 'aggregate percentage is rounded and cohort-only');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
set local role authenticated;
select is(public.claim_compliment_generation((select id from public.highlights limit 1)), true, 'highlight generation can be claimed once');
select is(public.claim_compliment_generation((select id from public.highlights limit 1)), false, 'highlight generation cannot be claimed twice');

reset role;
insert into public.highlights (user_id, content, compliment_attempted_at)
select '10000000-0000-0000-0000-000000000001', 'Rate limit fixture ' || series, now()
from generate_series(1, 19) as generated(series);
insert into public.highlights (id, user_id, content)
values ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Rate limit target');
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
set local role authenticated;
select is(public.claim_compliment_generation('40000000-0000-0000-0000-000000000001'), false, 'the hourly compliment cap rejects the 21st attempt');

reset role;
delete from auth.users where id = '20000000-0000-0000-0000-000000000002';
select is((select count(*)::integer from public.profiles where id = '20000000-0000-0000-0000-000000000002'), 0, 'auth deletion cascades to profiles');
select is((select count(*)::integer from public.goals where user_id = '20000000-0000-0000-0000-000000000002'), 0, 'auth deletion cascades to user data');

select * from finish();
rollback;
