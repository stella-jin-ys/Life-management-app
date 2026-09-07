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
