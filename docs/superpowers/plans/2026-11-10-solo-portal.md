# Solo Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** International students sign up at `flowersos.co/solo` with Google or email (no card). They land in the center student portal, running for one built-in "flowersos" center. They get the free tier, enforced by the database, and a global solo leaderboard with automatic 3-week seasons.

**Architecture:**
- One `institution_customers` row (slug `solo`) is the solo center.
- A definer function `solo_join()` adds the signed-in account as a `tenant_students` row.
- `/solo` mounts `CenterPortalApp` under `basename="/solo"`, the way `src/demo/DemoPortal.tsx` mounts it under `/demo/<role>`. It uses its own auth storage key, so solo sessions never mix with staff or main-app sessions.
- The free tier copies the demo-slice rule from drizzle 0108: free solo users read only the ids in `solo_free_slice`.

**Tech Stack:** React 18 + Vite + TanStack Query + React Router, Supabase (Postgres RLS, plpgsql, auth), Lovable Cloud auth wrapper (`src/integrations/lovable/index.ts`), shadcn/ui, vitest.

**Spec:** `docs/superpowers/specs/2026-11-10-solo-portal-and-ring-prizes-design.md` (Part 2). It runs after `docs/superpowers/plans/2026-11-10-ring-prizes.md`, whose migration is 0121.

## Global Constraints

- **Solo center:**
  - Slug `solo`, name `flowersos`, `portal_settings.timezone = 'UTC'`.
  - It is never billing-blocked.
  - Seasons are 21-day sprints, back to back, with `auto_next = true`.
- **Free tier:**
  - 30 Math questions, taken from the CB set (`src/portal/practiceSets.ts`): 8/8/7/7 across the four Math domains.
  - 100 English questions: 25 from each of the four English domains (`ENGLISH` in `src/portal/CenterSpeedLobby.tsx`).
  - Only questions that are active and not `hide_from_practice`.
  - Pick deterministically by `md5(id::text)` order.
  - 1 practice test: the first in `tenant_eligible_tests()` order.
  - The first lesson of every video topic unit, matching the grouping `topicUnits` uses (`src/lib/videoTopics.ts:50`).
  - 10 speed sessions per rolling 24 hours.
  - No step-by-step explanations on screen.
- **Premium:** `solo_students.plan = 'premium'` and `premium_until` is NULL or in the future (`solo_has_premium`, drizzle 0034). Nothing in this plan sets it; payments come later.
- **Board name:** first name + last initial, e.g. "Saran S.". The full name stays in `solo_students.name`.
- **Never narrow staff:**
  - `is_free_solo_user()` is false for platform staff and for anyone who is a member or student of a non-solo center.
  - `solo_join()` refuses those accounts, and accounts linked to a main-app `student_accounts` row.
- **No solo accounts from Mongolia (Saagii, 10 Nov):**
  - Client: when `deviceLanguage()` (`src/lib/publicLanguage.ts`) is `'mon'`, `/solo` shows the block screen, not the sign-in buttons.
  - Server: `solo_join()` refuses to create a new solo student when `current_setting('request.headers', true)::json->>'cf-ipcountry'` is `MN`. A missing header lets the join through. An existing solo student still gets their id back.
  - Block copy (Mongolian first, then English): "Solo бүртгэл зөвхөн Монголоос гадна байгаа сурагчдад зориулагдсан. Монголд flowersos нь Flowers-ийн SAT сургалттай хамт ирдэг." / "Solo accounts are for students outside Mongolia. In Mongolia, flowersos comes with the Flowers SAT course." Button: "Flowers SAT course" linking to `/?lang=mon`.
- **Keep every existing "Demo check ... keep this line when rewriting" clause** when rewriting a policy.
- **Locked items:**
  - CTA copy: "Try Premium free for 7 days".
  - Until checkout exists, it links to `/?lang=eng#pricing`.
