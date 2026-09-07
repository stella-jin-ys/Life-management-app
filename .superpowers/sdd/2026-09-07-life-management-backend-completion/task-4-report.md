# Task 4 report: authenticated profile and Settings flow

Date: 2026-09-07

## Result

Implemented the authenticated profile update and Settings flow. The application code, focused tests, and test coverage commit are in `7cf84ec8b731f16b3532dbf56930e00970040ea5` (`feat: add profile settings persistence`).

## Files changed

- `src/features/auth/authApi.js`
  - Added `validateProfile({ displayName, timezone })`.
  - Added `updateProfile(userId, { displayName, timezone })`.
- `src/features/auth/AuthProvider.jsx`
  - Exposes `refreshProfile()` through the auth context.
- `src/main.jsx`
  - Puts `/reset-password` under `PublicOnlyRoute` with the other authentication routes.
- `src/components/AppShell.jsx`
  - Renders the Settings page for an authenticated user after the existing Settings sidebar destination is selected.
- `src/features/settings/SettingsPage.jsx`
  - New responsive Settings form and save states.
- `src/styles.css`
  - Adds narrowly scoped Settings-page layout/form rules.
- `src/features/auth/auth.test.jsx`
  - Adds session restore/profile refresh and route-redirect coverage.
- `src/features/auth/authApi.test.js`
  - Adds direct profile-update API boundary coverage.
- `src/features/settings/settings.test.jsx`
  - Adds Settings validation and save-state coverage.

No migration, RLS policy, secret, or environment file was changed. `Sidebar.jsx` already contained an enabled `settings` destination and did not need a code change.

## Interface details

- `updateProfile(userId, { displayName, timezone })` normalizes and validates input, updates only `profiles.id = userId`, selects the saved row, throws a Supabase error when one is returned, and otherwise returns that saved row.
- `AuthProvider` now provides `refreshProfile()`. It reads the current session user's `profiles` row, commits it to auth context, clears the profile-load error, and returns the refreshed row.
- `SettingsPage` calls `updateProfile`, then awaits `refreshProfile`, so the existing desktop sidebar account footer and mobile greeting receive the changed display name immediately through their existing `profile` prop.

## Validation and route decisions

- Display names are trimmed; blank names fail with `Please add a display name.` and names longer than the schema's 80-character limit fail locally.
- Timezones are trimmed, required, and accepted only if `Intl.DateTimeFormat` accepts them as an explicit IANA timezone. Missing or invalid values fail with `Choose a valid IANA timezone.`
- The Settings page has a disabled/saving state, an accessible success message, and recoverable user-facing errors. Validation messages remain specific; persistence/refresh failures remain generic.
- Signed-out traffic reaches the four allowed auth routes (`/login`, `/signup`, `/forgot-password`, `/reset-password`). The existing catch-all flows through the protected root and then to login for other paths.
- Signed-in users are redirected from all four auth routes to `/`, including reset-password.
- Demo mode remains unchanged: it bypasses `AuthenticatedRoutes` as before. The Settings surface mounts only with an authenticated user, so demo mode does not access Supabase/auth context.

## Verification

### TDD evidence

1. Initial tests before implementation:

   ```text
   npm run test:run -- src/features/auth/auth.test.jsx src/features/settings/settings.test.jsx
   Test Files  2 failed (2)
   Tests  1 failed | 9 passed (10)
   Errors  1 error
   ```

   The missing `refreshProfile` produced `TypeError: refreshProfile is not a function`; the absent Settings component produced Vite's unresolved-import error.

2. Direct missing-timezone regression before its implementation fix:

   ```text
   npm run test:run -- src/features/auth/authApi.test.js
   Test Files  1 failed (1)
   Tests  1 failed | 1 passed (2)
   ```

   `updateProfile` resolved instead of rejecting when `timezone` was omitted. The explicit required-timezone guard was then added.

3. Focused auth/profile/settings suite after the implementation:

   ```text
   npm run test:run -- src/features/auth/authApi.test.js src/features/auth/auth.test.jsx src/features/settings/settings.test.jsx
   Test Files  3 passed (3)
   Tests  15 passed (15)
   ```

