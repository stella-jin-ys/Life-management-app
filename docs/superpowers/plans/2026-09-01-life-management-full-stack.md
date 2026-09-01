# Life Management Full-Stack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the existing Life Management React prototype into a complete multi-user application with Supabase authentication, persistent PostgreSQL data, database-enforced user isolation, private aggregate comfort signals, and server-side OpenAI compliments.

**Architecture:** Keep the current Vite/React interface and organize persistence by feature. A public Supabase browser client handles authenticated CRUD under PostgreSQL Row-Level Security; an authenticated Supabase Edge Function uses a service client only after verifying highlight ownership, then calls the OpenAI Responses API. Local Supabase and Playwright provide repeatable database, auth, and cross-user verification.

**Tech Stack:** React 18, Vite 5, React Router 6, Supabase JS 2, Supabase CLI/local stack, PostgreSQL, pgTAP, Supabase Edge Functions (Deno), OpenAI Responses API, Vitest, Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-01-life-management-full-stack-design.md`

## Global Constraints

- Preserve the existing “Daylight Ledger” visual system and responsive navigation.
- Complete Dashboard, Mood, Highlights, Low Battery, Diet & Health, Goals, and authentication only.
- Keep Tasks, Finance, Study, Workout, Sleeping, Diary, and Settings disabled and labeled “Coming soon.”
- Never expose `SUPABASE_SERVICE_ROLE_KEY` or `OPENAI_API_KEY` through Vite variables or browser code.
- Enable Row-Level Security on every application table and grant no application-table privileges to `anon`.
- Label shared-feeling results as recent app-member check-ins, never population research.
- Suppress shared-feeling percentages when fewer than 10 recent check-ins exist.
- Save a highlight before requesting its compliment; AI failure must result in a stored deterministic fallback.
- Use `gpt-5.4-mini` as the documented default `OPENAI_MODEL`; keep the model server-configurable.
- Do not add state-management, form, schema-validation, or data-fetching frameworks.
- Do not commit `.env`, service-role keys, OpenAI keys, generated test artifacts, or personal seed data.

## File Map

### Project and environment

- Modify `package.json` — dependencies and runnable verification scripts.
- Modify `.gitignore` — secrets, Supabase runtime files, Playwright artifacts.
- Create `.env.example` — public browser configuration only.
- Create `supabase/.env.example` — server-only OpenAI configuration.
- Modify `README.md` — local and hosted setup, migrations, functions, and verification.
- Create `playwright.config.js` — end-to-end configuration against local Vite and Supabase.

### Database and server

- Create `supabase/config.toml` — local Auth, API, database, Inbucket, and Edge Function configuration.
- Create `supabase/migrations/202609010001_initial_schema.sql` — tables, constraints, triggers, indexes, grants, RLS, aggregate RPC, and compliment-attempt claim RPC.
- Create `supabase/tests/database.test.sql` — schema, constraint, aggregate, and cross-user policy tests.
- Create `supabase/functions/generate-compliment/index.ts` — authenticated generation endpoint.
- Create `supabase/functions/generate-compliment/compliment.ts` — pure prompt, fallback, hashing, and response parsing helpers.
- Create `supabase/functions/generate-compliment/compliment_test.ts` — Deno unit tests for pure helpers.

### Frontend foundation and auth

- Create `src/lib/supabase/client.js` — validated singleton browser client.
- Create `src/lib/supabase/client.test.js` — environment validation tests.
- Create `src/lib/supabase/database.types.ts` — generated database types used through JSDoc.
- Create `src/features/auth/authApi.js` — signup, login, reset, update-password, and logout calls.
- Create `src/features/auth/AuthProvider.jsx` — session restoration and auth context.
- Create `src/features/auth/ProtectedRoute.jsx` — protected-route gate.
- Create `src/features/auth/AuthPage.jsx` — login, signup, and forgot-password forms.
- Create `src/features/auth/ResetPasswordPage.jsx` — password update form.
- Create `src/features/auth/auth.test.jsx` — auth form, redirect, session, and error tests.
- Modify `src/main.jsx` — router and provider composition.
- Modify `src/App.jsx` — authenticated dashboard page only.

### Persisted feature modules

- Create `src/features/dashboard/date.js` — local-date conversion.
- Create `src/features/dashboard/api.js` — all user-owned dashboard CRUD calls.
- Create `src/features/dashboard/useDashboard.js` — loading, mutations, and recoverable state.
- Create `src/features/dashboard/api.test.js` — query-shape and error tests with a fake client.
- Create `src/features/dashboard/useDashboard.test.jsx` — loading and mutation behavior.
- Modify `src/components/MoodCheckIn.jsx` — persistence status.
- Modify `src/components/HighlightsPanel.jsx` — persisted create/delete feed and compliment state.
- Modify `src/components/LowBatteryPanel.jsx` — persisted check-in and honest aggregate state.
- Modify `src/components/HealthPanel.jsx` — editable current-day health form.
- Modify `src/components/GoalsPanel.jsx` — goal and milestone CRUD.
- Modify `src/components/AppShell.jsx` — signed-in profile and logout action.
- Modify `src/components/Sidebar.jsx` — profile display and logout control.
- Modify `src/data/demoData.js` — retain authored labels/affirmations; remove personal initial records.
- Modify `src/styles.css` — auth, empty, loading, editable, and error states.
- Modify `src/App.test.jsx` — authenticated dashboard integration tests.

### End-to-end tests

- Create `e2e/helpers/auth.js` — unique users, Inbucket link extraction, and signup helper.
- Create `e2e/auth.spec.js` — signup, verification, login, reset routing, session, and logout.
- Create `e2e/dashboard.spec.js` — persistence and AI fallback.
- Create `e2e/isolation.spec.js` — two-account UI and direct API isolation.

---

### Task 1: Establish the runnable Supabase foundation

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Create: `.env.example`
- Create: `supabase/.env.example`
- Create: `supabase/config.toml`
- Create: `src/lib/supabase/client.js`
- Create: `src/lib/supabase/client.test.js`

**Interfaces:**
- Consumes: Vite environment variables.
- Produces: `getSupabaseConfig(env)` and singleton `supabase` used by every frontend feature.

- [ ] **Step 1: Write the failing configuration tests**

```js
// src/lib/supabase/client.test.js
import { describe, expect, test } from 'vitest'
import { getSupabaseConfig } from './client.js'