- **Migrations:**
  - `0122_solo_center.sql` and `0123_solo_free_tier.sql`, each with a journal entry and a snapshot.
  - Each `when` must be above every `when` on origin/main, including 0121's.
  - Re-check origin/main before pushing.
- **UI:**
  - shadcn only, and the existing `lv-*` / `sky-*` / `student-*` classes.
  - English copy (solo is international).
  - No `Array.at`.
- **Don't open sign-up on the live site without Saagii.**
  - This branch changes the AGENTS.md "Solo sign-up is closed" line in Task 3.
  - Merging is his call, after the migrations are applied.

## Review Focus

1. **A platform admin or a center teacher opens `/solo` in the same browser.** Their main session must be untouched (separate storage key), and `solo_join()` must refuse them, so their question-bank reads are never narrowed. Task 1 test (d) and Task 3 test.
2. **A main-app student whose Google link created an auth account opens `/solo`.** They must not become a solo student. Task 1 test (e).
3. **A free solo user calls the API directly for a non-free question, test or video.** Zero rows. Task 2 tests (a)–(c).
4. **The 11th speed run in 24 hours.** The run insert is refused, and the lobby already shows "0 of 10 left" with Start disabled. Task 2 test (d) and Task 4 test.
5. **`solo_join()` called twice, or by two tabs at once.** One `tenant_students` row and one `solo_students` row. Task 1 test (c).
6. **A student in Ulaanbaatar opens `/solo`.** On a Mongolian device they see the block screen and no sign-in buttons. If they get past it (an English device on another time zone), a new join from a Mongolian IP is refused, while an existing solo student's join still works. Task 1 test (h) and Task 3 test.

---

### Task 1: Database: the solo center and joining (migration 0122)

**Files:**
- Create: `drizzle/migrations/0122_solo_center.sql`, `drizzle/migrations/meta/0122_snapshot.json`
- Modify: `drizzle/migrations/meta/_journal.json`, `src/integrations/supabase/types.ts`

**Interfaces:**
- Produces (SQL):
  - Insert into `institution_customers`: the solo center, slug `solo`, `is_demo = false`. Fill the other NOT NULL columns as `drizzle/migrations/0001` / `0003` / `0108` require. It must be idempotent: `ON CONFLICT` on slug does nothing.
  - `public.solo_institution_id() RETURNS uuid STABLE`, looked up by slug.
  - `public.is_free_solo_user() RETURNS boolean STABLE SECURITY DEFINER`. It is never NULL. It is true only when all of these hold:
    - the caller is an active `tenant_students` row of the solo center
    - `NOT solo_has_premium(auth.uid())`
    - the caller is not `is_platform_staff()`
  - `public.solo_join() RETURNS uuid` (the tenant student id). SECURITY DEFINER, `GRANT EXECUTE TO authenticated`.
    1. Takes an advisory lock on `auth.uid()`.
    2. Refuses, with `RAISE EXCEPTION 'This account can''t join solo'`:
       - staff
       - any `tenant_members` row
       - any `tenant_students` row in another institution
       - a main-app account link: find how a main student's Google link is stored (grep `auth_user_id` / `user_id` on `student_accounts`, and `src/components/student/ConnectedEmailCard.tsx`)
    3. Returns the existing solo student id if there is one.
    4. Refuses a new join from Mongolia: when `nullif(current_setting('request.headers', true), '')::json->>'cf-ipcountry'` is `MN`, `RAISE EXCEPTION 'Solo accounts are for students outside Mongolia'`. A missing header doesn't refuse.
    5. Otherwise inserts a `tenant_students` row:
       - the solo institution
       - `user_id = auth.uid()`
       - `name` = first word of the token's `full_name` / `name` / the email local part, plus ' ' plus the upper-cased first letter of the last word when there are two or more words
       - `phone = 'solo-' || auth.uid()`
       - `class_id NULL`, `active true`, `email_verified_at = now()`
    6. Upserts `solo_students` (`user_id`, full name, email, provider from `auth.jwt()`), with plan left to the trigger.
  - `admin_customer_set_blocked`: refuses the solo center. `CREATE OR REPLACE`, copied from drizzle 0018 with one early `RAISE EXCEPTION`.
  - Seed the first sprint for the solo center, copying how `ToolPages.tsx:96-130` starts Season 1: 21 days from today, `auto_next = true`, season 1, sprint 1.
  - `NOTICE '0122 applied: solo center'`.

