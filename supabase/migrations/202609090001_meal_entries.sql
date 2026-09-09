create table public.meal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null default current_date,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  food text not null check (char_length(btrim(food)) between 1 and 240),
  has_produce boolean not null default false,
  has_protein boolean not null default false,
  has_carbohydrate boolean not null default false,
  has_healthy_fat boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index meal_entries_user_date_idx on public.meal_entries(user_id, entry_date, created_at desc);

create trigger meal_entries_updated_at
before update on public.meal_entries
for each row execute function public.set_updated_at();

alter table public.meal_entries enable row level security;

revoke all on public.meal_entries from anon, public;
grant select, insert, update, delete on public.meal_entries to authenticated;

create policy meal_entries_select_own on public.meal_entries
for select to authenticated using (user_id = auth.uid());
create policy meal_entries_insert_own on public.meal_entries
for insert to authenticated with check (user_id = auth.uid());
create policy meal_entries_update_own on public.meal_entries
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy meal_entries_delete_own on public.meal_entries
for delete to authenticated using (user_id = auth.uid());