describe('getSupabaseConfig', () => {
  test('returns the public Supabase settings', () => {
    expect(getSupabaseConfig({
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_ANON_KEY: 'public-anon-key',
    })).toEqual({ url: 'http://127.0.0.1:54321', anonKey: 'public-anon-key' })
  })

  test('rejects incomplete browser configuration', () => {
    expect(() => getSupabaseConfig({})).toThrow('Supabase browser configuration is missing')
  })
})
```

- [ ] **Step 2: Run the test and verify the missing module failure**

Run: `npm test -- --run src/lib/supabase/client.test.js`

Expected: FAIL because `src/lib/supabase/client.js` does not exist.

- [ ] **Step 3: Install only the required runtime and verification dependencies**

Run:

```bash
npm install @supabase/supabase-js@^2 react-router-dom@^6
npm install --save-dev supabase@^2 @playwright/test@^1
```

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "test": "vitest",
    "test:run": "vitest run",
    "build": "vite build",
    "supabase:start": "supabase start",
    "supabase:stop": "supabase stop",
    "db:reset": "supabase db reset",
    "test:db": "supabase test db",
    "functions:serve": "supabase functions serve --env-file supabase/.env.local",
    "test:functions": "deno test --allow-env supabase/functions/generate-compliment/compliment_test.ts",
    "test:e2e": "playwright test",
    "verify": "npm run test:run && npm run test:db && npm run test:functions && npm run test:e2e && npm run build"
  }
}
```

- [ ] **Step 4: Add browser configuration validation and the singleton client**

```js
// src/lib/supabase/client.js
import { createClient } from '@supabase/supabase-js'

export function getSupabaseConfig(env) {
  const url = env.VITE_SUPABASE_URL
  const anonKey = env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) throw new Error('Supabase browser configuration is missing')
  return { url, anonKey }
}

const { url, anonKey } = getSupabaseConfig(import.meta.env)

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
```

Set `.env.example` to:

```dotenv
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=copy-the-local-anon-key-from-supabase-status
```

Set `supabase/.env.example` to:

```dotenv
OPENAI_API_KEY=replace-with-a-server-only-project-key
OPENAI_MODEL=gpt-5.4-mini
```

Configure `supabase/config.toml` with project ID `life-management`, API port `54321`, database port `54322`, Studio port `54323`, Inbucket port `54324`, site URL `http://127.0.0.1:5173`, additional redirect URL `http://127.0.0.1:5173/reset-password`, email signup enabled, and `generate-compliment.verify_jwt = true`.

Add `.env`, `.env.*.local`, `supabase/.env.local`, `.supabase/`, `playwright-report/`, and `test-results/` to `.gitignore`, while explicitly retaining both `.env.example` files.

- [ ] **Step 5: Run the focused test and production build**

Run:

```bash
npm test -- --run src/lib/supabase/client.test.js
npm run build
```

Expected: configuration tests PASS; build may fail until `.env` exists, so copy `.env.example` to `.env.local` and replace the local anon-key placeholder with the key from `npx supabase status` before rerunning.

- [ ] **Step 6: Commit the foundation**

```bash
git add package.json package-lock.json .gitignore .env.example supabase/.env.example supabase/config.toml src/lib/supabase/client.js src/lib/supabase/client.test.js
git commit -m "chore: add Supabase application foundation"
```

---

### Task 2: Create the database schema, authorization policies, and privacy RPCs

**Files:**
- Create: `supabase/migrations/202609010001_initial_schema.sql`
- Create: `supabase/tests/database.test.sql`
- Create: `src/lib/supabase/database.types.ts`

**Interfaces:**
- Consumes: Supabase Auth `auth.users` and `auth.uid()`.
- Produces: tables `profiles`, `mood_entries`, `highlights`, `feeling_checkins`, `health_entries`, `goals`, `milestones`; RPCs `get_comfort_signal(text)` and `claim_compliment_generation(uuid)`.

- [ ] **Step 1: Start local Supabase and write failing pgTAP assertions**

Run: `npm run supabase:start`

Create `supabase/tests/database.test.sql` as a transaction that inserts two fixed UUID users into `auth.users`, then uses pgTAP to assert:

