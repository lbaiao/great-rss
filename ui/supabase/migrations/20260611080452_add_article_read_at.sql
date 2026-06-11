alter table public.user_article_states
add column if not exists read_at timestamptz;

update public.user_article_states
set read_at = updated_at
where unread = false
  and read_at is null;

create index if not exists user_article_states_read_at_idx
on public.user_article_states (user_id, read_at desc)
where read_at is not null;
