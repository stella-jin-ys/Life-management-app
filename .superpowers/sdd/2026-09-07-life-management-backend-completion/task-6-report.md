# Task 6: Visible supporting modules report

## Status

Implemented the six authenticated supporting-module pages and their Supabase persistence boundary. Demo mode remains local-only.

## Files changed

- Created `src/features/modules/moduleApi.js`.
- Created `src/features/modules/useModuleData.js`.
- Created `src/features/modules/ModulePage.jsx`.
- Created `src/features/modules/module.test.jsx`.
- Created `e2e/modules.spec.js`.
- Modified `src/main.jsx`, `src/App.jsx`, `src/App.test.jsx`, and `src/styles.css`.
- Created this report.

## Route and API decisions

- Added protected routes for `/tasks`, `/study`, `/workout`, `/sleeping`, `/diary`, and `/finance`. Added `/settings` as a protected route that reuses the existing `SettingsPage` through `AppShell`.
- Sidebar navigation now takes every visible supporting-module destination to its real route. The same `activeSection` contract drives the desktop rail and the mobile/tablet drawer.
- `moduleApi.js` implements the exact requested functions against the configured browser Supabase client. Read requests include the authenticated `user_id`; date-range and daily reads include their requested local-date bounds. The task mutation signatures do not accept a user id, so they rely on the existing authenticated client and Task 2 RLS policy for ownership enforcement.
- Workout, sleep, and diary writes use their schema's `(user_id, entry_date)` upsert conflict key. No policy, service-role key, or RLS behavior was changed.
- `useModuleData` exposes `{ data, loading, saving, error, reload, create, update, remove }`. Failed saves retain existing data and leave page form values unchanged; only a successful save clears a non-diary form.
- Demo mode creates and updates entries in component state only and never imports a persistence fallback or calls Supabase.

## Validation and presentation

- Validates trimmed titles/topics/diary content/labels against the Task 2 lengths, notes against 2,000 characters, integer minutes from 0 to 1,440, integer finance cents within the schema range, decimal finance form values, and real calendar dates.
- Client-side validation prevents a request and keeps all typed field values visible for correction. Persistence failures show a retryable error and also preserve the form.
- Workout renders a seven-day bar chart: zero-minute rest days are thin, and today's bar is Moss. Sleeping renders seven-day SVG data with a dashed average line.

## Commands and results

1. `npm run test:run -- src/features/modules/module.test.jsx` — exit 0: 1 file, 11 tests passed.
2. `npm run build` — exit 0: Vite production build completed; 1,651 modules transformed.

Earlier during implementation, `npm run test:run -- src/App.test.jsx src/features/modules/module.test.jsx` also exited 0 with 2 files and 24 tests passed. The final requested verification was limited to the target module suite and build above.

## Blockers and concerns

- Local Supabase/Postgres remains unavailable under the task ledger constraint. Database tests and the new `e2e/modules.spec.js` workflow were intentionally not run; no live database or end-to-end persistence behavior is claimed.
- Per the final instruction, no broader frontend suite or E2E command was run after the final targeted verification.
- Pre-existing uncommitted changes were preserved: Task 1's report, `deno.lock`, the existing plan file, and `supabase/.temp/` were not staged.

## Commits

- `dbf0779` — `feat: add persisted supporting module pages`

## Fix round 1

### Review findings addressed

- **Demo module routes:** Root cause: demo mode mounted `<App />` directly instead of a route tree. Sidebar navigation changed the URL to a supporting-module path, but there was no component mounted at that path. Added `src/features/modules/DemoRoutes.jsx`, a BrowserRouter child route tree that renders the six module pages without `AuthProvider`, a user, or a Supabase request. `main.jsx` uses it only for the existing `VITE_DEMO_MODE` or development `?demo` condition. Authenticated routes and their `ProtectedRoute` guard are unchanged.
- **Persistence coverage:** Expanded `src/features/modules/module.test.jsx` to exercise `listTasks`, `toggleTask`, `deleteTask`, `listStudyLogs`, `listWorkoutEntries`, `upsertSleepEntry`, `getDiaryEntry`, `upsertDiaryEntry`, and `listFinanceEntries`, in addition to the previously covered APIs.
- **Recoverable form failure:** Added a rendered Finance page test that forces a real module API save response to fail and asserts that both typed inputs remain in place while the retry error is displayed.

### Files changed in this round

- Created `src/features/modules/DemoRoutes.jsx`.
- Modified `src/main.jsx`.
- Modified `src/features/modules/module.test.jsx`.
- Appended this fix report.

### Verification

1. `npm run test:run -- src/features/modules/module.test.jsx` — exit 0: 1 file, 14 tests passed.
2. `npm run test:run -- --exclude '.worktrees/**'` — exit 0: 9 files, 68 tests passed.
3. `npm run build` — exit 0: Vite production build completed; 1,652 modules transformed.

The scoped suite emitted only existing, non-failing React Router future-flag and Supabase GoTrue-client test warnings.

### Remaining limitation

The local Supabase/Postgres stack remains unavailable. No database or Playwright E2E run is claimed; the demo-route coverage is an isolated rendered route test and makes no auth or Supabase call.

### Fix commit

- `f4d99ba` — `fix: keep supporting modules available in demo mode`