```sql
begin;
select plan(18);

insert into auth.users (id, email, raw_user_meta_data, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', 'one@example.test', '{"display_name":"One"}', now(), now()),
  ('20000000-0000-0000-0000-000000000002', 'two@example.test', '{"display_name":"Two"}', now(), now());

select has_table('public', 'highlights', 'highlights table exists');
select has_table('public', 'health_entries', 'health_entries table exists');
select has_function('public', 'get_comfort_signal', array['text'], 'comfort signal RPC exists');

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
set local role authenticated;

select lives_ok(
  $$insert into public.highlights (user_id, content) values (auth.uid(), 'A private win')$$,
  'user one can insert their highlight'
);
select throws_ok(
  $$insert into public.highlights (user_id, content) values ('20000000-0000-0000-0000-000000000002', 'Not mine')$$,
  '42501', null, 'user one cannot insert for user two'
);
select is((select count(*)::integer from public.highlights), 1, 'user one sees one highlight');

reset role;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
set local role authenticated;
select is((select count(*)::integer from public.highlights), 0, 'user two sees no user-one highlights');

select * from finish();
rollback;
```

Expand the file to 18 assertions covering profile-trigger creation, duplicate daily mood rejection, negative health rejection, cross-user update/delete denial, milestone ownership, cohort suppression below 10, rounded aggregate output at 10 or more, one-time compliment claim, the 20-attempt hourly cap, and cascade deletion after removing an auth user.

- [ ] **Step 2: Run database tests and verify schema failures**

Run: `npm run test:db`

Expected: FAIL because the application tables and RPCs do not exist.

- [ ] **Step 3: Implement the migration**

Create enum/check-constrained tables matching the spec. Include these exact operational choices:

```sql
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 500),
  compliment text,
  compliment_status text not null default 'pending'
    check (compliment_status in ('pending', 'complete', 'fallback')),
  compliment_attempted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Add the remaining tables and constraints exactly as designed:

- `mood_entries`: mood in `bright|steady|tender|heavy`, unique `(user_id, entry_date)`.
- `feeling_checkins`: feeling in `drained|overwhelmed|lonely|restless`.
- `health_entries`: unique `(user_id, entry_date)`, hydration `0..30`, meals `0..12`, sleep minutes `0..1440`, movement minutes `0..1440`.
- `goals`: title `1..160`, why `0..500`, status in `active|completed|archived`.
- `milestones`: parent goal cascade, label `1..240`, non-negative position, nullable `completed_at`.

Create indexes on every `user_id`, on `feeling_checkins(created_at, feeling)`, on `goals(user_id, status)`, and on `milestones(goal_id, position)`.

Create `set_updated_at()` triggers for every mutable table and a `handle_new_user()` signup trigger. The signup trigger uses `coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1), 'Friend')`. It accepts the submitted timezone only when it exists in `pg_timezone_names`; missing or invalid values become `UTC`.

Enable RLS on all seven tables. Revoke all privileges from `anon`; grant only required CRUD privileges to `authenticated`. Create `select`, `insert`, `update`, and `delete` policies with both `using` and `with check` clauses. Milestone policies use `exists (select 1 from public.goals where goals.id = milestones.goal_id and goals.user_id = auth.uid())`.

Implement the aggregate with a fixed search path and threshold:

```sql
create function public.get_comfort_signal(p_feeling text)
returns table(status text, percentage integer, total_count bigint)
language sql
security definer
set search_path = public, pg_temp
as $$
  with recent as (
    select feeling from public.feeling_checkins
    where created_at >= now() - interval '30 days'
  ), counts as (
    select count(*)::bigint as total,
      count(*) filter (where feeling = p_feeling)::bigint as matching
    from recent
  )
  select
    case when p_feeling not in ('drained','overwhelmed','lonely','restless') then 'invalid'
         when total < 10 then 'insufficient_data' else 'available' end,
    case when total >= 10 and p_feeling in ('drained','overwhelmed','lonely','restless')
         then round(matching * 100.0 / total)::integer end,
    case when total >= 10 then total end
  from counts;
$$;
```

Implement `claim_compliment_generation(p_highlight_id uuid) returns boolean` as `security definer`: atomically set `compliment_attempted_at = now()` only when the row belongs to `auth.uid()`, status is `pending`, attempt is null, and that user has fewer than 20 attempted highlights in the last hour. Revoke both RPCs from `public` and `anon`; grant execute only to `authenticated`.

- [ ] **Step 4: Reset, run database tests, and generate types**

Run:

```bash
npm run db:reset
npm run test:db
npx supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

Expected: all 18 pgTAP assertions PASS; generated types include all seven tables and both RPCs.

- [ ] **Step 5: Commit the database contract**

```bash
git add supabase/migrations/202609010001_initial_schema.sql supabase/tests/database.test.sql src/lib/supabase/database.types.ts
git commit -m "feat: add private multi-user database schema"
```

---

### Task 3: Add authentication, protected routes, and session-aware navigation

**Files:**
- Create: `src/features/auth/authApi.js`
- Create: `src/features/auth/AuthProvider.jsx`
- Create: `src/features/auth/ProtectedRoute.jsx`
- Create: `src/features/auth/AuthPage.jsx`
- Create: `src/features/auth/ResetPasswordPage.jsx`
- Create: `src/features/auth/auth.test.jsx`
- Modify: `src/main.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/AppShell.jsx`
- Modify: `src/components/Sidebar.jsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `supabase.auth` and React Router.
- Produces: `useAuth()` returning `{ session, user, profile, loading, signOut }`; protected `/`; public `/login`, `/signup`, `/forgot-password`; recovery `/reset-password`.

- [ ] **Step 1: Write failing auth behavior tests**

Mock `src/lib/supabase/client.js` and test these behaviors in `auth.test.jsx`:

```jsx
test('redirects a signed-out visitor from the dashboard to login', async () => {
  renderAuthApp({ session: null, route: '/' })
  expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeVisible()
})

