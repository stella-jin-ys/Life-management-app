# Dashboard Real Data and Feature Pages Design

## Goal

Make the authenticated Life Management dashboard show useful projections of each user's real Supabase data, and provide dedicated input/log pages for Highlights, Diet, Goals, Tasks, Study, Workout, Sleeping, Diary, and Finance.

The immediate delivery target is a runnable local demo and a hosted deployment using browser-safe Supabase configuration. AI-generated compliments are a deferred integration point: the product must work completely with the deterministic fallback, and a hosted AI service can be connected later without changing the data model or user-facing logging flow.

## Delivery and hosting strategy

- Local demo mode remains available through the existing `VITE_DEMO_MODE` path and uses authored local data without requiring Supabase credentials.
- Hosted mode uses the existing GitHub Pages deployment with Supabase Auth, Postgres, and RLS. The hosted build is real-data mode when both Supabase repository secrets are present.
- The first implementation must not require an AI API key, Edge Function deployment, or provider-specific runtime to build, run, or save data.
- Highlight compliments are stored with the highlight and use the deterministic fallback immediately. The compliment-generation call remains an optional seam that can be connected later to a hosted AI service or Supabase Edge Function.
- Any future AI service must run server-side, receive only the minimum user-approved highlight context, enforce authentication and rate limits, and never expose a provider secret to Vite or the browser.
- Verification must cover both local demo mode and hosted-style Supabase mode through mocked/integration tests; live deployment verification confirms the non-AI path.

## User-visible behavior

### Dashboard

- Highlights shows the garden visualization followed by at most four newest saved highlights, ordered newest first. Each item shows its text, time, and saved compliment status/content when available.
- Low Battery saves the selected feeling as a real user check-in. It shows the privacy-safe Supabase aggregate when the cohort threshold is met. Before that, it shows a stable, deterministic day-and-feeling estimate labeled as an estimate; it must not be presented as measured population data.
- Diet shows today's most recent foods and a gentle balance feedback message derived from today's meal balance groups.
- Goals shows the oldest active goal as the dashboard focus, its milestone progress, and the next incomplete milestone. The full Goals page manages all goals.
- Tasks shows a compact list of the user's current tasks with working completion checkboxes.
- Study shows the latest study keyword logged today.
- Workout shows a seven-day minutes bar chart and today's minutes.
- Sleeping shows today's sleep duration and a seven-day sleep line graph.

Dashboard cards remain compact and link to their corresponding full pages where the user can view or add more data.

### Dedicated pages

The following authenticated routes each provide an input form and a database-backed log:

- `/highlights`: create a highlight and review the user's recent highlights and compliments.
- `/health`: record meals, hydration, sleep, and movement; review today's meals and balance feedback.
- `/goals`: create goals, add milestones, toggle milestone completion, and mark goals active or complete.
- `/tasks`: create, complete, and delete tasks.
- `/study`: create and review study logs.
- `/workout`: record one workout entry per day and review the seven-day chart.
- `/sleeping`: record one sleep entry per day and review the seven-day line graph.
- `/diary`: write or update one diary entry per day.
- `/finance`: create and review finance entries.

Existing authenticated routes for Tasks, Study, Workout, Sleeping, Diary, and Finance are preserved and upgraded only where necessary. The side navigation opens full pages for Highlights, Diet, and Goals instead of scrolling to dashboard sections. The dashboard remains the home route.

## Data model

### New `meal_entries` table

Add a migration creating `public.meal_entries` with:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `entry_date date not null default current_date`
- `meal_type text not null` constrained to `breakfast`, `lunch`, `dinner`, or `snack`
- `food text not null` with a maximum length of 240 characters
- `has_produce boolean not null default false`
- `has_protein boolean not null default false`
- `has_carbohydrate boolean not null default false`
- `has_healthy_fat boolean not null default false`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Add an index on `(user_id, entry_date, created_at desc)`, a check preventing blank food values, and RLS policies that allow authenticated users to select, insert, update, and delete only rows where `user_id = auth.uid()`.

The existing `health_entries.nourishing_meals` value remains a derived daily count for compatibility. Meal entries become the source of truth for the foods and balance feedback displayed by the Diet page and dashboard.

### Existing tables

Reuse current user-scoped tables for all other features:

- `highlights`, `mood_entries`, `feeling_checkins`, `health_entries`, `goals`, and `milestones` for the dashboard's main cards.
- `tasks`, `study_logs`, `workout_entries`, `sleep_entries`, `diary_entries`, and `finance_entries` for supporting pages and dashboard summaries.

