# Dashboard Real Data and Feature Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the authenticated dashboard display real Supabase-backed summaries and add complete input/log pages for Highlights, Diet, Goals, Tasks, Study, Workout, Sleeping, Diary, and Finance, while keeping local demo mode functional and AI compliments optional.

**Architecture:** Extend the existing feature-specific Supabase tables and APIs. Add one `meal_entries` table, focused helpers for deterministic Low Battery estimates and meal feedback, and dedicated page components for Highlights, Diet, and Goals. Reuse the existing authenticated shell, `ModulePage`, RLS policies, and deterministic compliment fallback; do not add an AI dependency to the first delivery.

**Tech Stack:** React 18, React Router 6, Vite, Supabase Auth/Postgres/RLS, Vitest, Testing Library, Playwright, Supabase CLI.

**Spec:** `docs/superpowers/specs/2026-09-09-dashboard-real-data-and-feature-pages-design.md`

## Global Constraints

- The local demo must run with `VITE_DEMO_MODE=true` and no Supabase credentials.
- Hosted mode must use only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the browser.
- AI generation is deferred; deterministic compliments remain the supported first-release behavior.
- Every Supabase query must remain scoped to the signed-in user's ID and protected by RLS.
- Meal feedback is supportive wellness copy, not medical advice.
- Low Battery estimates must be labeled as estimates until the server aggregate is available.
- Preserve existing routes and behavior for Tasks, Study, Workout, Sleeping, Diary, and Finance.
- Use test-first development for every production behavior change: write a failing test, verify the failure, implement the smallest change, then verify green.

---

### Task 1: Add the meal database model and RLS coverage

**Files:**
- Create: `supabase/migrations/202609090001_meal_entries.sql`
- Modify: `supabase/tests/supporting_modules.test.sql`
- Modify: `src/lib/supabase/database.types.ts`

**Interfaces:**
- Produces table `public.meal_entries` with columns `id`, `user_id`, `entry_date`, `meal_type`, `food`, `has_produce`, `has_protein`, `has_carbohydrate`, `has_healthy_fat`, `created_at`, and `updated_at`.
- Produces RLS policies `meal_entries_select_own`, `meal_entries_insert_own`, `meal_entries_update_own`, and `meal_entries_delete_own`.

- [ ] **Step 1: Add failing database assertions.**

Add to `supabase/tests/supporting_modules.test.sql`:

```sql
select has_table('public', 'meal_entries', 'meal entries table exists');
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000011', true);
set local role authenticated;

insert into public.meal_entries
  (user_id, entry_date, meal_type, food, has_produce, has_protein)
values
  (auth.uid(), '2026-09-07', 'lunch', 'Rice bowl', true, true);

select throws_ok(
  $$insert into public.meal_entries (user_id, entry_date, meal_type, food)
    values (auth.uid(), current_date, 'lunch', '')$$,
  '23514', null, 'blank foods are rejected'
);
select throws_ok(
  $$insert into public.meal_entries (user_id, entry_date, meal_type, food)
    values (auth.uid(), current_date, 'brunch', 'Toast')$$,
  '23514', null, 'invalid meal types are rejected'
);
select is((select count(*)::integer from public.meal_entries), 1, 'user one can read their meal');

reset role;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000022', true);
set local role authenticated;
select is((select count(*)::integer from public.meal_entries), 0, 'user two cannot read user-one meals');
```

- [ ] **Step 2: Run the database test and verify it fails because the table is missing.**

Run: `npm run test:db`

Expected: failure identifying the missing `meal_entries` table.

- [ ] **Step 3: Add the migration.**

Create the table with the exact constraints from the spec, add the `(user_id, entry_date, created_at desc)` index, attach `set_updated_at()` as the update trigger, enable RLS, revoke access from `anon` and `public`, grant authenticated CRUD, and add four `auth.uid()` policies.

- [ ] **Step 4: Update generated database types.**

Add the `meal_entries` Row/Insert/Update shapes to `src/lib/supabase/database.types.ts`, including the four boolean balance fields and the four-value `meal_type` union.

- [ ] **Step 5: Run the database test and verify it passes.**

Run: `npm run test:db`

Expected: all database assertions pass, including the new meal constraints and user isolation checks.

- [ ] **Step 6: Commit the database slice.**

