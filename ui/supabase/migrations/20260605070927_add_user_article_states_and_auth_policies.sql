create table if not exists public.user_article_states (
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id uuid not null references public.articles(id) on delete cascade,
  unread boolean not null default true,
  saved boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, article_id)
);

create index if not exists user_article_states_article_id_idx
on public.user_article_states (article_id);

create index if not exists user_article_states_unread_idx
on public.user_article_states (user_id, unread);

create index if not exists user_article_states_saved_idx
on public.user_article_states (user_id, saved);

drop trigger if exists user_article_states_set_updated_at on public.user_article_states;
create trigger user_article_states_set_updated_at
before update on public.user_article_states
for each row
execute function public.set_updated_at();

alter table public.user_article_states enable row level security;

drop policy if exists "dev public feed access" on public.feeds;
drop policy if exists "dev public article access" on public.articles;

drop policy if exists "authenticated can read feeds" on public.feeds;
create policy "authenticated can read feeds"
on public.feeds
for select
to authenticated
using (true);

drop policy if exists "authenticated can add feeds" on public.feeds;
create policy "authenticated can add feeds"
on public.feeds
for insert
to authenticated
with check (url ~* '^https?://');

drop policy if exists "authenticated can read articles" on public.articles;
create policy "authenticated can read articles"
on public.articles
for select
to authenticated
using (true);

drop policy if exists "users can read article states" on public.user_article_states;
create policy "users can read article states"
on public.user_article_states
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "users can insert article states" on public.user_article_states;
create policy "users can insert article states"
on public.user_article_states
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "users can update article states" on public.user_article_states;
create policy "users can update article states"
on public.user_article_states
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "users can delete article states" on public.user_article_states;
create policy "users can delete article states"
on public.user_article_states
for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.feeds from anon, authenticated;
revoke all on public.articles from anon, authenticated;
revoke all on public.user_article_states from anon, authenticated;

grant select, insert on public.feeds to authenticated;
grant select on public.articles to authenticated;
grant select, insert, update, delete on public.user_article_states to authenticated;