test('submits signup with profile metadata and local timezone', async () => {
  renderAuthApp({ session: null, route: '/signup' })
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Stella' } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'stella@example.test' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct horse battery staple' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
  expect(mockSignUp).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'Stella' }))
})
```

Also cover persistent-session loading, generic login errors, forgot-password confirmation, reset-password submission, authenticated redirect away from `/login`, and logout.

- [ ] **Step 2: Run the auth tests and verify they fail**

Run: `npm test -- --run src/features/auth/auth.test.jsx`

Expected: FAIL because auth modules and routes do not exist.

- [ ] **Step 3: Implement the auth API**

```js
// src/features/auth/authApi.js
import { supabase } from '../../lib/supabase/client.js'

export const signUp = ({ email, password, displayName, timezone }) =>
  supabase.auth.signUp({ email, password, options: { data: { display_name: displayName, timezone } } })

export const signIn = ({ email, password }) =>
  supabase.auth.signInWithPassword({ email, password })

export const requestPasswordReset = (email) =>
  supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })

export const updatePassword = (password) => supabase.auth.updateUser({ password })
export const signOut = () => supabase.auth.signOut()
```

Use one generic message for login and reset request failures: “We couldn’t complete that request. Check your details and try again.” Enforce name `1..80`, valid email input, and password minimum 12 characters in the forms.

- [ ] **Step 4: Implement session restoration and route gates**

`AuthProvider` must call `supabase.auth.getSession()` once, subscribe through `onAuthStateChange`, load the current profile after session establishment, and unsubscribe on unmount. `ProtectedRoute` renders a calm full-page loading state, then either `<Outlet />` or `<Navigate to="/login" replace />`.

Compose routes in `src/main.jsx`:

```jsx
<BrowserRouter>
  <AuthProvider>
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
      </Route>
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<App />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </AuthProvider>
</BrowserRouter>
```

Replace the hard-coded “Stella” greeting with `profile.display_name`. Add the user’s name, email, and a logout button to the sidebar footer.

- [ ] **Step 5: Add auth and route styling**

Add a centered warm-paper auth card, labelled fields, inline errors, disabled submitting states, and mobile-safe spacing. Reuse existing tokens; do not create a second color system.

- [ ] **Step 6: Run focused tests and the existing suite**

Run:

```bash
npm test -- --run src/features/auth/auth.test.jsx
npm run test:run
```

Expected: auth tests PASS; existing tests are updated only where protected routing or dynamic profile copy changes their setup.

- [ ] **Step 7: Commit authentication**

```bash
git add src/features/auth src/main.jsx src/App.jsx src/components/AppShell.jsx src/components/Sidebar.jsx src/styles.css src/App.test.jsx
git commit -m "feat: add Supabase authentication flows"
```

---

### Task 4: Add the dashboard repository and current-user loading hook

**Files:**
- Create: `src/features/dashboard/date.js`
- Create: `src/features/dashboard/api.js`
- Create: `src/features/dashboard/useDashboard.js`
- Create: `src/features/dashboard/api.test.js`
- Create: `src/features/dashboard/useDashboard.test.jsx`
- Modify: `src/App.jsx`
- Modify: `src/data/demoData.js`

**Interfaces:**
- Consumes: authenticated `user.id`, profile timezone, and `supabase`.
- Produces: `getLocalDate(timezone, now)`, dashboard CRUD functions, and `useDashboard({ userId, timezone })` returning data, loading/error state, and mutations.

- [ ] **Step 1: Write failing date, repository, and hook tests**

```js
test('formats the current day in the profile timezone', () => {
  expect(getLocalDate('Europe/Stockholm', new Date('2026-09-01T22:30:00Z')))
    .toBe('2026-09-02')
})