```bash
git add supabase/migrations/202609090001_meal_entries.sql supabase/tests/supporting_modules.test.sql src/lib/supabase/database.types.ts
git commit -m "feat: add user-scoped meal entries"
```

### Task 2: Add deterministic wellbeing and meal-domain helpers

**Files:**
- Create: `src/lib/wellbeing.js`
- Create: `src/lib/wellbeing.test.js`

**Interfaces:**
- `getEstimatedFeelingSignal(feelingId, entryDate) -> { percentage, status: 'estimated' }`
- `getMealBalance(meals) -> { represented: string[], missing: string[], score: number, feedback: string }`

- [ ] **Step 1: Write failing pure-function tests.**

Add tests for stable Low Battery output:

```js
test('returns the same bounded estimate for the same feeling and day', () => {
  const first = getEstimatedFeelingSignal('drained', '2026-09-09')
  const second = getEstimatedFeelingSignal('drained', '2026-09-09')

  expect(second).toEqual(first)
  expect(first.percentage).toBeGreaterThanOrEqual(42)
  expect(first.percentage).toBeLessThanOrEqual(78)
  expect(first.status).toBe('estimated')
})
```

Add meal feedback tests for no meals, one missing group, and all four groups represented.

- [ ] **Step 2: Run the focused test and verify it fails because the helper module is missing.**

Run: `npm run test:run -- src/lib/wellbeing.test.js`

Expected: module import failure.

- [ ] **Step 3: Implement the helpers.**

Use a small deterministic string hash for `feelingId + ':' + entryDate`, map it to 42–78%, and return `status: 'estimated'`. For meal balance, count unique represented groups across meal rows, calculate `Math.round(representedCount / 4 * 100)`, and generate the three supportive messages described in the spec.

- [ ] **Step 4: Run the focused test and verify it passes.**

Run: `npm run test:run -- src/lib/wellbeing.test.js`

Expected: all helper tests pass.

- [ ] **Step 5: Commit the helper slice.**

```bash
git add src/lib/wellbeing.js src/lib/wellbeing.test.js
git commit -m "feat: add wellbeing dashboard helpers"
```

### Task 3: Extend API and dashboard loading for real highlights, meals, and task rows

**Files:**
- Modify: `src/lib/lifeApi.js`
- Modify: `src/lib/lifeApi.test.js`
- Modify: `src/features/dashboard/useDashboardData.js`
- Modify: `src/features/dashboard/useDashboardData.test.jsx`

**Interfaces:**
- `listMeals(userId, entryDate) -> Promise<MealEntry[]>`
- `createMeal(userId, values) -> Promise<MealEntry>`
- `deleteMeal(id) -> Promise<void>`
- `listHighlights(userId, limit = 20) -> Promise<MappedHighlight[]>`
- `listGoals(userId) -> Promise<Goal[]>`
- `createGoal(userId, title, why) -> Promise<GoalRow>`
- `createMilestone(goalId, label, position) -> Promise<MilestoneRow>`
- `updateGoalStatus(goalId, status) -> Promise<GoalRow>`
- `loadDashboard()` returns `highlights` limited to four, `meals`, `mealFeedback`, and `supporting.tasks.rows`.

- [ ] **Step 1: Add failing API tests.**

Extend the fake Supabase client tests to assert `listMeals` filters by `user_id` and `entry_date`, `createMeal` writes the four balance booleans, and `loadDashboard` maps four highlights plus task rows and meals. Add a test that `createGoal` and `createMilestone` send user-scoped payloads.

- [ ] **Step 2: Run focused API tests and verify the new assertions fail.**

Run: `npm run test:run -- src/lib/lifeApi.test.js`

Expected: missing-export or expectation failures for meals, goals, and dashboard projections.

- [ ] **Step 3: Implement validation and API functions.**

Add meal validation for the four allowed meal types, non-empty food up to 240 characters, and boolean group fields. Add the meal list/create/delete functions, goal list/create/status functions, and milestone create function. Keep user scoping in every read and write.

- [ ] **Step 4: Update `loadDashboard`.**

Change the highlights query to fetch the newest 10 and map/slice the first four for the dashboard. Add today’s meal query. Change the tasks query to select `id, title, due_date, is_complete`, order incomplete tasks first, and map a compact `rows` list while retaining `complete` and `total`. Generate `mealFeedback` with `getMealBalance`.

