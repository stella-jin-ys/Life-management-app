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

## Hosted setup

Create a Supabase project, then apply every checked-in migration from the repository root:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Deploy the authenticated `generate-compliment` Edge Function. It always returns a deterministic fallback when `OPENAI_API_KEY` is unset or the provider is unavailable. To enable generated compliments, create the ignored server-only file and upload its values as Edge Function secrets:

```bash
cp supabase/.env.example supabase/.env.local
# Add a real OPENAI_API_KEY to supabase/.env.local before the next command.
npx supabase secrets set --env-file supabase/.env.local
npx supabase functions deploy generate-compliment
```

In Supabase Dashboard → Authentication → URL Configuration, set the Site URL to the deployed Pages root and add its password-reset route to Additional Redirect URLs. For this repository's Pages deployment, those values are:

```text
https://stella-jin-ys.github.io/Life-management-app/
https://stella-jin-ys.github.io/Life-management-app/reset-password
```

If signup reports that verification was sent but no message arrives, check Supabase Dashboard → Authentication → SMTP Settings. Supabase's built-in sender is restricted to project-team addresses and has a low rate limit; configure custom SMTP for normal users, then check spam and confirm that the sender domain has SPF/DKIM/DMARC configured.

The GitHub Pages workflow automatically publishes the demo until both repository secrets below are configured. Once both exist, the next deployment uses the real login and Supabase-backed data flow:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Add those values under the GitHub repository’s Settings → Secrets and variables → Actions. `VITE_SUPABASE_ANON_KEY` is the project's public browser anon key; it is stored as an Actions secret only to keep build configuration out of the repository. Never add a Supabase service-role key or `OPENAI_API_KEY` to Vite variables, GitHub Pages secrets, or the browser.

## Verify

```bash
npm run test:run -- --exclude '.worktrees/**'
npm run build
npm run db:reset
npm run test:db
npm run test:functions
npm run test:e2e
git diff --check
```

`npm run verify` runs the frontend test suite and production build. `npm run verify:full` runs the full local stack checks and requires Docker, a running Supabase stack, and Deno.

## Data and privacy

Every application table has Row Level Security enabled and is scoped to the signed-in user. Low Battery aggregates are based on recent app-member check-ins only; percentages are withheld until at least 10 recent check-ins exist. This is not population research or medical advice.

Tasks, Finance, Study, Workout, Sleeping, Diary, and Settings are available as authenticated routes and persist private user data through Supabase.
