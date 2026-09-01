# Life Management Full-Stack Design Specification

## Purpose

Life Management is a private, multi-user wellbeing application for noticing small daily progress, naming difficult emotions without shame, tracking basic physical wellbeing, and maintaining gentle momentum toward personal goals.

This specification upgrades the existing React prototype into a complete runnable application with real authentication, persistent PostgreSQL data, per-user authorization, database migrations, server-side AI compliment generation, and automated verification.

The product is supportive wellbeing software. It does not provide medical or mental-health diagnosis, treatment, or crisis services.

## Release scope

The first full-stack release makes these areas complete and persistent:

- Dashboard
- Daily mood check-in
- Highlights and generated compliments
- Low Battery feelings and anonymous community comfort signals
- Diet & Health tracking
- Goals and milestones
- Authentication and session management

The left navigation also shows Tasks, Finance, Study, Workout, Sleeping, Diary, and Settings. These destinations remain disabled and explicitly labeled “Coming soon.” They do not receive placeholder routes or partial data models in this release.

## Technical approach

The existing React 18 and Vite frontend remains the application shell. Supabase supplies the managed backend:

- Supabase Auth for user identity and sessions
- Supabase PostgreSQL for persistent application data
- PostgreSQL Row-Level Security for per-user authorization
- PostgreSQL functions for privacy-preserving aggregate comfort signals
- Supabase Edge Functions and the OpenAI Responses API for AI compliment generation

The frontend communicates through the public Supabase client. It never receives a service-role key or AI provider secret. Administrative database access and AI calls remain in server-controlled environments.

## Authentication

The application supports:

- Email and password signup
- Email verification
- Email and password login
- Password reset request and password update
- Persistent session restoration
- Logout
- Protected application routes

Signed-out users can access only authentication screens. Signed-in users are redirected away from authentication screens and into the dashboard. Expired or revoked sessions return the user to login without exposing protected content.

On first signup, a database trigger creates a matching profile row. The profile stores the display name and IANA timezone used for local daily records. Authentication credentials remain in Supabase’s managed `auth` schema.

## Data model

All primary keys use UUIDs. Timestamps use timezone-aware PostgreSQL timestamps. User-owned records reference `auth.users.id` and use cascading deletion so deleting an authentication account removes associated application data.

### Profiles

One row per account:

- `id` — matches the authenticated user ID
- `display_name`
- `timezone`
- `created_at`
- `updated_at`

### Mood entries

One editable mood entry per user and local calendar date:

- `id`
- `user_id`
- `entry_date`
- `mood` — constrained to the supported mood values
- `created_at`
- `updated_at`

A unique constraint on `(user_id, entry_date)` makes the interaction an upsert rather than an accumulating log for the same day.

### Highlights

Daily wins and their generated encouragement:

- `id`
- `user_id`
- `content`
- `compliment`
- `compliment_status` — `pending`, `complete`, or `fallback`
- `created_at`
- `updated_at`

Content is length-limited in both the interface and database. The highlight is saved before generation begins so an AI failure never loses the user’s writing.

### Feeling check-ins

Private Low Battery submissions:

- `id`
- `user_id`
- `feeling` — constrained to the supported feeling values
- `created_at`

Users can read their own check-ins. They cannot list or inspect another user’s records.

### Health entries

One editable record per user and local calendar date:

- `id`
- `user_id`
- `entry_date`
- `hydration_glasses`
- `nourishing_meals`
- `sleep_minutes`
- `movement_minutes`
- `created_at`
- `updated_at`

Numeric constraints reject negative values and cap values at generous but plausible daily limits. The interface presents the values as personal tracking, not medical targets.

### Goals

User-owned goals:

- `id`
- `user_id`
- `title`
- `why`
- `status` — `active`, `completed`, or `archived`
- `created_at`
- `updated_at`

### Milestones

Ordered goal steps:

- `id`
- `goal_id`
- `label`
- `position`
- `is_complete`
- `completed_at`
- `created_at`
- `updated_at`

Milestone authorization is derived from ownership of the parent goal. Deleting a goal cascades to its milestones.

## Authorization and privacy

Row-Level Security is enabled on every application table. Grants and policies are explicit rather than relying on Supabase defaults.

For user-owned tables, authenticated users may select, insert, update, and delete only rows whose `user_id` equals `auth.uid()`. Profile access is limited to the row whose primary key equals `auth.uid()`. Milestone policies permit access only when the parent goal belongs to the current user.

Unauthenticated users receive no application-table privileges. The browser public key is treated as public configuration; security depends on database grants and policies, not key secrecy.

Database policy tests create two users and prove that neither can read, update, or delete the other’s records.

## Shared-feeling comfort signal

The Low Battery feature never claims to represent the general population. It reports only anonymous activity from recent app check-ins and labels the result accordingly.

An authenticated PostgreSQL function returns an aggregate result for a supported feeling over a rolling recent window. The function:

- returns only counts and a percentage, never rows or user identifiers
- uses a fixed search path and narrowly scoped execution privileges
- ignores unsupported feeling values
- requires a minimum cohort of 10 check-ins before returning a percentage
- returns an `insufficient_data` state below that threshold
- rounds the percentage to avoid false precision

When the cohort is too small or the request fails, the card shows its authored calming affirmation without inventing a statistic.

## AI-generated compliments

Creating a highlight follows this sequence:

