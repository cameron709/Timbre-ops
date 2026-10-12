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

Set these six variables in local `.env.local` and in Netlify as described below. Only the two `NEXT_PUBLIC_` variables are browser-visible; Google credentials and the encryption key must remain server-side. Never expose a Supabase service-role key in this app.

## External Configuration

- Supabase Auth Site URL: your Netlify production origin.
- Supabase redirect allow-list: `<production-origin>/auth/callback` and `http://localhost:3000/auth/callback` for local development.
- Add team access through `team_members`; RLS requires membership and must remain enabled.
- Enable leaked-password protection in the Supabase Auth dashboard when the project plan supports it.
- Create a Google OAuth web client with the Gmail read-only scope and add `/api/integrations/gmail/callback` for each explicitly configured local or production origin.
- `GOOGLE_OAUTH_REDIRECT_URI` is authoritative for both Google authorisation and token exchange. The value must exactly match an authorised Google redirect URI.
- Generate `GMAIL_TOKEN_ENCRYPTION_KEY` with `openssl rand -base64 32`. It is server-only and encrypts Gmail tokens at rest.
- The live Supabase Gmail + CRM schema has already been migrated. For a new database, review and apply the migrations in `supabase/migrations/` in order.
- Google Calendar credentials are not used; Google Calendar remains unconnected.
- An OpenAI API key is optional for a future interpreter. Deterministic commands work without it.

## Deploy on Netlify Free

1. In Netlify, select the Free plan and import `cameron709/Timbre-ops` from GitHub. Select `main` as the production branch after this change is merged; leave the base directory at the repository root.
2. Use the committed `netlify.toml`: build command `npm run build`, publish directory `.next`, Node.js 24. Netlify automatically installs the current [OpenNext adapter](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/) for Next.js 16. Leave automatic adapter updates enabled; no manual plugin, static export, or paid feature is required. API routes run in a Node.js Function, supporting `node:crypto`, Buffer, server-side fetch, and the existing PDF/DOCX parsers.
3. Add all six variables listed above in Netlify's environment-variable settings for Production, available to both builds and Functions. Generate the encryption key once with `openssl rand -base64 32`; retain it across deploys so stored tokens remain decryptable. Never commit values to `netlify.toml`. Public Supabase variables are embedded during build; redeploy after changing configuration.
4. Once Netlify assigns the production domain, set:
   ```text
   GOOGLE_OAUTH_REDIRECT_URI=https://<netlify-production-domain>/api/integrations/gmail/callback
   ```
   Register that exact URI in the Google Cloud OAuth web client's authorised redirect URIs, then redeploy. Do not connect Gmail until these match. For local development, register the localhost callback separately. Keep Gmail credentials out of Deploy Previews unless a stable preview origin and its own exact callback are explicitly configured: the state/session cookies belong to the origin where connection begins.
5. In Supabase Auth URL Configuration, set Site URL to `https://<netlify-production-domain>` and allow `https://<netlify-production-domain>/auth/callback`. Retain the localhost callback for development. Supabase database, Auth, private Storage, team membership, and RLS remain external and unchanged; no Supabase migration is part of this hosting change.
6. Sign in on the production origin, connect Gmail from Settings, and confirm the callback returns to Settings with a connected account. Open a matching job, sync its email, and review an extracted PDF/DOCX proposal through accept/reject. Verify confirmed job data changes only after acceptance. Gmail remains read-only, tokens are encrypted before storage, and secrets stay server-side. Live OAuth testing requires the real domain and credentials.

This setup uses ordinary builds and Functions within Netlify Free usage limits. Check the deploy log for successful OpenNext adaptation and generated API routes; a local Next.js build alone does not verify Netlify packaging or live OAuth.

## Development

```bash
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
```

Database changes live in `supabase/migrations/`. The `job-files` Storage bucket is private and protected by team-member policies.
