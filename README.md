# CouchMode

A Progressive Web App for tracking TV show rewatches. Search for shows, log episode progress, and let AI suggest what to watch next.

![CouchMode](/.github/screenshots/login-version.png)

## Features

- **Rewatch tracking** — log progress episode-by-episode; all prior episodes are automatically backfilled
- **Show queue** — organizes your library into Watching / Up Next / Done groups with drag-to-reorder
- **Resume card** — instantly surfaces the most recently active show and queues up the next episode
- **AI suggestions** — Claude Haiku recommends shows based on your library, resolved against TMDB metadata
- **Streaming providers** — shows which services carry each title (via TMDB, refreshed every 7 days)
- **History & stats** — completed rewatches grouped by year, with totals for episodes, hours, and average pace
- **Admin portal** — cross-user stats for admins (user list, popular shows, overview)
- **PWA** — installable on mobile and desktop, TMDB poster images cached offline via Workbox

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript, Ionic React, Tailwind CSS v4 |
| State / data | TanStack React Query |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) |
| AI | Anthropic Claude Haiku (via Supabase edge function) |
| Show data | TMDB API (proxied through edge function) |
| Build | Vite + vite-plugin-pwa |
| Tests | Vitest + jsdom + Testing Library |
| Releases | semantic-release (Conventional Commits) |

## Getting Started

### Prerequisites

- Node.js 22+
- A [Supabase](https://supabase.com) project
- A [TMDB API key](https://www.themoviedb.org/settings/api)
- An [Anthropic API key](https://console.anthropic.com) (for AI suggestions)

### Local development

```bash
# Install dependencies
npm install

# Create a .env.local file with your Supabase credentials
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Start the dev server
npm run dev
```

The TMDB and Anthropic API keys are server-side secrets — set them in your Supabase project's edge function environment, not in `.env`.

### Database setup

Apply all migrations to your Supabase project:

```bash
supabase db push
```

Or run them manually from `supabase/migrations/` in order.

### Edge functions

```bash
# Deploy both edge functions to Supabase
supabase functions deploy tmdb-search
supabase functions deploy suggest-shows

# Set server-side secrets
supabase secrets set TMDB_API_KEY=your-key
supabase secrets set ANTHROPIC_API_KEY=your-key
```

## Commands

```bash
npm run dev          # Start Vite dev server with HMR
npm run build        # Type-check and build for production
npm run lint         # ESLint
npm run test         # Run all tests once (Vitest)
npm run test:watch   # Vitest watch mode
npm run preview      # Preview production build locally
```

## Deployment

The app is configured for both **Vercel** (`vercel.json`) and **Netlify** (`netlify.toml`) with SPA rewrite rules. Deploy by connecting your repo to either platform — no additional build configuration required.

## Admin Access

To grant admin access to a user:

```sql
INSERT INTO admin_users (user_id)
SELECT id FROM auth.users WHERE email = 'someone@example.com';
```

## Attribution

Show data provided by [The Movie Database (TMDB)](https://www.themoviedb.org/). This product uses the TMDB API but is not endorsed or certified by TMDB.