4. Full browser-unit suite:

   ```text
   npm run test:run
   Test Files  8 passed (8)
   Tests  47 passed (47)
   ```

   The run emitted existing React Router future-flag and Supabase multiple-client test-runtime warnings, with no failures.

5. Production build:

   ```text
   npm run build
   ✓ 1648 modules transformed.
   ✓ built in 3.42s
   ```

6. Compiled-bundle secret scan:

   ```text
   rg -n -i "service[_-]?role|openai" dist
   rg -n --pcre2 "sk-[A-Za-z0-9_-]{20,}|sb_secret_[A-Za-z0-9_-]+" dist
   ```

   Both commands returned no matches. `git diff --check` also returned no output.

## Blockers and limits

- Live Supabase/Auth/database E2E verification remains blocked by the known local Supabase infrastructure issue recorded in Task 1: the required local images/credentials are unavailable. No live auth or database attempt was invented or represented as verified.
- The relevant browser unit tests, route tests, API contract tests, build, and secret-bundle scan are verified locally.

## Commit

- `7cf84ec8b731f16b3532dbf56930e00970040ea5` — `feat: add profile settings persistence`

## Fix round 1: password recovery routing

Date: 2026-09-07

### Root cause

The original Settings-flow change placed `/reset-password` below `PublicOnlyRoute`. Supabase sends a `PASSWORD_RECOVERY` auth event with a session when a user returns on a recovery link. Since the provider discarded the event and `PublicOnlyRoute` treated every session alike, it redirected that recovery session to `/` before `ResetPasswordPage` could render.

`requestPasswordReset` was already correct: it sends the user to `${window.location.origin}/reset-password`. No reset-request URL or password-update API behavior changed in this round. Supabase documents `PASSWORD_RECOVERY` as the event used to show the password-update UI after a recovery redirect: <https://supabase.com/docs/reference/javascript/auth-onauthstatechange>.

### Implementation

- `AuthProvider` now retains `isPasswordRecovery` only after a `PASSWORD_RECOVERY` event. A subsequent `SIGNED_IN` or `SIGNED_OUT` clears it.
- `PublicOnlyRoute` accepts `allowPasswordRecovery` (false by default). A session can pass only when both that opt-in and `isPasswordRecovery` are true.
- `main.jsx` uses that opt-in only around `/reset-password`; login, signup, and forgot-password remain under the unchanged default guard.
- No route becomes generally authenticated/public, and no database, RLS, environment, or secret handling changes.
- The Settings regression test covers a rejected `updateProfile` request and asserts the user's edited display name and timezone remain in the inputs.

### Tests and verification

1. Red recovery-route reproduction before the implementation:

   ```text
   npm run test:run -- src/features/auth/auth.test.jsx src/features/settings/settings.test.jsx
   Test Files  1 failed | 1 passed (2)
   Tests  1 failed | 14 passed (15)
   ```

   A recovery session on `/reset-password` rendered `Private route` instead of the `Choose a new password` form. The new Settings rejected-save test passed against the existing error path.

2. Focused green verification after the implementation:

   ```text
   npm run test:run -- src/features/auth/auth.test.jsx src/features/settings/settings.test.jsx
   Test Files  2 passed (2)
   Tests  15 passed (15)
   ```

   The route tests now prove that a regular session is redirected away from reset-password, a `PASSWORD_RECOVERY` session reaches the reset form, and the three ordinary authenticated routes still redirect.

3. Scoped frontend suite and build:

   ```text
   npm run test:run -- src/App.test.jsx src/features/auth/auth.test.jsx src/features/auth/authApi.test.js src/features/settings/settings.test.jsx
   Test Files  4 passed (4)
   Tests  27 passed (27)

   npm run build
   ✓ 1648 modules transformed.
   ✓ built in 3.38s
   ```

   The test process emitted the existing React Router future-flag warning only; there were no failures. `git diff --check` returned no output before commit.

### Fix commit

- `c9b8f334550020244b6ce2348526f8b4e0d229d2` — `fix: allow password recovery reset flow`
