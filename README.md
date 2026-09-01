# Life Management

Life Management is a private, multi-user wellbeing dashboard for noticing small wins, naming difficult feelings, tracking daily health habits, and keeping one gentle next step visible.

## Stack

- React + Vite for the responsive dashboard and auth screens
- Supabase Auth + Postgres + Row Level Security for private user data
- Supabase Edge Functions for server-side compliment generation
- OpenAI Responses API, with a deterministic fallback when the provider is unavailable

## Local setup

Prerequisites: Node.js 18+, Docker Desktop, and the Supabase CLI.

```bash
npm install
cp .env.example .env.local
npx supabase start
npx supabase status # copy the anon key into .env.local
npm run db:reset
npm run dev
```

Open `http://127.0.0.1:5173`. Local Auth email delivery is available through Inbucket at `http://127.0.0.1:54324`.

The browser only receives `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. If AI compliments are enabled, copy `supabase/.env.example` to `supabase/.env.local`, add `OPENAI_API_KEY`, and serve the function with `npm run functions:serve`. The OpenAI key is never a Vite variable.

## Verify

```bash
npm run test:run
npm run build
npm run test:functions
npm run test:db
npm run test:e2e
```

`npm run verify` runs the frontend test suite and production build. `npm run verify:full` runs the full local stack checks and requires Docker, a running Supabase stack, and Deno.

## Data and privacy

Every application table has Row Level Security enabled and is scoped to the signed-in user. Low Battery aggregates are based on recent app-member check-ins only; percentages are withheld until at least 10 recent check-ins exist. This is not population research or medical advice.

Tasks, Finance, Study, Workout, Sleeping, Diary, and Settings are intentionally marked Coming soon while the core wellbeing workflow is being established.
