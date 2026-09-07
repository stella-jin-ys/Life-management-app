create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 240),
  due_date date,
  is_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.study_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  topic text not null check (char_length(btrim(topic)) between 1 and 240),
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workout_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  activity text not null check (char_length(btrim(activity)) between 1 and 120),
  minutes integer not null check (minutes between 0 and 1440),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create table public.sleep_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  minutes integer not null check (minutes between 0 and 1440),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create table public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  content text not null check (char_length(btrim(content)) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

create table public.finance_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  label text not null check (char_length(btrim(label)) between 1 and 160),
  amount_cents integer not null check (amount_cents between -100000000 and 100000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_user_due_date_idx on public.tasks(user_id, due_date);
create index study_logs_user_entry_date_idx on public.study_logs(user_id, entry_date);
create index workout_entries_user_entry_date_idx on public.workout_entries(user_id, entry_date);
create index sleep_entries_user_entry_date_idx on public.sleep_entries(user_id, entry_date);
create index diary_entries_user_entry_date_idx on public.diary_entries(user_id, entry_date);
create index finance_entries_user_entry_date_idx on public.finance_entries(user_id, entry_date);

create trigger tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create trigger study_logs_updated_at
before update on public.study_logs
for each row execute function public.set_updated_at();

create trigger workout_entries_updated_at
before update on public.workout_entries
for each row execute function public.set_updated_at();

create trigger sleep_entries_updated_at
before update on public.sleep_entries
for each row execute function public.set_updated_at();

create trigger diary_entries_updated_at
before update on public.diary_entries
for each row execute function public.set_updated_at();

create trigger finance_entries_updated_at
before update on public.finance_entries
for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;
alter table public.study_logs enable row level security;
alter table public.workout_entries enable row level security;
alter table public.sleep_entries enable row level security;
alter table public.diary_entries enable row level security;
alter table public.finance_entries enable row level security;

revoke all on public.tasks, public.study_logs, public.workout_entries,
  public.sleep_entries, public.diary_entries, public.finance_entries
  from anon, public;

grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.study_logs to authenticated;
grant select, insert, update, delete on public.workout_entries to authenticated;
grant select, insert, update, delete on public.sleep_entries to authenticated;
grant select, insert, update, delete on public.diary_entries to authenticated;
grant select, insert, update, delete on public.finance_entries to authenticated;

create policy tasks_select_own on public.tasks
for select to authenticated using (user_id = auth.uid());
create policy tasks_insert_own on public.tasks
for insert to authenticated with check (user_id = auth.uid());
create policy tasks_update_own on public.tasks
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy tasks_delete_own on public.tasks
for delete to authenticated using (user_id = auth.uid());

create policy study_logs_select_own on public.study_logs
for select to authenticated using (user_id = auth.uid());
create policy study_logs_insert_own on public.study_logs
for insert to authenticated with check (user_id = auth.uid());
create policy study_logs_update_own on public.study_logs
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy study_logs_delete_own on public.study_logs
for delete to authenticated using (user_id = auth.uid());

create policy workout_entries_select_own on public.workout_entries
for select to authenticated using (user_id = auth.uid());
create policy workout_entries_insert_own on public.workout_entries
for insert to authenticated with check (user_id = auth.uid());
create policy workout_entries_update_own on public.workout_entries
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy workout_entries_delete_own on public.workout_entries
for delete to authenticated using (user_id = auth.uid());

create policy sleep_entries_select_own on public.sleep_entries
for select to authenticated using (user_id = auth.uid());
create policy sleep_entries_insert_own on public.sleep_entries
for insert to authenticated with check (user_id = auth.uid());
create policy sleep_entries_update_own on public.sleep_entries
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy sleep_entries_delete_own on public.sleep_entries
for delete to authenticated using (user_id = auth.uid());

create policy diary_entries_select_own on public.diary_entries
for select to authenticated using (user_id = auth.uid());
create policy diary_entries_insert_own on public.diary_entries
for insert to authenticated with check (user_id = auth.uid());
create policy diary_entries_update_own on public.diary_entries
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy diary_entries_delete_own on public.diary_entries
for delete to authenticated using (user_id = auth.uid());

create policy finance_entries_select_own on public.finance_entries
for select to authenticated using (user_id = auth.uid());
create policy finance_entries_insert_own on public.finance_entries
for insert to authenticated with check (user_id = auth.uid());
create policy finance_entries_update_own on public.finance_entries
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy finance_entries_delete_own on public.finance_entries
for delete to authenticated using (user_id = auth.uid());