- [ ] **Step 1: Write the migration.**
- [ ] **Step 2: PGlite check in the scratchpad (not committed).**
  - Stub the tables and functions it touches, like the ring-prizes plan Task 2.
  - Assert:
    - (a) the row and the sprint exist after running twice
    - (b) a new uid joins, and `name` for "Saran Ochir Sergelen" is `Saran S.`
    - (c) a second `solo_join()` returns the same id with one row each
    - (d) a staff uid and a `tenant_members` uid both raise
    - (e) a uid linked to `student_accounts` raises
    - (f) `is_free_solo_user()` is true for the new solo student, false after setting plan premium with a future `premium_until`, and false for staff
    - (g) `admin_customer_set_blocked(solo id, ...)` raises
    - (h) with `request.headers` set to `{"cf-ipcountry":"MN"}`, a new uid's join raises the Mongolia message and creates no rows; the student from (b) still gets their id back under the same header; with no header set, a new uid joins
- [ ] **Step 3: Add the journal entry and snapshot.** Run `npx tsc --noEmit -p tsconfig.app.json`. Expected: exit 0.
- [ ] **Step 4: Commit** `feat(db): solo center, solo_join and the free-solo check (0122)`

### Task 2: Database: the free tier (migration 0123)

**Files:**
- Create: `drizzle/migrations/0123_solo_free_tier.sql`, `meta/0123_snapshot.json`
- Modify: `_journal.json`, `src/integrations/supabase/types.ts`

**Interfaces:**
- Consumes: `is_free_solo_user()`, `solo_institution_id()` (Task 1).
- Produces:
  - **Table `public.solo_free_slice`:**
    - columns `(item_id uuid PRIMARY KEY, kind text NOT NULL CHECK (kind IN ('question','test','video')))`
    - grants and policy as `demo_slice` (0108:13-21)
    - filled by the rules in Global Constraints, with `NOTICE` counts
  - **The same narrowing clause added beside each demo check:**
    - `AND ((SELECT NOT public.is_free_solo_user()) OR <id in the free slice>)`
    - on the `intl_questions` SELECT policy, the `concept_videos` SELECT policy, the `storage.objects` concept-video policy, `can_read_concept_video`, and `tenant_eligible_tests()`
    - Questions belonging to the free test (find the test→question link in 0106/0108) are readable too, so the free test can run. They don't show in practice lists, because the practice pages filter by set, and the 30/100 come only from `kind = 'question'`.
    - Rewrite each policy whole, starting from its latest definition on origin/main, and keep its demo line.
  - **`guard_tenant_speed_run`:**
    - copied from drizzle 0064
    - adds: if `public.is_free_solo_user()` and the student has ≥ 10 `tenant_speed_runs` in the last 24 hours, `RAISE EXCEPTION 'Free plan: 10 speed sessions a day' USING ERRCODE = 'P0001'`
  - **`public.solo_speed_runs_left() RETURNS int`:**
    - NULL when not a free solo user, else `greatest(0, 10 - runs in the last 24h)`
    - `GRANT EXECUTE TO authenticated`

- [ ] **Step 1: Write the migration.**
- [ ] **Step 2: PGlite check (scratchpad).**
  - Assert, for a free solo user:
    - (a) reading a non-slice question returns 0 rows, and a slice question returns 1
    - (b) `tenant_eligible_tests()` returns only the free test
    - (c) `can_read_concept_video` is false for a non-free video
    - (d) the 11th run insert in 24h raises, and `solo_speed_runs_left()` goes 10 → 0
    - (e) a premium solo user and a normal center student see everything as before
    - (f) a demo user still sees only the demo slice
  - Also assert the slice holds 30 Math rows, 100 English rows, 1 test and one video per topic unit.
