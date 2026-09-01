create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mood_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  mood text not null check (mood in ('bright', 'steady', 'tender', 'heavy')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create table public.highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 500),
  compliment text,
  compliment_status text not null default 'pending'
    check (compliment_status in ('pending', 'complete', 'fallback')),
  compliment_attempted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.feeling_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feeling text not null check (feeling in ('drained', 'overwhelmed', 'lonely', 'restless')),
  created_at timestamptz not null default now()
);

create table public.health_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  hydration_glasses integer not null default 0 check (hydration_glasses between 0 and 30),
  nourishing_meals integer not null default 0 check (nourishing_meals between 0 and 12),
  sleep_minutes integer not null default 0 check (sleep_minutes between 0 and 1440),
  movement_minutes integer not null default 0 check (movement_minutes between 0 and 1440),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  why text not null default '' check (char_length(why) <= 500),
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  label text not null check (char_length(btrim(label)) between 1 and 240),
  position integer not null default 0 check (position >= 0),
  is_complete boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index mood_entries_user_id_idx on public.mood_entries(user_id);
create index highlights_user_id_idx on public.highlights(user_id, created_at desc);
create index feeling_checkins_user_feeling_idx on public.feeling_checkins(user_id, feeling);
create index feeling_checkins_created_feeling_idx on public.feeling_checkins(created_at, feeling);
create index health_entries_user_id_idx on public.health_entries(user_id);
create index goals_user_status_idx on public.goals(user_id, status);
create index milestones_goal_position_idx on public.milestones(goal_id, position);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  submitted_timezone text := nullif(new.raw_user_meta_data ->> 'timezone', '');
  display_name text := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'Friend'
  );
begin
  insert into public.profiles (id, display_name, timezone)
  values (
    new.id,
    display_name,
    case
      when submitted_timezone is not null
        and exists (select 1 from pg_timezone_names where name = submitted_timezone)
        then submitted_timezone
      else 'UTC'
    end
  );
  return new;
end;
$$;

create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger mood_entries_updated_at
before update on public.mood_entries
for each row execute function public.set_updated_at();

create trigger highlights_updated_at
before update on public.highlights
for each row execute function public.set_updated_at();

create trigger health_entries_updated_at
before update on public.health_entries
for each row execute function public.set_updated_at();

create trigger goals_updated_at
before update on public.goals
for each row execute function public.set_updated_at();

create trigger milestones_updated_at
before update on public.milestones
for each row execute function public.set_updated_at();

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.mood_entries enable row level security;
alter table public.highlights enable row level security;
alter table public.feeling_checkins enable row level security;
alter table public.health_entries enable row level security;
alter table public.goals enable row level security;
alter table public.milestones enable row level security;

revoke all on public.profiles, public.mood_entries, public.highlights,
  public.feeling_checkins, public.health_entries, public.goals, public.milestones
  from anon, public;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.mood_entries to authenticated;
grant select, insert, update, delete on public.highlights to authenticated;
grant select, insert, update, delete on public.feeling_checkins to authenticated;
grant select, insert, update, delete on public.health_entries to authenticated;
grant select, insert, update, delete on public.goals to authenticated;
grant select, insert, update, delete on public.milestones to authenticated;

create policy profiles_select_own on public.profiles
for select to authenticated using (id = auth.uid());
create policy profiles_update_own on public.profiles
for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy mood_entries_select_own on public.mood_entries
for select to authenticated using (user_id = auth.uid());
create policy mood_entries_insert_own on public.mood_entries
for insert to authenticated with check (user_id = auth.uid());
create policy mood_entries_update_own on public.mood_entries
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy mood_entries_delete_own on public.mood_entries
for delete to authenticated using (user_id = auth.uid());

create policy highlights_select_own on public.highlights
for select to authenticated using (user_id = auth.uid());
create policy highlights_insert_own on public.highlights
for insert to authenticated with check (user_id = auth.uid());
create policy highlights_update_own on public.highlights
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy highlights_delete_own on public.highlights
for delete to authenticated using (user_id = auth.uid());

create policy feeling_checkins_select_own on public.feeling_checkins
for select to authenticated using (user_id = auth.uid());
create policy feeling_checkins_insert_own on public.feeling_checkins
for insert to authenticated with check (user_id = auth.uid());
create policy feeling_checkins_update_own on public.feeling_checkins
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy feeling_checkins_delete_own on public.feeling_checkins
for delete to authenticated using (user_id = auth.uid());

create policy health_entries_select_own on public.health_entries
for select to authenticated using (user_id = auth.uid());
create policy health_entries_insert_own on public.health_entries
for insert to authenticated with check (user_id = auth.uid());
create policy health_entries_update_own on public.health_entries
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy health_entries_delete_own on public.health_entries
for delete to authenticated using (user_id = auth.uid());

create policy goals_select_own on public.goals
for select to authenticated using (user_id = auth.uid());
create policy goals_insert_own on public.goals
for insert to authenticated with check (user_id = auth.uid());
create policy goals_update_own on public.goals
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy goals_delete_own on public.goals
for delete to authenticated using (user_id = auth.uid());

create policy milestones_select_own on public.milestones
for select to authenticated using (
  exists (select 1 from public.goals where goals.id = milestones.goal_id and goals.user_id = auth.uid())
);
create policy milestones_insert_own on public.milestones
for insert to authenticated with check (
  exists (select 1 from public.goals where goals.id = milestones.goal_id and goals.user_id = auth.uid())
);
create policy milestones_update_own on public.milestones
for update to authenticated using (
  exists (select 1 from public.goals where goals.id = milestones.goal_id and goals.user_id = auth.uid())
) with check (
  exists (select 1 from public.goals where goals.id = milestones.goal_id and goals.user_id = auth.uid())
);
create policy milestones_delete_own on public.milestones
for delete to authenticated using (
  exists (select 1 from public.goals where goals.id = milestones.goal_id and goals.user_id = auth.uid())
);

create or replace function public.get_comfort_signal(p_feeling text)
returns table(status text, percentage integer, total_count bigint)
language sql
security definer
set search_path = public, pg_temp
as $$
  with recent as (
    select feeling from public.feeling_checkins
    where created_at >= now() - interval '30 days'
  ), counts as (
    select count(*)::bigint as total,
      count(*) filter (where feeling = p_feeling)::bigint as matching
    from recent
  )
  select
    case
      when p_feeling is null or p_feeling not in ('drained', 'overwhelmed', 'lonely', 'restless') then 'invalid'
      when total < 10 then 'insufficient_data'
      else 'available'
    end,
    case
      when total >= 10 and p_feeling in ('drained', 'overwhelmed', 'lonely', 'restless')
        then round(matching * 100.0 / total)::integer
      else null
    end,
    case when total >= 10 then total end
  from counts;
$$;

create or replace function public.claim_compliment_generation(p_highlight_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  with claimed as (
    update public.highlights
    set compliment_attempted_at = now()
    where id = p_highlight_id
      and user_id = auth.uid()
      and compliment_status = 'pending'
      and compliment_attempted_at is null
      and (
        select count(*) from public.highlights recent
        where recent.user_id = auth.uid()
          and recent.compliment_attempted_at >= now() - interval '1 hour'
      ) < 20
    returning id
  )
  select exists (select 1 from claimed);
$$;

revoke all on function public.get_comfort_signal(text) from public, anon;
grant execute on function public.get_comfort_signal(text) to authenticated;
revoke all on function public.claim_compliment_generation(uuid) from public, anon;
grant execute on function public.claim_compliment_generation(uuid) to authenticated;