- [ ] **Step 5: Update the dashboard hook.**

Add `meals` and `mealFeedback` to `emptyState`, route meal creation through `createMeal`, and preserve optimistic updates plus rollback for task checkbox changes. Use `getEstimatedFeelingSignal` only when the server signal has `status === 'insufficient_data'`.

- [ ] **Step 6: Run focused tests and verify they pass.**

Run: `npm run test:run -- src/lib/lifeApi.test.js src/features/dashboard/useDashboardData.test.jsx`

Expected: all focused tests pass.

- [ ] **Step 7: Commit the API/dashboard data slice.**

```bash
git add src/lib/lifeApi.js src/lib/lifeApi.test.js src/features/dashboard/useDashboardData.js src/features/dashboard/useDashboardData.test.jsx
git commit -m "feat: project real life data onto dashboard"
```

### Task 4: Render dashboard projections and navigation links

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/components/HighlightsPanel.jsx`
- Modify: `src/components/HealthPanel.jsx`
- Modify: `src/components/SupportingTiles.jsx`
- Modify: `src/components/LowBatteryPanel.jsx`
- Modify: `src/components/GoalsPanel.jsx`
- Modify: `src/App.test.jsx`
- Modify: `src/styles.css`

**Interfaces:**
- `HighlightsPanel({ highlights, onAddHighlight, onOpenPage, isDemo })`
- `HealthPanel({ metrics, meals, mealFeedback, onAdjustMetric, onOpenPage })`
- `SupportingTiles({ summaries, onOpenPage, onToggleTask })`

- [ ] **Step 1: Add failing component tests.**

Test that four supplied highlights render below the garden, a fifth does not render in the dashboard panel, meal food and balance feedback render, and task rows render real checkbox states. Test that card “View all” links navigate to `/highlights`, `/health`, `/goals`, and the supporting module routes.

- [ ] **Step 2: Run the focused component tests and verify they fail.**

Run: `npm run test:run -- src/App.test.jsx`

Expected: failures because current panels do not receive or render the new props.

- [ ] **Step 3: Implement dashboard rendering.**

Pass the new data from `App.jsx`. Render the four latest highlights after `.bloom-chart`, add a compact meal list and feedback to `HealthPanel`, and render up to three task rows with accessible checkboxes in `SupportingTiles`. Keep existing charts for Study, Workout, and Sleeping and pass their page navigation callbacks.

- [ ] **Step 4: Add page links without breaking controls.**

Use explicit text links or buttons in each card header. Ensure the highlight quick form, health +/- controls, task checkboxes, milestone checkbox, and Low Battery feeling buttons do not trigger card navigation.

- [ ] **Step 5: Update styles for the new compact rows.**

Add only focused styles for `.highlight-feed`, `.dashboard-highlight`, `.meal-preview`, `.meal-feedback`, and `.task-preview-list`. Keep dashboard card heights usable on desktop and mobile; do not add fictional data to empty states.

- [ ] **Step 6: Run focused tests and verify they pass.**

Run: `npm run test:run -- src/App.test.jsx`

Expected: dashboard projection and navigation tests pass.

- [ ] **Step 7: Commit the dashboard UI slice.**

```bash
git add src/App.jsx src/components/HighlightsPanel.jsx src/components/HealthPanel.jsx src/components/SupportingTiles.jsx src/components/LowBatteryPanel.jsx src/components/GoalsPanel.jsx src/App.test.jsx src/styles.css
git commit -m "feat: show real summaries on dashboard cards"
```

### Task 5: Add dedicated Highlights, Diet, and Goals pages

**Files:**
- Create: `src/features/highlights/HighlightsPage.jsx`
- Create: `src/features/health/HealthPage.jsx`
- Create: `src/features/goals/GoalsPage.jsx`
- Create: `src/features/highlights/highlights.test.jsx`
- Create: `src/features/health/health.test.jsx`
- Create: `src/features/goals/goals.test.jsx`
- Modify: `src/main.jsx`
- Modify: `src/features/modules/DemoRoutes.jsx`
- Modify: `src/features/modules/moduleApi.js`
- Modify: `src/features/modules/useModuleData.js`

**Interfaces:**
- `HighlightsPage({ user, profile })` uses `listHighlights` and `createHighlight`.
- `HealthPage({ user, profile })` uses `listMeals`, `createMeal`, `deleteMeal`, `loadDashboard`, and `saveHealth`.
- `GoalsPage({ user })` uses `listGoals`, `createGoal`, `createMilestone`, `saveMilestone`, and `updateGoalStatus`.

- [ ] **Step 1: Add failing page-render tests.**

Render each page with a mocked authenticated API and assert its form labels, loading state, empty state, and saved entry rendering. Add a route test that `/highlights`, `/health`, and `/goals` render in both `AppRoutes` and `DemoRoutes`.

- [ ] **Step 2: Run the focused tests and verify they fail.**

Run: `npm run test:run -- src/features/highlights/highlights.test.jsx src/features/health/health.test.jsx src/features/goals/goals.test.jsx`

Expected: module import or route failures because the pages do not exist.

- [ ] **Step 3: Implement Highlights page.**

Provide a highlight input, save button, loading/error state, and a recent feed that displays compliments and pending/fallback status. In demo mode, use the existing local `useDashboardData` behavior and never call Supabase.

- [ ] **Step 4: Implement Diet page.**

Provide meal type, food, four balance checkboxes, and a save form. Show today’s meals, delete controls, balance score, and supportive feedback. Keep hydration, sleep, and movement controls available by reusing the existing health metric persistence.

- [ ] **Step 5: Implement Goals page.**

Show all user goals grouped by status, create a goal with title/why, add milestones, toggle milestone completion, and mark an active goal completed. Preserve the dashboard rule that the oldest active goal is the focus.

- [ ] **Step 6: Add routes and navigation.**

Add protected routes `/highlights`, `/health`, and `/goals` in `src/main.jsx`; add their demo equivalents in `DemoRoutes.jsx`; update `useShellNavigation` and `useDemoNavigation` so sidebar buttons open pages; keep the dashboard route `/` unchanged.

- [ ] **Step 7: Run focused tests and verify they pass.**

Run: `npm run test:run -- src/features/highlights/highlights.test.jsx src/features/health/health.test.jsx src/features/goals/goals.test.jsx src/features/modules/module.test.jsx`

Expected: all new page and existing module route tests pass.

- [ ] **Step 8: Commit the page slice.**

```bash
git add src/features/highlights src/features/health src/features/goals src/main.jsx src/features/modules/DemoRoutes.jsx src/features/modules/moduleApi.js src/features/modules/useModuleData.js
git commit -m "feat: add highlights diet and goals pages"
```

### Task 6: Complete dedicated-page consistency for existing modules

**Files:**
- Modify: `src/features/modules/ModulePage.jsx`
- Modify: `src/features/modules/moduleApi.js`
- Modify: `src/features/modules/module.test.jsx`
- Modify: `src/styles.css`
- Modify: `src/components/Sidebar.jsx`

**Interfaces:**
- Existing `ModulePage` keeps its current `{ module, user, profile }` props.
- Existing module APIs continue returning database rows after successful saves.

- [ ] **Step 1: Add failing tests for input/log completeness.**

Cover that Tasks shows all current rows with working checkboxes, Study shows the latest keyword, Workout and Sleeping preserve their charts after reload, Diary loads the current entry into the form, and Finance displays saved entries with dates and amounts.

- [ ] **Step 2: Run the focused module tests and verify any gaps fail.**

Run: `npm run test:run -- src/features/modules/module.test.jsx`

Expected: failures only for missing behaviors identified by the new assertions.

- [ ] **Step 3: Implement the smallest module fixes.**

Keep the existing API boundaries. Add missing log rendering, date labels, or controls without replacing the module architecture. Keep one-per-day upsert behavior for Workout, Sleeping, and Diary.

- [ ] **Step 4: Verify module tests pass.**

Run: `npm run test:run -- src/features/modules/module.test.jsx`

Expected: all module tests pass.

- [ ] **Step 5: Commit the module consistency slice.**

```bash
git add src/features/modules/ModulePage.jsx src/features/modules/moduleApi.js src/features/modules/module.test.jsx src/styles.css src/components/Sidebar.jsx
git commit -m "feat: complete feature page logs"
```

### Task 7: Add database isolation, local demo, and hosted-style verification

**Files:**
- Modify: `supabase/tests/supporting_modules.test.sql`
- Modify: `e2e/dashboard.spec.js`
- Modify: `e2e/modules.spec.js`
- Modify: `e2e/isolation.spec.js`
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-09-09-dashboard-real-data-feature-pages.md`

