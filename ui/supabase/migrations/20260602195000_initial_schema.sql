create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.feeds (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  name text not null,
  category text not null default 'General',
  status text not null default 'idle' check (status in ('idle', 'syncing', 'live', 'error')),
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  feed_id uuid not null references public.feeds(id) on delete cascade,
  source text not null,
  title text not null,
  snippet text not null default '',
  content text not null default '',
  author text not null default '',
  published_at timestamptz not null,
  category text not null default 'General',
  read_time_minutes integer not null default 1 check (read_time_minutes > 0),
  unread boolean not null default true,
  saved boolean not null default false,
  image_url text,
  tags text[] not null default '{}',
  url text not null,
  fingerprint text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists feeds_status_idx on public.feeds (status);
create index if not exists articles_feed_id_idx on public.articles (feed_id);
create index if not exists articles_published_at_idx on public.articles (published_at desc);
create index if not exists articles_category_idx on public.articles (category);
create index if not exists articles_unread_idx on public.articles (unread);
create index if not exists articles_saved_idx on public.articles (saved);

drop trigger if exists feeds_set_updated_at on public.feeds;
create trigger feeds_set_updated_at
before update on public.feeds
for each row
execute function public.set_updated_at();

drop trigger if exists articles_set_updated_at on public.articles;
create trigger articles_set_updated_at
before update on public.articles
for each row
execute function public.set_updated_at();

alter table public.feeds enable row level security;
alter table public.articles enable row level security;

drop policy if exists "dev public feed access" on public.feeds;
create policy "dev public feed access"
on public.feeds
for all
using (true)
with check (true);

drop policy if exists "dev public article access" on public.articles;
create policy "dev public article access"
on public.articles
for all
using (true)
with check (true);
