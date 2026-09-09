-- Keep compliment fields server-owned while allowing users to manage their own
-- highlight content from the dashboard.
grant update (content), delete on public.highlights to authenticated;

create policy highlights_update_own on public.highlights
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy highlights_delete_own on public.highlights
for delete to authenticated using (user_id = auth.uid());
