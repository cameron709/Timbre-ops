# Timbre Ops

Internal operational assistant for Timbre Pro Audio. The application reads and writes real Supabase records and is deployed as a mobile-first Next.js PWA.

## Current Product Surface

- Briefing-style Home with selective attention review, operations, coming jobs, changes, and activity
- Searchable/filterable Jobs with deterministic readiness and blocker cues
- Job workspace for overview, site discovery, packing, private files, changes, and debrief memory
- Operations ownership, deadlines, job links, editing, and completion
- Operational calendar built from stored job dates and operation deadlines
- Authenticated deterministic assistant with typed actions for pack changes, operations, memory, site arrival, and search
- Honest Gear placeholder until the inventory schema exists

Gmail, Google Calendar, OpenAI interpretation, and inventory are not presented as connected. Their V1 connection/status architecture exists, but external credentials are not configured.

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
```

Set both variables in local `.env.local` and in Vercel for Production, Preview, and Development. Never expose a Supabase service-role key in this app.

## External Configuration

- Supabase Auth Site URL: `https://timbre-ops.vercel.app`
- Supabase redirect allow-list: `https://timbre-ops.vercel.app/auth/callback`
- Add team access through `team_members`; RLS requires membership and must remain enabled.
- Enable leaked-password protection in the Supabase Auth dashboard when the project plan supports it.
- Google OAuth/Gmail and Calendar credentials are still required before implementing live sync.
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