test('loads only the signed-in user dashboard records', async () => {
  const client = createFakeSupabase()
  await loadDashboard(client, { userId: 'user-1', entryDate: '2026-09-01' })
  expect(client.filters).toContainEqual(['user_id', 'user-1'])
})
```

The hook test uses `renderHook` and verifies one initial loading phase, resolved empty arrays/null daily records, a retryable error, and no request without a user ID.

- [ ] **Step 2: Run focused tests and verify failures**

Run: `npm test -- --run src/features/dashboard`

Expected: FAIL because the dashboard modules do not exist.

- [ ] **Step 3: Implement the local-date helper and repository functions**

`getLocalDate` uses `Intl.DateTimeFormat('en-CA', { timeZone, year:'numeric', month:'2-digit', day:'2-digit' })` and reconstructs `YYYY-MM-DD` from `formatToParts`.

Export these functions from `api.js`, each accepting `client = supabase` as its last parameter for testability:

```js
loadDashboard({ userId, entryDate }, client)
saveMood({ userId, entryDate, mood }, client)
createHighlight({ userId, content }, client)
deleteHighlight({ userId, highlightId }, client)
requestCompliment({ highlightId }, client)
recordFeeling({ userId, feeling }, client)
getComfortSignal({ feeling }, client)
saveHealth({ userId, entryDate, hydrationGlasses, nourishingMeals, sleepMinutes, movementMinutes }, client)
createGoal({ userId, title, why }, client)
updateGoal({ userId, goalId, changes }, client)
deleteGoal({ userId, goalId }, client)
createMilestone({ goalId, label, position }, client)
updateMilestone({ milestoneId, changes }, client)
deleteMilestone({ milestoneId }, client)
```

Every mutation checks Supabase’s `{ error }` and throws a normalized `Error('We could not save that change. Your input is still here.')`. `loadDashboard` requests today’s mood and health, the latest 30 highlights, and active/completed goals with ordered milestones using `Promise.all`.

- [ ] **Step 4: Implement `useDashboard` and connect `App`**

The hook owns `mood`, `health`, `highlights`, `goals`, `selectedFeeling`, `comfortSignal`, `loading`, `error`, and `saving` state. Each mutation updates state only after a successful database response, except highlight creation: insert first, prepend the returned pending row, invoke the function, then replace the row with the returned complete/fallback row.

Remove `initialHighlights`, `healthMetrics`, and `initialGoal` from `demoData.js`. Keep only mood labels, feeling labels, and authored affirmations. `App` receives user/profile from `useAuth`, calls `useDashboard`, and passes real state and mutations into the existing cards.

- [ ] **Step 5: Run dashboard and application tests**

Run:

```bash
npm test -- --run src/features/dashboard
npm test -- --run src/App.test.jsx
```

Expected: repository, hook, and application integration tests PASS using mocked authenticated data.

- [ ] **Step 6: Commit the dashboard data layer**

```bash
git add src/features/dashboard src/App.jsx src/App.test.jsx src/data/demoData.js
git commit -m "feat: load private dashboard data from Supabase"
```

---

### Task 5: Persist mood and highlights with resilient compliment states

**Files:**
- Modify: `src/components/MoodCheckIn.jsx`
- Modify: `src/components/HighlightsPanel.jsx`
- Modify: `src/features/dashboard/useDashboard.js`
- Modify: `src/App.test.jsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `selectedMood`, `saveMood`, `highlights`, `addHighlight`, `deleteHighlight`, and per-feature saving state from `useDashboard`.
- Produces: accessible persisted mood and highlight interactions with pending, complete, fallback, empty, and error presentation.

- [ ] **Step 1: Replace local-only tests with failing persistence tests**

Add application tests that click “Tender” and expect `saveMood` with today’s date; submit “Drank water before coffee” and expect a pending feed row before resolved compliment text; reject empty and over-500-character highlights; delete a highlight only after confirmation; preserve textarea content when insertion rejects.

- [ ] **Step 2: Run the focused tests and verify failures**

Run: `npm test -- --run src/App.test.jsx -t "mood|highlight"`

Expected: FAIL because existing card interactions only mutate local state and have no persistence status.

- [ ] **Step 3: Implement persisted mood feedback**

Add `aria-busy` while saving, disable only the selected mood request while it is in flight, and announce “Mood saved for today.” through an `aria-live="polite"` region after success. On failure, keep the prior selected mood and show the normalized retryable error.

- [ ] **Step 4: Implement persisted highlight states**

Keep the inline form. Enforce 500 characters and show a live remaining-character count below 80 characters. Feed rows display:

- `pending`: “Finding the right words…” with a small non-blocking progress mark.
- `complete`: stored OpenAI compliment.
- `fallback`: stored deterministic compliment with no technical warning.

Add a labelled delete button per row. Use the native `window.confirm('Remove this highlight?')` to avoid introducing a modal system. If deletion fails, leave the row visible and show the shared recoverable error.

- [ ] **Step 5: Run tests and keyboard-focused accessibility checks**

Run:

```bash
npm test -- --run src/App.test.jsx -t "mood|highlight"
npm run test:run
```

Expected: all frontend tests PASS; form labels, live regions, buttons, and error roles are queryable by accessible name.

- [ ] **Step 6: Commit mood and highlights**

```bash
git add src/components/MoodCheckIn.jsx src/components/HighlightsPanel.jsx src/features/dashboard/useDashboard.js src/App.test.jsx src/styles.css
git commit -m "feat: persist moods and daily highlights"
```

---

### Task 6: Implement secure OpenAI compliment generation and fallback

**Files:**
- Create: `supabase/functions/generate-compliment/compliment.ts`
- Create: `supabase/functions/generate-compliment/compliment_test.ts`
- Create: `supabase/functions/generate-compliment/index.ts`
- Modify: `supabase/config.toml`
- Modify: `README.md`

**Interfaces:**
- Consumes: authenticated request `{ highlightId: string }`, RPC `claim_compliment_generation`, server secrets `OPENAI_API_KEY` and `OPENAI_MODEL`.
- Produces: JSON `{ highlight: Highlight }` with `compliment_status` equal to `complete` or `fallback`.

- [ ] **Step 1: Write failing pure helper tests**

