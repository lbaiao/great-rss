# Great RSS

Responsive RSS reader backed by Supabase. The app is a Vite + React frontend in this `ui` directory, with Supabase migrations and an Edge Function under `ui/supabase`.

## Current State

- RSS feed metadata lives in `public.feeds` and is scoped by `user_id`.
- Normalized article content lives in `public.articles` and is scoped by `user_id`.
- Per-user read/save state lives in `public.user_article_states`.
- Rows in `feeds` or `articles` with `user_id = null` are intentionally invisible to browser users.
- Articles older than 30 days by `published_at` are deleted daily by Supabase Cron unless archived/saved, and `sync-feeds` skips already-expired feed items.
- Supabase email/password auth is implemented. The frontend auth gate and RLS migration should be browser-tested against the hosted project before commit.
- `sync-feeds` is deployed and inserts articles using Supabase-managed secret keys in the Edge Function environment.
- `sync-feeds` now expects an authenticated JWT because `supabase/config.toml` has `verify_jwt = true`.

## Local App Setup

1. Install dependencies from `ui`:
   ```bash
   npm install
   ```
2. Confirm `ui/.env.local` contains:
   ```bash
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_PUBLISHABLE_KEY=...
   ```
3. Start the UI:
   ```bash
   npm run dev
   ```

## Supabase Setup

This repo expects a linked Supabase project.

Useful commands from `ui`:

```bash
supabase db push
supabase functions deploy sync-feeds
supabase migration list
supabase db advisors --linked --fail-on none
```

Do not expose a service role key in the frontend. The browser should only use `VITE_SUPABASE_PUBLISHABLE_KEY`.

For hosted email/password auth, confirm this setting in the Supabase dashboard:

- `Authentication` -> `Sign In / Providers` -> `Email`
- Email provider enabled
- Email confirmations disabled for the current MVP

The local `supabase/config.toml` also has email confirmations disabled, but hosted project auth settings should be checked directly before testing sign-up.

## Auth And RLS Model

The ownership migrations are:

```text
supabase/migrations/20260605070927_add_user_article_states_and_auth_policies.sql
supabase/migrations/20260606111534_scope_content_to_users.sql
```

It does the following:

- Creates `public.user_article_states` keyed by `(user_id, article_id)`.
- Enables RLS on `user_article_states`.
- Allows authenticated users to read only their own feeds/articles.
- Allows authenticated users to add feeds only for themselves.
- Allows authenticated users to select/insert/update/delete article state rows only for their own articles.
- Revokes anonymous access to `feeds`, `articles`, and `user_article_states`.

The frontend now maps article state like this:

- Article rows are user-owned and default to `unread: true`, `saved: false` for that user.
- `updateArticle()` upserts into `user_article_states`.
- `markAllRead()` upserts per-user rows for all existing articles while preserving saved state.
- `fetchBootstrap()` merges the current user's article rows with their state rows.

## Edge Function Notes

Function path:

```text
supabase/functions/sync-feeds/index.ts
```

Deployment:

```bash
supabase functions deploy sync-feeds
```

Important details:

- Do not deploy with `--no-verify-jwt` unless intentionally reopening sync to anonymous callers.
- The frontend sends the signed-in session access token when syncing.
- The function uses Supabase-provided `SUPABASE_URL` and `SUPABASE_SECRET_KEYS`; do not create custom secrets with the reserved `SUPABASE_` prefix.
- Deploy `sync-feeds` after retention or parsing changes; database migrations do not deploy Edge Functions.

## Verification Already Run

These passed after the auth/RLS changes:

```bash
npm run lint
npm run build
supabase db advisors --linked --fail-on none
supabase migration list
```

Anonymous REST access to `articles` was checked and correctly returned permission denied.

## Paused Work / Next Steps

1. Browser-test sign-up with a disposable email/password.
2. Confirm no email confirmation is required in the hosted Supabase project.
3. Sign in and verify the dashboard loads existing articles.
4. Click an article and verify it creates/updates only the signed-in user's `user_article_states` row.
5. Save/unsave an article and verify Archive reflects the current user only.
6. Run Sync from the UI and confirm authenticated Edge Function invocation works.
7. If sync returns `401`, check that the deployed function has JWT verification enabled and that the frontend is sending `session.access_token`.
8. Commit the auth/RLS changes once browser behavior is verified.

## Deployment

For Vercel:

- Preset: Vite
- Root directory: `ui`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
