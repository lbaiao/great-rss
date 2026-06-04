create or replace function public.insert_synced_articles(payload jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer := 0;
begin
  with incoming as (
    select *
    from jsonb_to_recordset(payload) as x(
      feed_id uuid,
      source text,
      title text,
      snippet text,
      content text,
      author text,
      published_at timestamptz,
      category text,
      read_time_minutes integer,
      unread boolean,
      saved boolean,
      image_url text,
      tags text[],
      url text,
      fingerprint text
    )
  ),
  inserted as (
    insert into public.articles (
      feed_id,
      source,
      title,
      snippet,
      content,
      author,
      published_at,
      category,
      read_time_minutes,
      unread,
      saved,
      image_url,
      tags,
      url,
      fingerprint
    )
    select
      feed_id,
      source,
      title,
      snippet,
      content,
      author,
      published_at,
      category,
      read_time_minutes,
      unread,
      saved,
      image_url,
      coalesce(tags, '{}'),
      url,
      fingerprint
    from incoming
    on conflict (fingerprint) do nothing
    returning 1
  )
  select count(*) into inserted_count
  from inserted;

  return inserted_count;
end;
$$;

grant execute on function public.insert_synced_articles(jsonb) to anon, authenticated, service_role;
