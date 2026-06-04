revoke all on function public.insert_synced_articles(jsonb) from public, anon, authenticated, service_role;
drop function if exists public.insert_synced_articles(jsonb);
