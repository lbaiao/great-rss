# Great RSS

Responsive RSS reader UI backed by Supabase.

## Local app setup

1. Install dependencies:
   `npm install`
2. Confirm `ui/.env.local` contains:
   `VITE_SUPABASE_URL=...`
   `VITE_SUPABASE_PUBLISHABLE_KEY=...`
3. Start the UI:
   `npm run dev`

## Supabase setup

This repo expects a linked Supabase project and uses:
- database tables in `supabase/migrations`
- seed data in `supabase/seed.sql`
- Edge Function `sync-feeds`
- cron SQL in `supabase/schedule.sql`

Run these from the `ui` directory after linking your project:

1. Push schema and seed data:
   `supabase db push`
2. Deploy the sync function:
   `supabase functions deploy sync-feeds --no-verify-jwt`
3. Apply the cron schedule:
   open `supabase/schedule.sql` in the Supabase SQL editor, replace the placeholder values in the commented `vault.create_secret(...)` lines, run those once, then run the `cron.schedule(...)` statement.

The hosted Edge Function uses Supabase's built-in `SUPABASE_URL` and
`SUPABASE_SECRET_KEYS` environment variables. Do not create custom secrets
using the reserved `SUPABASE_` prefix.

## Notes

- The current implementation uses public dev policies so the browser can read/write with the publishable key during development.
- The next hardening step is adding auth and moving read/save state to a per-user table with stricter RLS.