1. The browser inserts the highlight with `compliment_status = pending`.
2. The browser invokes the authenticated `generate-compliment` Edge Function with only the highlight ID.
3. The function validates the session, loads the highlight, and verifies that it belongs to the caller.
4. The function sends a bounded system instruction and the length-limited highlight text to the OpenAI Responses API. The model name is supplied through the server-side `OPENAI_MODEL` environment variable.
5. The function validates and stores the short response, then marks the row `complete`.
6. If generation is unavailable or invalid, the function stores a safe deterministic compliment and marks the row `fallback`.

The Edge Function does not accept arbitrary system prompts, does not expose provider errors to the user, and does not log highlight text. A database check permits one generation attempt per highlight and caps recent attempts per user, preventing accidental or abusive repetition without adding a separate queue. The repository documents `OPENAI_API_KEY` and `OPENAI_MODEL` but contains no secret value.

## Frontend structure

The application keeps the current visual system and responsive shell while reorganizing behavior by feature:

- `src/features/auth` — auth screens, route protection, and session state
- `src/features/dashboard` — dashboard composition and current-day loading
- `src/features/mood` — daily mood query and upsert
- `src/features/highlights` — highlight feed, creation, and compliment status
- `src/features/comfort` — feeling submission and aggregate signal
- `src/features/health` — current-day health form and progress display
- `src/features/goals` — goal and milestone CRUD
- `src/lib/supabase` — typed client initialization and shared request helpers

Feature modules own their queries and mutations. Components receive explicit loading, data, and error states rather than importing administrative clients or secrets.

## User experience

New accounts arrive at a private empty-state dashboard. Each card explains one useful first action without filling the account with fictional personal data. Development seed data is optional and restricted to local environments.

Dashboard behavior:

- Mood selection saves or updates today’s mood.
- Highlights appear immediately after saving while compliment generation completes.
- Low Battery records the chosen feeling and shows either an aggregate app-member signal or an honest insufficient-data state.
- Health metrics are editable and persist for the selected local day.
- Goals can be created, edited, completed, archived, and deleted. Milestones can be added, reordered, edited, completed, and deleted.
- Progress is derived from persisted milestone completion rather than stored separately.

The app preserves the warm “Daylight Ledger” presentation. Loading, empty, validation, offline, authentication, and backend-error states use direct, non-judgmental language. Form input remains present after recoverable failures.

## Error handling

Expected validation failures are shown beside the relevant control. Authentication errors use generic messages that do not reveal whether an email address exists. Database and network failures show a retry path and preserve local form input.

AI failure is non-blocking because the highlight has already been stored and receives a deterministic fallback. Aggregate-signal failure removes the percentage rather than substituting a fabricated value.

Unexpected technical details are logged only in development or server-controlled logs. User-facing messages do not expose SQL, stack traces, tokens, provider responses, or personal data.

## Local development and deployment

The repository includes:

- `.env.example` containing names and explanations but no secrets
- Supabase configuration and versioned SQL migrations
- optional local-only seed data
- Edge Function source and deployment instructions
- commands for frontend development, tests, database reset, and production build
- instructions for creating a hosted Supabase project and applying migrations
- deployment guidance for a static Vite host with the required auth redirect URLs

The normal local workflow uses the Supabase CLI and Docker for PostgreSQL, Auth, and Edge Function services. The hosted workflow uses the same migrations and function source so local and production schemas do not drift.

## Testing and verification

### Unit and component tests

Vitest and Testing Library cover calculations, validation, rendering, loading and error states, auth redirects, form behavior, and AI fallback presentation.

### Database tests

SQL policy tests verify constraints, ownership rules, cross-user denial, cascading deletion, profile creation, daily uniqueness, aggregate thresholds, and the absence of unauthenticated table access.

### End-to-end tests

Browser tests run against the local Supabase stack and verify:

- signup and login
- protected-route redirects
- session restoration and logout
- password-reset routing using the local mail capture service
- persistent mood, highlight, health, goal, and milestone workflows
- isolation between two accounts
- graceful compliment fallback

### Release checks

The release is considered ready only when:

- all unit and component tests pass
- database policy tests pass
- end-to-end tests pass against a freshly reset local database
- the production frontend build succeeds
- the Edge Function type-checks and its tests pass
- no service-role or AI secret appears in the browser bundle or committed files
- the interface remains usable at representative desktop and mobile widths

## Non-goals

This release does not include:

- Tasks, Finance, Study, Workout, Sleeping, Diary, or Settings functionality
- social profiles, direct messaging, or access to another user’s personal records
- claims that app-member aggregates represent a country or population
- clinical recommendations, diagnosis, or crisis intervention
- wearable, banking, calendar, or third-party data integrations
- subscriptions, billing, teams, administrators, or organization accounts
- offline-first synchronization
- a configurable AI-provider abstraction

## Success criteria

- A new user can create and verify an account, sign in, reset a password, and sign out.
- Every core dashboard interaction persists across refreshes and sessions.
- Two users cannot access each other’s private data through the UI or direct API requests.
- Shared-feeling percentages reveal only cohort-level app activity and disappear below the privacy threshold.
- Highlight creation succeeds even when the AI provider is unavailable.
- The repository can be started from documented instructions without relying on uncommitted configuration.
- The application passes its automated database, frontend, end-to-end, and production-build checks.