- [ ] **Step 3: Add the journal entry and snapshot, and run tsc.** Expected: exit 0.
- [ ] **Step 4: Commit** `feat(db): solo free tier enforced by read rules and the speed guard (0123)`

### Task 3: The `/solo` app: sign in, join, open the portal

**Files:**
- Create: `src/solo/SoloPortal.tsx`, `src/solo/SoloSignIn.tsx`, `src/solo/storageKey.ts` and `src/solo/storageKey.test.ts`
- Modify:
  - `src/integrations/supabase/client.ts` (spread `soloAuthOptions()` beside `demoAuthOptions()`)
  - `src/App.tsx` (route `/solo` and `/solo/*` to `SoloPortal` before the main router, as `/demo` is at :377)
  - `src/portal/centerContext.tsx` (`isSolo` from slug `solo`)
  - `src/portal/CenterPortalApp.tsx` (for solo: no `CenterGoogleGate` nag, and the brand mark plus "flowersos" in place of a center logo)
  - `src/pages/Index.tsx` (pricing buttons already go to `/solo`; nothing to change unless the path differs)
  - `AGENTS.md`: replace the "Solo sign-up is closed until there's a paywall" bullet with: solo sign-up at /solo joins the built-in solo center through `solo_join()`; free solo users read only `solo_free_slice` (0123); paid content stays locked until `solo_students.plan` is premium; staff and center accounts can't join solo
- Delete: `src/pages/public/SoloWelcome.tsx` and its route at `App.tsx:329`

