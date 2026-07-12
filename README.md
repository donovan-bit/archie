# Archie

Don's personal dashboard. Phase 1: a to-do/goals system chunked by category
across day/week/month/quarter/year, a rollover system that carries unfinished
items forward automatically, a "focus beacon" for picking the one active
priority, and full read/write Google Calendar integration. See `SPEC.md` for
the full multi-phase plan.

Stack: Next.js (App Router, TypeScript) + Supabase (Postgres) + Auth.js
(Google OAuth) + Tailwind, deployed on Vercel.

## 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/migrations/0001_init.sql`.
3. Under Settings → API, copy the **Project URL** and the **service_role**
   key (not the anon key — the app only ever talks to Supabase from trusted
   server code).

## 2. Google Cloud OAuth client

1. In [Google Cloud Console](https://console.cloud.google.com), create a
   project (or reuse one) and enable the **Google Calendar API**.
2. Configure the OAuth consent screen (External, or Internal if using a
   Workspace account). You don't need Google verification for personal use
   with a small list of test users while the app is in "Testing" mode.
3. Create an **OAuth client ID** (type: Web application) with:
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
     for local dev, plus `https://<your-domain>/api/auth/callback/google`
     for production.
4. Copy the Client ID and Client Secret into `AUTH_GOOGLE_ID` /
   `AUTH_GOOGLE_SECRET`.

The app requests the `.../auth/calendar` scope (full read/write to the
primary calendar) plus `openid email profile`, with `access_type=offline`
and `prompt=consent` so a refresh token is always issued.

## 3. Anthropic API key (paste-to-organize to-do lists)

Pasting a freeform to-do list into the dashboard and having it split into
items and sorted into categories is powered by the Claude API. Get a key at
[console.anthropic.com](https://console.anthropic.com) → API Keys, and set
it as `ANTHROPIC_API_KEY`. Usage at personal scale costs well under $1/month.

## 4. Environment variables

Copy `.env.example` to `.env.local` and fill in the values described above,
plus:

- `AUTH_SECRET` — generate with `npx auth secret`.
- `CRON_SECRET` — any random string; used to authenticate the rollover cron
  request (see below).

## 5. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with Google.

## 6. Rollover cron

`src/app/api/cron/rollover/route.ts` carries forward any item whose period
has ended while it was still pending, into the equivalent next period (next
day/week/month/quarter/year), preserving lineage via `rolled_over_from_id`.

`vercel.json` schedules this daily via [Vercel
Cron](https://vercel.com/docs/cron-jobs). Set `CRON_SECRET` as a project
environment variable in Vercel — it's automatically sent as
`Authorization: Bearer $CRON_SECRET` on scheduled invocations, which the
route checks before running.

## Deploy

Deploy on [Vercel](https://vercel.com/new), set the environment variables
above in the project settings, and add the production redirect URI to the
Google OAuth client.
