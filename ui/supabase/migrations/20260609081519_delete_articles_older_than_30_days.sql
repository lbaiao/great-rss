create extension if not exists pg_cron;

do $$
begin
  if exists (
    select 1
    from cron.job
    where jobname = 'delete-articles-older-than-30-days'
  ) then
    perform cron.unschedule('delete-articles-older-than-30-days');
  end if;
end
$$;

select cron.schedule(
  'delete-articles-older-than-30-days',
  '17 3 * * *',
  $$
    delete from public.articles
    where published_at < now() - interval '30 days'
      and not exists (
        select 1
        from public.user_article_states
        where user_article_states.article_id = articles.id
          and user_article_states.saved = true
      );
  $$
);
