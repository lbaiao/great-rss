alter table public.articles
drop constraint if exists articles_fingerprint_key;

drop index if exists articles_user_id_fingerprint_key;
create unique index articles_user_id_fingerprint_key
on public.articles (user_id, fingerprint);
