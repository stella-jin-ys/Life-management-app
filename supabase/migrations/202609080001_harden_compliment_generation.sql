-- Compliment generation is append-only from the browser. Attempts and
-- compliment writes are performed by security-definer functions so a client
-- cannot reset the hourly cap or rewrite a pending attempt.
create table public.compliment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  highlight_id uuid not null unique references public.highlights(id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create index compliment_attempts_user_time_idx
  on public.compliment_attempts(user_id, attempted_at desc);

alter table public.compliment_attempts enable row level security;
revoke all on public.compliment_attempts from anon, authenticated, public;

-- Existing installations may already have attempt timestamps. Preserve them in
-- the server-owned ledger before preventing client mutation of those columns.
insert into public.compliment_attempts (user_id, highlight_id, attempted_at)
select user_id, id, compliment_attempted_at
from public.highlights
where compliment_attempted_at is not null
on conflict (highlight_id) do nothing;

revoke insert, update, delete on public.highlights from authenticated;
grant insert (user_id, content) on public.highlights to authenticated;
drop policy if exists highlights_update_own on public.highlights;
drop policy if exists highlights_delete_own on public.highlights;

create or replace function public.claim_compliment_generation(p_highlight_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claimed boolean := false;
begin
  perform pg_advisory_xact_lock(hashtextextended(coalesce(auth.uid()::text, ''), 0));

  if auth.uid() is null
    or not exists (
      select 1 from public.highlights
      where id = p_highlight_id and user_id = auth.uid()
        and compliment_status = 'pending'
    )
    or exists (
      select 1 from public.compliment_attempts
      where highlight_id = p_highlight_id
    )
    or (
      select count(*) from public.compliment_attempts
      where user_id = auth.uid()
        and attempted_at >= now() - interval '1 hour'
    ) >= 20 then
    return false;
  end if;

  insert into public.compliment_attempts (user_id, highlight_id)
  values (auth.uid(), p_highlight_id);
  return true;
end;
$$;

create or replace function public.finalize_compliment_generation(
  p_highlight_id uuid,
  p_compliment text,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_status not in ('complete', 'fallback')
    or char_length(btrim(coalesce(p_compliment, ''))) not between 1 and 500
    or not exists (
      select 1 from public.compliment_attempts
      where highlight_id = p_highlight_id and user_id = auth.uid()
    ) then
    return false;
  end if;

  update public.highlights
  set compliment = btrim(p_compliment),
      compliment_status = p_status,
      compliment_attempted_at = coalesce(compliment_attempted_at, now()),
      updated_at = now()
  where id = p_highlight_id and user_id = auth.uid();
  return found;
end;
$$;

revoke all on function public.claim_compliment_generation(uuid) from public, anon;
grant execute on function public.claim_compliment_generation(uuid) to authenticated;
revoke all on function public.finalize_compliment_generation(uuid, text, text) from public, anon;
grant execute on function public.finalize_compliment_generation(uuid, text, text) to authenticated;
