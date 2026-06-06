alter table public.feeds
add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.articles
add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists feeds_user_id_idx
on public.feeds (user_id);

create index if not exists feeds_user_id_created_at_idx
on public.feeds (user_id, created_at);

create index if not exists articles_user_id_published_at_idx
on public.articles (user_id, published_at desc);

create index if not exists articles_user_id_category_idx
on public.articles (user_id, category);

alter table public.feeds
drop constraint if exists feeds_url_key;

create unique index if not exists feeds_user_id_url_key
on public.feeds (user_id, url);

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

drop policy if exists "users can read article states" on public.user_article_states;
drop policy if exists "users can read own article states" on public.user_article_states;
create policy "users can read own article states"
on public.user_article_states
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.articles
    where articles.id = user_article_states.article_id
      and articles.user_id = (select auth.uid())
  )
);

drop policy if exists "users can insert article states" on public.user_article_states;
drop policy if exists "users can insert own article states" on public.user_article_states;
create policy "users can insert own article states"
on public.user_article_states
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.articles
    where articles.id = user_article_states.article_id
      and articles.user_id = (select auth.uid())
  )
);

drop policy if exists "users can delete article states" on public.user_article_states;
drop policy if exists "users can delete own article states" on public.user_article_states;
create policy "users can delete own article states"
on public.user_article_states
for delete
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.articles
    where articles.id = user_article_states.article_id
      and articles.user_id = (select auth.uid())
  )
);

drop policy if exists "users can update article states" on public.user_article_states;
drop policy if exists "users can update own article states" on public.user_article_states;
create policy "users can update own article states"
on public.user_article_states
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.articles
    where articles.id = user_article_states.article_id
      and articles.user_id = (select auth.uid())
  )
);