Keep every query filtered by the authenticated user's ID and preserve current RLS policies. Do not expose service-role credentials in the browser.

## Client data flow

### Dashboard loader

Extend `loadDashboard` to return:

- `highlights`: only the four newest mapped highlights for the dashboard projection.
- `meals`: today's meal entries and a balance feedback object.
- `supporting.tasks`: task rows needed by the compact list, not only aggregate counts.
- Existing mood, feeling, signal, health, goal, study, workout, and sleep data.

The loader must fail as a single authenticated request when a required query fails, matching current error handling. An empty user's dashboard must render meaningful empty states rather than demo records.

### Mutations

- Highlight creation remains optimistic and durable through `createHighlight`.
- Feeling selection inserts a real check-in and updates the displayed signal.
- Meal creation writes to `meal_entries` and refreshes or merges today's meal projection.
- Task checkbox updates use the existing task update API and immediately update the compact dashboard list.
- Health metric adjustments continue to persist to `health_entries`.
- Milestone changes continue to persist to `milestones`.

Dedicated pages use the same authenticated API functions as the dashboard so a save on a feature page is visible on the dashboard after navigation or refresh.

### Low Battery estimate

Add a deterministic client helper that accepts `feelingId` and `entryDate`, hashes the two values, and maps them to a bounded percentage range. It must return the same value for the same day and feeling across reloads. The UI label must distinguish:

- `available`: real recent shared check-ins;
- `insufficient_data`: estimated daily community signal;
- `demo`: demo-only signal.

When the server aggregate becomes available, it replaces the estimate.

### Diet feedback

Add a pure client helper that calculates today's balance from the four meal-group booleans. Feedback is supportive and non-medical, for example:

- all groups represented: “A balanced mix is showing up today.”
- missing one group: “Nice variety so far. Adding a source of {group} could round out the day.”
- no meals: “Add a meal when it feels useful; there is no score to catch up on.”

The helper must be tested without rendering components.

## Components and routes

Keep existing feature boundaries and add only focused components:

- `HighlightsPanel` receives and renders dashboard highlight entries below the garden.
- `HealthPanel` receives today's meals and feedback in addition to existing metrics.
- `SupportingTiles` receives task rows and renders accessible checkboxes.
- Add dedicated page components for Highlights, Diet, and Goals, following the existing `ModulePage` styling and loading/error patterns.
- Add route navigation for `/highlights`, `/health`, and `/goals`.
- Add full-page links from dashboard cards while keeping card controls usable.

Do not introduce a generic page builder or a generic database table. Reuse the existing page shell and form styles.

## Error, loading, and privacy behavior

- Authenticated loading states remain visible while Supabase requests are pending.
- Save failures retain the user's form values and show the existing retry message.
- Empty states explain what can be logged without inventing data.
- RLS remains the authority for user isolation; client-side user IDs are not trusted for authorization.
- Low Battery estimates are explicitly labeled and never described as actual population research.
- Meal feedback is wellness-oriented, not medical advice.

## Verification criteria

### Automated

- Frontend unit/component tests cover the four-highlight projection, deterministic Low Battery estimates, meal feedback, dashboard meal/task mapping, and all dedicated route renders.
- API tests cover meal CRUD, goal CRUD/milestones, and task checkbox persistence.
- Database tests cover meal constraints, RLS isolation, cascade deletion, and one-user/multi-user visibility.
- Existing 75 frontend tests remain green.
- `npm run build` succeeds.
- `npm run test:db` passes against the local Supabase stack.
- Relevant Playwright flows cover saving a highlight, meal, goal, task, study log, workout, sleep entry, diary entry, and finance entry, then verifying the dashboard projection.

### Manual live check

With a signed-in account:

1. Add four highlights and confirm the newest four appear below the garden.
2. Choose a Low Battery feeling and confirm it persists after reload with an honest estimate label when the cohort is insufficient.
3. Add a meal and confirm food plus balance feedback appear on the dashboard.
4. Complete a task from the dashboard and confirm the Tasks page reflects it.
5. Add study, workout, sleep, diary, finance, and goal entries from their pages and confirm each page reloads from Supabase.

## Out of scope for the first delivery

- Connecting or deploying an AI provider. The deterministic fallback is the supported compliment behavior until a later hosted AI service is explicitly added.
- Treating the estimated Low Battery percentage as population research.
- Adding social sharing, notifications, calendar sync, or medical/clinical recommendations.
