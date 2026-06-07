grant delete on public.feeds to authenticated;

drop policy if exists "users can delete own feeds" on public.feeds;
create policy "users can delete own feeds"
on public.feeds
for delete
to authenticated
using ((select auth.uid()) = user_id);
