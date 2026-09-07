# Task 2: Supporting-module database report

Date: 2026-09-07
Status: DONE_WITH_CONCERNS

## Files changed

- Created `supabase/migrations/202609070001_supporting_modules.sql`.
- Created `supabase/tests/supporting_modules.test.sql`.
- Created this report at `.superpowers/sdd/2026-09-07-life-management-backend-completion/task-2-report.md`.

No pre-existing migrations, tests, or unrelated user changes were modified.

## Schema decisions

- Added the six private `public` tables consumed by the planned module API: `tasks`, `study_logs`, `workout_entries`, `sleep_entries`, `diary_entries`, and `finance_entries`.
- Every table has a generated UUID primary key, a non-null `user_id uuid references auth.users(id) on delete cascade`, and `created_at`/`updated_at` timestamps.
- Tasks use `due_date` and `is_complete`; study, workout, sleep, diary, and finance rows use `entry_date`. Finance values are stored as integer `amount_cents`.
- Constraints enforce the exact requested bounds: task titles 1–240; study topics 1–240 and notes at most 2,000; workout activities 1–120 and minutes 0–1,440; sleep minutes 0–1,440; diary content 1–5,000; finance labels 1–160 and amount cents -100,000,000–100,000,000.
- Workout, sleep, and diary rows each have `unique (user_id, entry_date)`. Every table has a `(user_id, date)` query index; tasks use `due_date` and the remaining tables use `entry_date`.
- Each table uses the existing `public.set_updated_at()` trigger function. RLS is enabled, all table privileges are revoked from `anon` and `public`, CRUD is granted only to `authenticated`, and select/insert/update/delete policies enforce `user_id = auth.uid()`.

## Tests

`supabase/tests/supporting_modules.test.sql` plans 48 pgTAP assertions:

- 6 table-existence assertions.
- 17 invalid-value assertions.
- 3 same-day uniqueness assertions.
- 6 `updated_at` trigger assertions.
- 4 cross-user isolation assertions (select, insert, update, delete).
- 6 anonymous-denial assertions.
- 6 auth-user cascade assertions.

No pgTAP assertions executed because the local Supabase/Postgres service is unavailable. No passing database-test count is claimed.

## Commands and results

1. `npm run test:db` before the migration: pgTAP did not start. The sandboxed Supabase CLI failed while opening `/Users/stella/.supabase/telemetry.json.tmp.<uuid>` with `EPERM`.
2. `npm run db:reset` with external CLI/Docker access: exit 1. Supabase returned `LegacyResetLocalDbNotRunningError: supabase start is not running.`
3. `npm run test:db` with external CLI/Docker access: exit 1. The CLI could not connect to `127.0.0.1:54322` and reported `ECONNREFUSED`; pgTAP did not start.
4. `git diff --check -- supabase/migrations/202609070001_supporting_modules.sql supabase/tests/supporting_modules.test.sql`: exit 0.
5. Static migration/test audit: exit 0 and reported `{"tables":6,"rls":6,"indexes":6,"triggers":6,"policies":24,"assertions":48,"planned":48}`.

## Environment blockers

The local Supabase stack is not running. This follows the already-recorded unresolved storage-image/registry startup blocker; without a running local Postgres service, `db:reset` and `test:db` cannot apply the migration or execute pgTAP. The first sandboxed CLI attempt also cannot write its user-level telemetry file, which is a separate sandbox boundary issue.

## Commits

- `b0129164b7a6323b2c371b6c52c77a0de6b07e02` — `feat: add private supporting module schema` (migration and pgTAP tests).