- [ ] **Step 1: Add database assertions for meals and dashboard source tables.**

Add meal cascade deletion, authenticated CRUD, anonymous denial, and cross-user visibility checks. Keep the existing 48 module assertions and update the plan count if the SQL test plan count changes.

- [ ] **Step 2: Add Playwright flows.**

Add tests that:

```js
await page.goto('/highlights')
await page.getByLabel('Highlight').fill('Finished a small task')
await page.getByRole('button', { name: 'Save highlight' }).click()
await expect(page.getByText('Finished a small task')).toBeVisible()

await page.goto('/health')
await page.getByLabel('Food').fill('Rice bowl')
await page.getByLabel('Protein').check()
await page.getByRole('button', { name: 'Save meal' }).click()

await page.goto('/')
await expect(page.getByText('Rice bowl')).toBeVisible()
```

Use the existing authenticated test helper and unique test data so the flow remains isolated.

- [ ] **Step 3: Verify local demo mode.**

Run the Vite app with `VITE_DEMO_MODE=true`, visit `/`, `/highlights`, `/health`, and `/goals`, and confirm inputs work without any Supabase client requests. Add or update demo route tests to assert this explicitly.

- [ ] **Step 4: Verify hosted-style mode.**

Run the frontend test suite with mocked Supabase configuration, build with `VITE_DEMO_MODE=false`, and confirm protected routes render through the Supabase-backed path. Do not require an AI key or Edge Function.

