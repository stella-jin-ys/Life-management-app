# Task 3 report: Harden core dashboard persistence

## Status

Implemented and committed the core dashboard persistence hardening.

## Files changed

- `src/features/dashboard/date.js` — added IANA-timezone local-day derivation.
- `src/lib/lifeApi.js` — uses the date utility, retains a compatibility re-export, suppresses unavailable signal percentages, and scopes fallback highlight writes by `user_id`.
- `src/lib/lifeApi.test.js` — fake Supabase client tests for query payloads, authenticated-user scope, local dates, and privacy-safe signal data.
- `src/features/dashboard/useDashboardData.js` — optimistic core mutations now roll back failed mood, feeling, health, milestone, and highlight changes; uses a single retry message.
- `src/features/dashboard/useDashboardData.test.jsx` — covers mood and health rollback, failed highlight form preservation, and privacy-safe signal display.
- `src/components/HighlightsPanel.jsx` — preserves submitted text after a failed persisted highlight and relies on the dashboard retry message.
- `src/components/LowBatteryPanel.jsx` — renders `—` and a zero-width meter for unavailable privacy-threshold signals; it never appends `%` to unavailable values.

## Interfaces and decisions

- `localDate(timezone, date?)` in `src/features/dashboard/date.js` builds `YYYY-MM-DD` from `Intl.DateTimeFormat(...).formatToParts`, so records use the profile IANA timezone rather than the browser/server UTC date. `lifeApi.js` re-exports it for existing callers.
- `loadDashboard(userId, timezone)` preserves its specified return contract. Direct table reads retain `user_id` filters; daily mood and health reads use the profile-derived `entry_date`.
- `saveMood` and `saveHealth` include `user_id` and local `entry_date` in their daily upsert payloads. `saveFeeling` and `createHighlight` include `user_id`; fallback compliment updates include both the highlight id and user id. `saveMilestone(id, complete)` keeps its prescribed two-argument contract and depends on the existing milestone ownership RLS policy through its goal relationship.
- Optimistic UI writes restore their prior local state on failure. Persisted highlights use a temporary item, remove it on failure, and reject the promise so `HighlightsPanel` leaves the form input unchanged. All persistence failures use `We could not save that change. Please try again.`
- Server signals show a percentage only when `status === 'available'`; `insufficient_data` and other unavailable statuses produce `null` internally and `—` visually. Demo signals retain their authored percentages.

## Commands and results

| Command | Result |
| --- | --- |
| `npm run test:run -- src/lib/lifeApi.test.js src/features/dashboard/useDashboardData.test.jsx` (red) | Failed as expected: missing date module; rollback and retry expectations failed. |
| Same targeted command (green) | Passed: 2 files, 8 tests. |
| `npm run test:run -- --exclude '.worktrees/**'` | Passed: 6 files, 28 tests. Existing stderr warnings: multiple GoTrue clients and React Router v7 future flags. |
| `npm run build` | Passed: Vite production build completed. |
| `git diff --check` | Passed with no whitespace errors. |
| `npm run test:db` | Blocked: local Postgres at `127.0.0.1:54322` refused the connection after the CLI was permitted to write telemetry. |

## Exact test counts

- Targeted Task 3 tests: 8 passed, 0 failed.
- Full frontend/unit suite: 28 passed, 0 failed, across 6 files.
- Live database tests: 0 executed because local Supabase/Postgres is unavailable.

## Blockers

Local Supabase is not running. `supabase test db` reports `connect ECONNREFUSED 127.0.0.1:54322` and suggests starting Docker/Supabase. This does not affect the completed frontend/unit or production-build checks.

## Commit hashes

- Implementation: `2bf926fa673505b0a033af168adcebab82da5c9f` — `feat: persist core dashboard workflows`

## Fix round 1: persistence sequencing and rollback correctness

### Findings addressed

- Added per-resource mutation queues and monotonically increasing versions in `useDashboardData`. Mood, feeling, health, and each milestone now submit sequentially. A stale failure cannot overwrite newer UI intent, and serialization prevents an older request from reaching Supabase after a newer request.
- Added confirmed-state tracking for each persisted dashboard value. A latest failure restores the last server-confirmed mood, feeling/signal, health metrics, or individual milestone without rolling back unrelated newer changes.
- Resolved the dashboard timezone once per hook render. The same profile timezone, or the same browser IANA fallback, is supplied to `loadDashboard`, `saveMood`, and `saveHealth`.
- Changed optimistic highlight temporary IDs to use `crypto.randomUUID()` with a timestamp-and-random fallback.
- Made `saveMilestone` request and require the updated record (`select('id').single()`) after filtering by its ID. This turns an RLS-denied/no-match update into a rejected mutation that rolls back visibly; ownership remains enforced by the existing milestone-through-goal RLS policy.

### Regression coverage

- Added failure rollback tests for feeling/signal and milestone persistence.
- Added rapid consecutive mutation tests for mood, feeling, health, and a single milestone. Each asserts that the second save is not issued until the first settles and that the latest optimistic state wins after an older failure or success.
- Added a non-UTC browser-timezone fallback test that proves loading and both daily save paths use the same `Pacific/Auckland` value.
- Added a fake Supabase test that proves `saveMilestone` filters the requested record and requests its returned ID.

### Fix-round commands and results

| Command | Result |
| --- | --- |
| `npm run test:run -- src/features/dashboard/useDashboardData.test.jsx src/lib/lifeApi.test.js` (red) | Failed as expected: 4 serialization tests observed concurrent requests; milestone test observed no selected record. |
| Same targeted command (green) | Passed: 2 files, 16 tests. |
| `npm run test:run -- --exclude '.worktrees/**'` | Passed: 6 files, 36 tests. Existing stderr warnings remain from GoTrue duplicate clients and React Router v7 future flags. |
| `npm run build` | Passed: Vite production build completed. |
| `git diff --check` | Passed with no whitespace errors. |

### Fix-round commit

- `2df549b1b09672594f01e7e0992b6367441264a3` — `fix: serialize dashboard persistence mutations`