```ts
// compliment_test.ts
import { assertEquals, assertMatch } from 'jsr:@std/assert'
import { buildFallback, extractOutputText, normalizeCompliment } from './compliment.ts'

Deno.test('extracts Responses API output_text', () => {
  assertEquals(extractOutputText({ output_text: 'You made room for yourself today.' }),
    'You made room for yourself today.')
})

Deno.test('rejects an empty or oversized model response', () => {
  assertEquals(normalizeCompliment(''), null)
  assertEquals(normalizeCompliment('x'.repeat(501)), null)
})

Deno.test('fallback keeps the recorded win visible', () => {
  assertMatch(buildFallback('Took a short walk'), /Took a short walk/)
})
```

- [ ] **Step 2: Run Deno tests and verify the missing module failure**

Run: `npm run test:functions`

Expected: FAIL because `compliment.ts` does not exist.

- [ ] **Step 3: Implement pure compliment helpers**

`normalizeCompliment` trims whitespace, rejects strings outside `1..500`, and strips surrounding quotation marks. `extractOutputText` first reads `payload.output_text`, then safely scans `payload.output[].content[]` for `type === 'output_text'`. `buildFallback(content)` returns `“${content}” counts. You noticed what helped, and that kind of attention builds a life you can feel.`. `hashSafetyIdentifier(userId)` returns the first 64 lowercase hex characters of a SHA-256 digest.

- [ ] **Step 4: Implement the authenticated Edge Function**

Use `@supabase/supabase-js@2` from `esm.sh`. The handler must:

1. Allow only `POST` and answer `OPTIONS` with CORS headers.
2. Require the `Authorization` header.
3. Create a user client with the public anon key and caller header; call `auth.getUser()`.
4. Parse a UUID `highlightId`; reject malformed input with 400.
5. Call `claim_compliment_generation`; return 409 when false.
6. Use a service client to load only that highlight and verify `user_id === user.id`.
7. Call `POST https://api.openai.com/v1/responses` with:

```json
{
  "model": "value from OPENAI_MODEL, default gpt-5.4-mini",
  "instructions": "Write one warm, specific compliment for a small daily win. Use at most two short sentences. Do not diagnose, give medical advice, exaggerate, or mention being an AI.",
  "input": "the stored highlight content",
  "max_output_tokens": 100,
  "store": false,
  "safety_identifier": "SHA-256 hash of the Supabase user ID"
}
```

