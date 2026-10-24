# Timbre Ops

Internal operational assistant for Timbre Pro Audio. The application reads and writes real Supabase records and is deployed as a mobile-first Next.js PWA.

## Current Product Surface

- Briefing-style Home with selective attention review, operations, coming jobs, changes, and activity
- Searchable/filterable Jobs with deterministic readiness and blocker cues
- Job workspace for overview, structured schedule, packing, private files, Gmail import review, changes, and debrief memory
- Operations ownership, deadlines, job links, editing, and completion
- Operational calendar built from stored job dates and operation deadlines
- Authenticated deterministic assistant with typed actions for pack changes, operations, memory, site arrival, and search
- Honest Gear placeholder until the inventory schema exists

Gmail has an authorised, review-before-apply import workflow once its OAuth credentials are configured. Google Calendar, OpenAI interpretation, and inventory remain explicitly unconnected.

## Structure
- `app/` — Next.js App Router pages and routes
- `components/` — reusable UI
- `lib/supabase/` — Supabase browser/server clients
- `types/` — shared TypeScript/database types
- `public/` — static assets

This scaffold intentionally contains no secrets. Configure Supabase and other credentials with environment variables.

## Required Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://sdipclikyujdrjthpnct.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/integrations/gmail/callback
GMAIL_TOKEN_ENCRYPTION_KEY=base64_encoded_32_byte_key
```

Set all required variables in local `.env.local` and in Netlify environment variables. Only the `NEXT_PUBLIC_` variables are browser-visible; Google credentials and the Gmail encryption key must remain server-side. Never expose a Supabase service-role key in this app.

## External Configuration

- Production host: `https://timbre-ops.netlify.app`
- Supabase Auth Site URL: `https://timbre-ops.netlify.app`
- Supabase redirect allow-list: `https://timbre-ops.netlify.app/auth/callback`
- Add team access through `team_members`; RLS requires membership and must remain enabled.
- Enable leaked-password protection in the Supabase Auth dashboard when the project plan supports it.
- Create a Google OAuth web client with the Gmail read-only scope and add `/api/integrations/gmail/callback` for each local, preview, and production origin.
- Set `GOOGLE_OAUTH_REDIRECT_URI=https://timbre-ops.netlify.app/api/integrations/gmail/callback` for production. The value must exactly match an authorised Google redirect URI. Keep Gmail credentials out of branch previews unless a stable preview callback is explicitly configured.
- Generate `GMAIL_TOKEN_ENCRYPTION_KEY` with `openssl rand -base64 32`. It is server-only and encrypts Gmail tokens at rest.
- Apply `supabase/migrations/20260928152732_gmail_import_review.sql` only after reviewing its date-only cleanup and email-review tables.
- Google Calendar credentials are not used; Google Calendar remains unconnected.
- An OpenAI API key is optional for a future interpreter. Deterministic commands work without it.

## Development

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

Database changes live in `supabase/migrations/`. The `job-files` Storage bucket is private and protected by team-member policies.


## Netlify Deployment

Timbre Ops is hosted on Netlify Free at `https://timbre-ops.netlify.app`.

The committed `netlify.toml` uses:

- build command: `npm run build`
- publish directory: `.next`
- Node.js 24
- Netlify's current OpenNext adapter for Next.js

Production should deploy from `main`. Feature branches such as `codex/visual-refresh-black-aluminium` should be reviewed as branch/deploy previews before merging to production.

For production OAuth, keep the exact callback configured in both Netlify and Google Cloud:

`https://timbre-ops.netlify.app/api/integrations/gmail/callback`
