revoke all on public.feeds from anon, authenticated;
revoke all on public.articles from anon, authenticated;
revoke all on public.user_article_states from anon, authenticated;

grant select, insert on public.feeds to authenticated;
grant select on public.articles to authenticated;
grant select, insert, update, delete on public.user_article_states to authenticated;

drop policy if exists "authenticated can read feeds" on public.feeds;
drop policy if exists "users can read own feeds" on public.feeds;
create policy "users can read own feeds"
on public.feeds
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "authenticated can add feeds" on public.feeds;
drop policy if exists "users can add own feeds" on public.feeds;
create policy "users can add own feeds"
on public.feeds
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and url ~* '^https?://'
);

drop policy if exists "authenticated can read articles" on public.articles;
drop policy if exists "users can read own articles" on public.articles;
create policy "users can read own articles"
on public.articles
for select
to authenticated
using ((select auth.uid()) = user_id);
