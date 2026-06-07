update public.articles
set user_id = feeds.user_id
from public.feeds
where articles.feed_id = feeds.id
  and articles.user_id is null
  and feeds.user_id is not null;

alter table public.articles
drop constraint if exists articles_fingerprint_key;

drop index if exists articles_fingerprint_key;
drop index if exists articles_user_id_fingerprint_key;

create unique index articles_user_id_fingerprint_key
on public.articles (user_id, fingerprint);