8. Read `output_text` as documented by the official [Responses API reference](https://developers.openai.com/api/reference/cli/resources/responses/methods/create).
9. Update the row to `complete` for valid output.
10. On missing key, timeout, non-2xx response, malformed payload, or update-safe provider failure, store `buildFallback(content)` and status `fallback`.
11. Return no provider error body, token, prompt, or stack trace.

Use a 12-second `AbortController` timeout. Never log `content`, `compliment`, request authorization, or OpenAI response bodies.

- [ ] **Step 5: Run helper and database claim tests**

Run:

```bash
npm run test:functions
npm run test:db
```

Expected: Deno helper tests PASS; database tests still prove ownership, one attempt per highlight, and the hourly cap.

- [ ] **Step 6: Smoke-test the fallback locally**

Copy `supabase/.env.example` to `supabase/.env.local`, leave `OPENAI_API_KEY` empty, run `npm run functions:serve`, create a highlight through the app, and verify the persisted row has `compliment_status = 'fallback'` and a non-empty compliment.

- [ ] **Step 7: Commit the function**

```bash
git add supabase/functions/generate-compliment supabase/config.toml README.md
git commit -m "feat: generate private highlight compliments"
```

---

### Task 7: Persist Low Battery check-ins and privacy-preserving comfort signals

**Files:**
- Modify: `src/components/LowBatteryPanel.jsx`
- Modify: `src/features/dashboard/useDashboard.js`
- Modify: `src/App.test.jsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `recordFeeling`, `getComfortSignal`, authored feeling affirmations.
- Produces: private check-in submission and `available|insufficient_data|invalid` aggregate presentation.

- [ ] **Step 1: Write failing comfort-signal tests**

Cover three cases:

```jsx
test('records the feeling before showing an available app-member signal', async () => {
  renderDashboard({ comfortSignal: { status: 'available', percentage: 68, total_count: 34 } })
  fireEvent.click(screen.getByRole('button', { name: 'Overwhelmed' }))
  expect(await screen.findByText(/68% of recent app-member check-ins/)).toBeVisible()
})

test('does not invent a percentage below the privacy threshold', async () => {
  renderDashboard({ comfortSignal: { status: 'insufficient_data', percentage: null, total_count: null } })
  expect(await screen.findByText('Not enough recent check-ins to show a shared signal yet.')).toBeVisible()
  expect(screen.queryByText(/%/)).not.toBeInTheDocument()
})
```

Also test a failed submission preserves the selected feeling and shows a retry button.

- [ ] **Step 2: Run the focused tests and verify failures**

Run: `npm test -- --run src/App.test.jsx -t "Low Battery|comfort"`

Expected: FAIL because the panel displays authored demo percentages immediately.

- [ ] **Step 3: Implement private submission followed by aggregate loading**

On feeling selection, call `recordFeeling` first. Only after success call `getComfortSignal`. While loading, the card says “Checking for shared experiences…” without a number. For `available`, show “{percentage}% of recent app-member check-ins named something similar.” For `insufficient_data`, show the exact threshold-safe copy from the test. Always show the authored affirmation.

Remove all percentage values from `demoData.js`; percentages must come only from the RPC.

- [ ] **Step 4: Run frontend and database privacy tests**

Run:

```bash
npm test -- --run src/App.test.jsx -t "Low Battery|comfort"
npm run test:db
```

Expected: UI tests PASS; SQL tests still prove private rows and aggregate-only access.

- [ ] **Step 5: Commit the comfort feature**

```bash
git add src/components/LowBatteryPanel.jsx src/features/dashboard/useDashboard.js src/data/demoData.js src/App.test.jsx src/styles.css
git commit -m "feat: add private shared-feeling comfort signals"
```

---

### Task 8: Make Diet & Health editable and persistent

**Files:**
- Modify: `src/components/HealthPanel.jsx`
- Modify: `src/features/dashboard/useDashboard.js`
- Modify: `src/App.test.jsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: today’s `health` row and `saveHealth` mutation.
- Produces: a labelled form for hydration, meals, sleep hours, and movement minutes; persisted progress ring and bars.

- [ ] **Step 1: Write failing health-form tests**

Test empty state, numeric inputs, conversion of `7.5` sleep hours to `450` minutes, database-bound validation, successful save confirmation, and preservation of values after a rejected save.

```jsx
fireEvent.change(screen.getByLabelText('Sleep hours'), { target: { value: '7.5' } })
fireEvent.click(screen.getByRole('button', { name: 'Save today’s health' }))
expect(saveHealth).toHaveBeenCalledWith(expect.objectContaining({ sleepMinutes: 450 }))
```

- [ ] **Step 2: Run focused tests and verify failures**

Run: `npm test -- --run src/App.test.jsx -t "health"`

Expected: FAIL because `HealthPanel` is read-only.

- [ ] **Step 3: Implement the editable health card**

Use native number inputs with these bounds: hydration `0..30` step `1`, meals `0..12` step `1`, sleep `0..24` step `0.25`, movement `0..1440` step `5`. Keep form values as strings until submit so empty input remains representable. Convert sleep hours to rounded minutes at submission.

Calculate visual progress using authored display targets only: hydration 8 glasses, meals 3, sleep 480 minutes, movement 30 minutes. Label these “daily guide” rather than medical targets. Save through an upsert on `(user_id, entry_date)` and show an `aria-live` confirmation.

- [ ] **Step 4: Run tests**

Run:

```bash
npm test -- --run src/App.test.jsx -t "health"
npm run test:run
```

Expected: health and full frontend tests PASS.

- [ ] **Step 5: Commit health persistence**

```bash
git add src/components/HealthPanel.jsx src/features/dashboard/useDashboard.js src/App.test.jsx src/styles.css
git commit -m "feat: persist daily health check-ins"
```

---

### Task 9: Implement goal and milestone CRUD

**Files:**
- Modify: `src/components/GoalsPanel.jsx`
- Modify: `src/features/dashboard/useDashboard.js`
- Modify: `src/App.test.jsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: ordered `goals` with nested milestones and all goal/milestone repository mutations.
- Produces: create, edit, complete, archive, delete, add/reorder/edit/complete/delete milestone interactions.

- [ ] **Step 1: Write failing goal workflow tests**

Cover:

- Empty state creates a goal with title and optional why.
- Editing title/why persists.
- Adding a milestone uses the next integer position.
- Checking a milestone sets `is_complete` and `completed_at`.
- Progress is derived from completed milestones.
- Up/down reorder controls persist adjacent positions.
- Completing, archiving, and deleting a goal update the visible list.
- Rejected mutations leave the prior UI state and entered text intact.

```jsx
fireEvent.click(screen.getByRole('checkbox', { name: 'Outline the first chapter' }))
expect(updateMilestone).toHaveBeenCalledWith(expect.objectContaining({
  is_complete: true,
  completed_at: expect.any(String),
}))
```

- [ ] **Step 2: Run goal tests and verify failures**

Run: `npm test -- --run src/App.test.jsx -t "goal|milestone"`

Expected: FAIL because the existing component supports only one local milestone toggle.

- [ ] **Step 3: Implement goal CRUD with inline forms**

Use inline forms within the existing card; do not add a modal library. Display one expanded active goal at a time and a compact selector when multiple goals exist. Use labelled icon buttons for edit, archive, complete, delete, move up, and move down. Confirm destructive goal deletion with `window.confirm('Delete this goal and its milestones?')`.

Title limits: goal `1..160`, why `0..500`, milestone `1..240`. Calculate `Math.round(completed / total * 100)` with `0` for no milestones. The next-step cue is the first incomplete milestone by position; when none remain, show “Pause and notice how far you came.”

Reordering updates the two affected milestones sequentially and reloads the goal after success. If either update fails, reload from the database and show the normalized error so positions cannot remain falsely optimistic.

- [ ] **Step 4: Run goal and complete frontend tests**

Run:

```bash
npm test -- --run src/App.test.jsx -t "goal|milestone"
npm run test:run
```

Expected: goal tests and full frontend suite PASS.

- [ ] **Step 5: Commit goals**

```bash
git add src/components/GoalsPanel.jsx src/features/dashboard/useDashboard.js src/App.test.jsx src/styles.css
git commit -m "feat: add persistent goals and milestones"
```

---

### Task 10: Add end-to-end auth, persistence, and isolation verification

**Files:**
- Create: `playwright.config.js`
- Create: `e2e/helpers/auth.js`
- Create: `e2e/auth.spec.js`
- Create: `e2e/dashboard.spec.js`
- Create: `e2e/isolation.spec.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: local Supabase API `54321`, Inbucket `54324`, Vite `5173`.
- Produces: repeatable browser evidence for real authentication, persistence, password recovery, fallback generation, and cross-user isolation.

- [ ] **Step 1: Configure Playwright and write failing auth E2E tests**

Set `baseURL: 'http://127.0.0.1:5173'`, one Chromium project, screenshot only on failure, trace on first retry, and a Vite `webServer` command. Disable parallel execution because tests reset or share the local auth service.

`e2e/helpers/auth.js` exports `uniqueUser(prefix)`, `signUp(page, user)`, and `getLatestInbucketLink(email, pathFragment)`. The Inbucket helper polls `http://127.0.0.1:54324/api/v1/mailbox/${localPart}` for up to 10 seconds, loads the newest message, and extracts the first URL containing the requested path fragment.

Write tests for signup verification, login, refresh session restoration, logout, forgot-password email, and `/reset-password` completion.

- [ ] **Step 2: Write failing dashboard and isolation E2E tests**

`dashboard.spec.js` creates a verified local user, saves a mood, highlight, health values, goal, and milestone, reloads, and expects every value to remain. Run the function without `OPENAI_API_KEY` and assert the highlight displays a persisted fallback compliment.

`isolation.spec.js` creates user A and user B. User A saves a uniquely named highlight and goal. User B logs in and cannot see either value. Then use user B’s browser access token with direct `fetch` requests to the REST endpoints filtered by user A’s ID; expect empty arrays for reads and HTTP 403/empty affected rows for writes.

- [ ] **Step 3: Run E2E tests and fix only observed failures**

Run:

```bash
npm run db:reset
npm run functions:serve
npm run test:e2e
```

Expected: all auth, dashboard, and isolation tests PASS. Keep the function server in a separate terminal while Playwright runs.

- [ ] **Step 4: Commit E2E verification**

```bash
git add playwright.config.js e2e package.json package-lock.json
git commit -m "test: verify auth persistence and user isolation"
```

---

### Task 11: Complete operational documentation and release verification

**Files:**
- Modify: `README.md`
- Modify: `.env.example`
- Modify: `supabase/.env.example`
- Modify: `DESIGN.md`

**Interfaces:**
- Consumes: all runnable commands and deployment requirements from Tasks 1–10.
- Produces: exact local setup, hosted Supabase deployment, function secret, auth redirect, backup, and verification instructions.

- [ ] **Step 1: Replace prototype documentation with exact setup instructions**

Document this local sequence:

```bash
npm install
npx supabase start
cp .env.example .env.local
# paste the local anon key printed by: npx supabase status
cp supabase/.env.example supabase/.env.local
npm run db:reset
npm run functions:serve
npm run dev
```

Document that live AI compliments require `OPENAI_API_KEY`; without it, the deliberate fallback remains fully functional. Explain that community percentages represent recent app-member check-ins and are hidden below 10 submissions.

- [ ] **Step 2: Document hosted deployment**

Include commands and settings:

```bash
npx supabase login
npx supabase link --project-ref "$SUPABASE_PROJECT_REF"
npx supabase db push
npx supabase secrets set OPENAI_API_KEY="$OPENAI_API_KEY" OPENAI_MODEL=gpt-5.4-mini
npx supabase functions deploy generate-compliment
npm run build
```

Explain how to copy the hosted project URL and anon key into the frontend host, set the production site URL and `/reset-password` redirect in Supabase Auth, configure an SMTP provider before public launch, and review hosted database backup settings. Keep secret examples obvious and nonfunctional.

- [ ] **Step 3: Update durable design documentation**

Change `DESIGN.md` status from prototype implementation to full-stack implementation and add the auth card, empty states, saving states, errors, editable health fields, goal-management controls, profile footer, and signed-out responsive behavior. Do not change the approved palette or typography.

- [ ] **Step 4: Run the complete release verification from a fresh database**

Run in order:

```bash
npm run db:reset
npm run test:run
npm run test:db
npm run test:functions
npm run test:e2e
npm run build
```

Expected:

- Vitest exits 0 with no failed tests.
- pgTAP reports all 18 database assertions passing.
- Deno reports all compliment helper tests passing.
- Playwright reports all auth, dashboard, and isolation tests passing.
- Vite production build exits 0.

Inspect the built JavaScript with:

```bash
rg -n "SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|sk-[A-Za-z0-9_-]{20,}" dist && exit 1 || true
```

Expected: no matches.

- [ ] **Step 5: Inspect desktop and mobile UI once, fix defects in one batch, and reconfirm**

Open the authenticated dashboard at 1440×1000 and 390×844. Verify no overflow, clipped controls, obscured dialogs, unreadable contrast, or unreachable navigation. Fix all observed defects together, then repeat the two screenshots once.

- [ ] **Step 6: Commit documentation and release corrections**

```bash
git add README.md .env.example supabase/.env.example DESIGN.md src
git commit -m "docs: complete full-stack setup and release guidance"
```

- [ ] **Step 7: Record final evidence**

Run:

```bash
git status --short
git log --oneline --max-count=12
```

Expected: no uncommitted implementation files; history contains the task-level commits above. Report exact test counts and any environment-dependent checks that could not run rather than claiming them complete.