**Interfaces:**
- Consumes: `solo_join()` (Task 1); `lovable.auth.signInWithOAuth` (see `src/portal/centerGoogle.ts:27` for the call shape and redirect).
- Produces:
  - `soloAuthOptions(pathname?: string): { storageKey?: string }`, which returns `{ storageKey: 'sb-solo-auth-token' }` when the path starts with `/solo`. Shape it like `demoAuthOptions` in `src/demo/storageKey.ts`.
  - `SoloPortal`:
    - Session states: `undefined` shows a loader; no session shows `<SoloSignIn />`; a session calls `supabase.rpc('solo_join')`.
    - On a join error, show the message and a Sign out button.
    - On success, render `<BrowserRouter basename="/solo"><CenterPortalApp slug="solo" /></BrowserRouter>` inside the same providers `DemoPortal.tsx:43-55` uses (minus `DemoBar`).
  - `SoloSignIn`:
    - "Continue with Google" calls `lovable.auth.signInWithOAuth('google', { redirect_uri: origin + '/solo' })`.
    - An email field calls `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: origin + '/solo' } })`.
    - After sending, show a 6-digit code field (`supabase.auth.verifyOtp({ email, token, type: 'email' })`) and say "or tap the link in the email".
    - Plus a "Free, no card needed" line and a link to `/?lang=eng#pricing`.
  - `SoloBlocked`, in `SoloSignIn.tsx`: when `deviceLanguage() === 'mon'`, `SoloPortal` renders it in place of `SoloSignIn` (only when there's no session yet). It shows the block copy from Global Constraints and a `Button asChild` to `/?lang=mon`. A join error whose message mentions Mongolia shows the same screen.

- [ ] **Step 1: Write the failing test.** `storageKey.test.ts`: `soloAuthOptions('/solo')`, `soloAuthOptions('/solo/student/speed')` and `soloAuthOptions('/practice')` give `{ storageKey: 'sb-solo-auth-token' }`, the same, and `{}`. Also `src/solo/SoloSignIn.test.tsx` (`renderToStaticMarkup`): `<SoloBlocked />` contains "outside Mongolia" and `href="/?lang=mon"`, and no "Continue with Google".
- [ ] **Step 2: Run** `npx vitest run src/solo`. Expected: FAIL.
- [ ] **Step 3: Implement the files above.**
- [ ] **Step 4: Run** `npx vitest run` and `npx tsc --noEmit -p tsconfig.app.json`. Expected: pass, exit 0.
- [ ] **Step 5: Look at it.**
  - Run `npx vite --port 8137`, then drive Chrome over CDP (scratchpad driver) to `/solo` at 390px and 1280px, and screenshot the sign-in page.
  - Then emulate Mongolia time (CDP `Emulation.setTimezoneOverride` with `Asia/Ulaanbaatar`), reload `/solo`, and screenshot the block screen.
  - In the same browser, `localStorage` must hold no `sb-solo-auth-token` key before sign-in, and a main-domain key must be untouched.
  - Joining can't be tested until 0122 is live. The join-error state must show cleanly if the RPC is missing.
- [ ] **Step 6: Commit** `feat(solo): /solo sign-in and the solo portal on the center portal`

### Task 4: Free-tier screens: locks, speed allowance, no explanations

**Files:**
- Create: `src/portal/soloPlan.ts` and `src/portal/soloPlan.test.ts`, `src/portal/SoloLock.tsx`
- Modify:
  - the practice set tabs and cards (find them through `practiceSetIds` callers)
  - `src/portal/CenterPracticeTests.tsx`
  - the concept-video list in the center portal (find it through `topicUnits` callers in `src/portal`)
  - `src/portal/CenterSpeedLobby.tsx`
  - every center-portal place that renders a question's explanation (grep `explanation` in `src/portal`)

**Interfaces:**
- Consumes: `isSolo` (Task 3), `solo_speed_runs_left()` (Task 2), `solo_students` own-row select (drizzle 0034).
- Produces:
  - `useSoloPlan(): { isSolo: boolean; premium: boolean; ready: boolean }`
    - when not solo, `premium` is `true`, so every center keeps today's behaviour
  - pure `isPremium(row: { plan: string; premium_until: string | null } | null, now?: Date): boolean`
  - `<SoloLock title: string />`:
    - a shadcn `Card` with a Lock icon, the title and a `Button asChild` link "Try Premium free for 7 days" to `/?lang=eng#pricing`

- [ ] **Step 1: Write the failing tests.**
  - `soloPlan.test.ts`:
    - `isPremium(null)` is false
    - `{plan:'free'}` is false
    - `{plan:'premium', premium_until:null}` is true
    - a past `premium_until` is false
    - a future one is true
  - Extend the speed lobby test (or add one with `renderToStaticMarkup`): with `runsLeft = 0` the Start button is disabled and "0 of 10 left today" shows; with `runsLeft = null` neither appears.
- [ ] **Step 2: Run** `npx vitest run src/portal`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.** For free solo users only:
  - the 68 and 150 set tabs show `<SoloLock title="Every Math set" />`
  - non-free practice tests show a lock in place of Start (the server already hides them; show the 5 locked ones by count or title if the list is available, otherwise one lock card "5 more practice tests")
  - videos past each topic's first lesson show the lock
  - the speed lobby shows "x of 10 left today" from `solo_speed_runs_left()` and disables Start at 0
  - explanation blocks are hidden behind `<SoloLock title="Step-by-step explanations" />`
- [ ] **Step 4: Run** `npx vitest run` and `npx tsc --noEmit -p tsconfig.app.json`. Expected: pass, exit 0.
- [ ] **Step 5: Check the center portal didn't change.** With the CDP driver, open `/demo/student/student` (a normal center): the practice, tests, videos and speed pages look exactly as before, with no locks and no allowance line. Screenshot them.
- [ ] **Step 6: Commit** `feat(solo): free-tier locks, speed allowance and hidden explanations`