- [ ] **Step 5: Update README instructions.**

Document local demo mode, required hosted Supabase secrets, the new meal migration, and the fact that deterministic compliments are the first-release behavior while AI hosting is deferred.

- [ ] **Step 6: Run the full verification suite.**

Run:

```bash
npm run verify
npm run test:db
npm run test:functions
npm run test:e2e
git diff --check
```

Expected: frontend, database, function contract, end-to-end, and whitespace checks pass. The function tests may validate the optional contract, but the deployment must not require the function to be present.

- [ ] **Step 7: Commit the verification and documentation slice.**

```bash
git add supabase/tests/supporting_modules.test.sql e2e README.md
git commit -m "test: verify real dashboard data flows"
```

### Task 8: Deploy the non-AI hosted build and perform the manual live check

**Files:**
- No source changes expected unless verification reveals a concrete failure.

- [ ] **Step 1: Confirm remote migrations.**

Run: `npx supabase migration list --project-ref yvsanyykqsucqdwacjtt`

Expected: the new meal migration appears in both local and remote columns.

- [ ] **Step 2: Confirm hosted configuration.**

Verify the GitHub Pages workflow receives both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` secrets and sets `VITE_DEMO_MODE=false` when both are present. Do not print secret values.

- [ ] **Step 3: Deploy through the existing Pages workflow.**

Push the implementation branch to the repository's deployment branch only after all automated checks pass. Wait for the build and deploy jobs to succeed.

- [ ] **Step 4: Perform the live non-AI manual check.**

With a signed-in test account, verify four highlights, Low Battery estimate labeling, a meal and feedback, task checkbox persistence, a study keyword, workout bars, sleep line, a goal milestone, diary save, and finance save across navigation and reloads.

- [ ] **Step 5: Record completion.**

Capture the deployment commit, workflow run, and any known optional AI follow-up. Do not claim AI functionality is live; the supported deployed path is deterministic compliment fallback plus real Supabase data.

## Plan self-review

- Spec coverage: meal schema/RLS is Task 1; Low Battery and meal feedback are Task 2; dashboard projections are Tasks 3–4; dedicated pages are Task 5; existing modules are Task 6; demo/hosted verification is Tasks 7–8.
- Placeholder scan: no unfinished markers or unspecified implementation steps are used.
- Interface consistency: `MealEntry` values are shared by the migration, API, hook, and page; goal and milestone APIs are named consistently across Tasks 3 and 5; existing module signatures remain unchanged.
- Delivery alignment: no task requires an AI provider, Edge Function deployment, or secret in the browser.
