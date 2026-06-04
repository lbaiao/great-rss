create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Run this once after storing your project URL in Vault:
-- select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');

select
  cron.schedule(
    'sync-rss-feeds-every-30-minutes',
    '*/30 * * * *',
    $$
    select
      net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/sync-feeds',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := '{"scheduled": true}'::jsonb
      );
    $$
  );
