# Live Demo, Part 1 (Phone Path) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/demo` runs the real center portals (admin, teacher, student) inside a fresh, private sample center per visitor, entered from the `/educators` buttons and the homepage link, live before Web Summit (9 Nov 2026).

**Architecture:** One migration adds a demo flag, a question slice and the demo-only refusals; a second adds a generator that builds a realistic sample center and the copy bookkeeping. A new `demo` edge function makes a copy plus three made-up accounts and hands their passwords to the page. The page keeps each role's sign-in under its own storage key (one change to `client.ts`) and mounts the unchanged `CenterPortalApp` under `/demo/<role>`, with a small floating bar to switch sides.

**Tech Stack:** Vite + React 18 + react-router 6, Supabase (Postgres RLS, pg_cron, Deno edge functions), shadcn/ui, vitest. Live checks are Node scripts in `~/Developer/Saagii21/flowersos/tools/portal-e2e/` (outside the repo, not committed), following `db-probe.mjs` and `admin.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-30-live-demo-design.md`. Plan 2 (homepage dialog with live minis) and Plan 3 (portal loading placeholders, "Turned off" notes, retire the old demo) follow later.

## Global Constraints

- Demo account emails end in `@demo.flowersos.co`; created with `email_confirm: true`; nothing ever emails them.
- Refusal message, everywhere: `Turned off in the demo.`
- Copies expire 15 minutes after start. Cleanup deletes only auth users whose email ends in `@demo.flowersos.co` **and** are listed on a `demo_copies` row.
- Center name `Northside Academy`; visitor plays student **Maya Chen**, teacher **Ms. Rivera** (`Elena Rivera`), admin **Daniel Brooks**.
- Demo storage keys: `sb-demo-student-auth-token`, `sb-demo-teacher-auth-token`, `sb-demo-admin-auth-token`. Real pages keep the default key.
- Keep the existing entry URLs working unchanged: `/demo?role=<r>&preview=educator&lang=<l>&ref=<src>` and `/demo?signup=practice&lang=<l>` (student only, no side switch).
- Migrations: next free number at build time. At plan time main is at `0102`, the teacher branch holds `0103`, the admin branch `0104`–`0105`; so this plan uses `0106` and `0107`. Re-check before pushing; renumber if taken. Each file starts with `SET lock_timeout = '3s';` and ends with `NOTIFY pgrst, 'reload schema';`; add a `meta/_journal.json` entry and a `meta/NNNN_snapshot.json` stub like 0102's.
- Lovable applies migrations and deploys edge functions; git sync carries front-end only. Never push front-end that needs a migration before that migration is live. Ask Saagii before every push to main. Never rebase or force-push main.
- Every token policy covers `anon, authenticated` (0093 lesson). Supabase sign-up stays on. No `Array.prototype.at`. shadcn components only (`src/components/ui/*`).
- A demo user changing their own password isn't blocked on the server in Plan 1: it's a throwaway account. Plan 3 adds the visible note.
- Don't edit `src/portal/centerContext.tsx` (teacher session). The only portal file this plan edits is `src/portal/questionMeta.ts` (one call); tell Saagii before pushing so the student session knows.
- Dev server for checks: `npx vite --config vite.demo.config.ts --port 8113 --strictPort` with its own `cacheDir` (`.vite-demo`), because worktrees share `node_modules/.vite` (copy `vite.demoshots.config.ts` from `~/Developer/tsetsegs-demoshots`; don't commit it). Chrome CDP on 9356.

## Review Focus

1. **A visitor already signed in to a real account on the same browser** (Misheel's Tsetsegs admin): after a full demo and "End demo", the real session is still there and unchanged. Test: Task 7, `real login survives`.
2. **A second tab or a reload mid-demo** (the admin sidebar's "Teacher view" link, a pull-to-refresh on a phone): the same copy continues; no second copy is made. Test: Task 6 `parseDemo` round-trip from `localStorage`, and Task 7 `reload keeps the copy`.
3. **The portal's own "Sign out" button inside the demo**: the visitor lands on the demo's ended screen, never on `CenterSignIn` (which has "Forgot password", a real email sender). Test: Task 7, `portal sign-out never shows sign-in`.
4. **Starting fails** (limit hit, server error, slow network): a plain message and a "Try again" button, never a blank page or spinner forever. Test: Task 6, `demoStartError` mapping, and Task 7, `limit message`.
5. **Phone width (375×812)**: the floating bar doesn't cover the student phone dock or the teacher dock, and the page has no sideways scroll. Test: Task 7 phone shots plus `noSideways`.

---

### Task 1: Demo flag, question slice and demo refusals (migration 0106)

**Files:**
- Create: `drizzle/migrations/0106_demo_centers.sql`, `drizzle/migrations/meta/0106_snapshot.json`
- Modify: `drizzle/migrations/meta/_journal.json`
- Test: `~/Developer/Saagii21/flowersos/tools/portal-e2e/demo-probe.mjs` (section `regression`)

**Interfaces:**
- Produces (SQL, all `SET search_path = public`):
  - column `institution_customers.is_demo boolean NOT NULL DEFAULT false`
  - table `demo_slice(item_id uuid PRIMARY KEY, kind text NOT NULL CHECK (kind IN ('question','video')))`, RLS on, no policies, `GRANT ALL TO service_role`
  - `is_demo_user() RETURNS boolean` (STABLE, SECURITY DEFINER): JWT email ends `@demo.flowersos.co`, or the caller is a `tenant_members`/`tenant_students` row of an `is_demo` center. Granted to `authenticated`.
  - `is_demo_center(_institution uuid) RETURNS boolean` (STABLE, SECURITY DEFINER). Granted to `authenticated`, `service_role`.
  - `intl_question_meta(_ids uuid[]) RETURNS TABLE(id uuid, subject text, skill text, category_id uuid, difficulty_level text)` (STABLE, SECURITY DEFINER): active rows in `_ids`, only when `is_staff_or_center_member()`; at most 2,000 ids. Granted to `authenticated`.
  - `can_read_concept_video(_path text) RETURNS boolean` (STABLE, SECURITY DEFINER): `is_staff_or_center_member()` and a published `concept_videos` row with `video_url = 'storage:' || _path` that, for demo users, is in `demo_slice` (kind `video`). Granted to `authenticated`.

- [ ] **Step 1: Write the failing probe section `regression`**

In `demo-probe.mjs` (copy the env/sign-in helpers from `db-probe.mjs`, reading `.env` from `~/Developer/tsetsegs-demo`), sign in as zz student `99000005` / `ZzFive2026` and assert:
```js
line('real center still reads the International bank', (await get('intl_questions?select=id&is_active=eq.true')).body.length >= 1400);
line('real center still sees published videos', (await get('concept_videos?select=id')).body.length >= 3);
line('real center still gets practice tests', (await rpc('tenant_practice_tests', { _institution: CENTER })).body.length >= 2);
const meta = await rpc('intl_question_meta', { _ids: [anyIntlId] });
line('details-only read works', meta.ok && meta.body.length === 1 && !('question_text' in meta.body[0]));
line('real user is not a demo user', (await rpc('is_demo_user', {})).body === false);
```

- [ ] **Step 2: Run it to see the new parts fail**

Run: `node demo-probe.mjs regression`
Expected: the first three `true`; `details-only read works` and `real user is not a demo user` `FALSE` (functions don't exist yet).

- [ ] **Step 3: Write `0106_demo_centers.sql`**

Contents, in order:
1. The column, `demo_slice`, `is_demo_user()`, `is_demo_center()`.
2. Fill `demo_slice` once, in SQL:
   - **The test:** the published Math `bluebook_tests` row that `tenant_practice_tests` would offer (every Math question has an active International copy) with the most `intl_questions.rationale IS NOT NULL` among its copies; insert **every** active `intl_questions.id` whose `question_id` appears in that test's Math modules (duplicates included, so `tenant_test_start`'s paper stays inside the slice).
   - **Desmos picks:** 12 active `ext_variant` math rows, not `hide_from_practice`, with `rationale ILIKE '%desmos%'`, newest first.
   - **English:** 5 active rows with `lower(subject) <> 'math'` and a rationale.
   - **Videos:** the 5 published `concept_videos` with the lowest `order_index`, kind `video`.
3. Replace the read rules (DROP + CREATE, same names as 0088):
   - `intl_questions` "Staff and centers view active intl questions": `USING (is_active AND (SELECT public.is_staff_or_center_member()) AND ((SELECT NOT public.is_demo_user()) OR id IN (SELECT item_id FROM public.demo_slice WHERE kind = 'question')))`.
   - `concept_videos` "Staff and centers view published concept videos": the same shape with `is_published` and kind `video`.
   - `storage.objects` "Staff and centers read concept videos": add `AND ((SELECT NOT public.is_demo_user()) OR name IN (SELECT substr(v.video_url, 9) FROM public.concept_videos v JOIN public.demo_slice d ON d.item_id = v.id AND d.kind = 'video' WHERE v.video_url LIKE 'storage:%'))`.
4. `intl_question_meta`, `can_read_concept_video`.
5. `tenant_practice_tests`: copy the body from `0091_*.sql:20-30` verbatim, changing only the `LEFT JOIN public.intl_questions i ON …` condition to add `AND (NOT public.is_demo_center(_institution) OR i.id IN (SELECT item_id FROM public.demo_slice WHERE kind='question'))`. (`tenant_test_start` checks against this list, so it follows.)
6. `tenant_sat_start`: copy the body from `0014_*.sql:1-…` verbatim; right after the `sid` check add `IF public.is_demo_center(_institution) THEN RAISE EXCEPTION 'Turned off in the demo.'; END IF;`.
7. `submit_support_request`: copy from `0081_support_requests.sql:36-…`; first line of the body: `IF public.is_demo_user() THEN RAISE EXCEPTION 'Turned off in the demo.'; END IF;`.
8. `admin_customer_activity`: copy from `0018_*.sql:44-…`; exclude rows where `c.is_demo`.
9. Grants/revokes matching each original; `NOTIFY pgrst, 'reload schema';`.

Every copied function keeps a comment `-- Demo check (live-demo plan, 30 Oct): keep this line when rewriting.` next to the added line.

- [ ] **Step 4: Register the migration**

Add the `_journal.json` entry (`idx` = last + 1, `tag` `0106_demo_centers`) and the snapshot stub with `prevId` = 0102's id (or the latest at build time).

- [ ] **Step 5: Commit**

```bash
git add drizzle/migrations/0106_demo_centers.sql drizzle/migrations/meta
git commit -m "0106: demo centers read only a small question slice; demo-only refusals"
```

---

### Task 2: Sample center generator and copy bookkeeping (migration 0107)

**Files:**
- Create: `drizzle/migrations/0107_demo_copies.sql`, `drizzle/migrations/meta/0107_snapshot.json`
- Modify: `drizzle/migrations/meta/_journal.json`
- Test: `demo-probe.mjs` (section `copy`, written here, run in Task 4)

**Interfaces:**
- Consumes: Task 1's `is_demo`, `demo_slice`.
- Produces (all SECURITY DEFINER, `REVOKE ALL FROM PUBLIC, anon, authenticated`, `GRANT EXECUTE TO service_role`):
  - table `demo_copies(id uuid PK DEFAULT gen_random_uuid(), institution_id uuid NOT NULL REFERENCES institution_customers(id), visitor text NOT NULL, ip text NOT NULL, end_token_hash text NOT NULL, user_ids uuid[] NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now() + interval '15 minutes')`, RLS on, no policies.
  - `demo_build_center(_institution uuid) RETURNS jsonb`: fills the center, returns `{"admin_member_id","teacher_member_id","student_id"}`.
  - `demo_create(_visitor text, _ip text, _end_token_hash text) RETURNS jsonb`: limits, then center + build + copy row + cleanup job; returns `{"copy_id","institution_id","slug","expires_at","admin_member_id","teacher_member_id","student_id"}`. Raises `demo_busy` (100 or more unexpired copies) or `demo_limit` (5 or more copies from this visitor, or 40 or more from this IP, in the last hour).
  - `demo_attach_logins(_copy uuid, _admin uuid, _teacher uuid, _student uuid) RETURNS void`: sets `tenant_members.user_id` for the two members, `tenant_students.user_id` for Maya, and `demo_copies.user_ids`.
  - `demo_end_users(_copy uuid, _end_token_hash text) RETURNS uuid[]`: raises `Not allowed` on a wrong token.
  - `demo_expired() RETURNS TABLE(copy_id uuid, user_ids uuid[])`.
  - `demo_drop(_copy uuid) RETURNS void`: deletes every row of the copy's center from `tenant_rank_history`, `tenant_announcement_reads`, `tenant_announcements`, `tenant_live_answers`, `tenant_live_sessions`, `tenant_badge_celebrations`, `tenant_test_attempts`, `tenant_sat_predictions`, `tenant_video_progress`, `tenant_student_goals`, `tenant_speed_runs`, `tenant_attempts`, `tenant_attendance`, `tenant_registrations`, `tenant_students`, `tenant_classes`, `tenant_sprints`, `tenant_members`, then the copy row, then the `institution_customers` row (only if `is_demo`).
  - `demo_cleanup_finish() RETURNS void`: unschedules cron job `demo-cleanup` when no `demo_copies` rows remain.

- [ ] **Step 1: Write the failing probe section `copy`**

It calls the edge function (Task 3) `POST /functions/v1/demo {action:'start', visitor:<32 hex>}`, signs in with each returned login (`/auth/v1/token?grant_type=password`), and asserts:
```js
line('lookup finds Northside Academy', (await anon.rpc('tenant_lookup', { _slug: d.slug })).body[0].name === 'Northside Academy');
line('student reads only the slice', n => n > 40 && n < 100, studentIntlCount);
line('student sees 3–5 videos', v => v >= 3 && v <= 5, videoCount);
line('one practice test', (await s.rpc('tenant_practice_tests', { _institution: inst })).body.length === 1);
line('SAT start refused', /Turned off in the demo/.test(JSON.stringify((await s.rpc('tenant_sat_start', { _institution: inst })).body)));
line('board has the class', (await s.rpc('tenant_student_board', { _institution: inst, _sprint: activeSprint })).body.length >= 20);
line('Maya has 440+ distinct math answers', distinctMath >= 440);
line('Maya answered today', todayCount >= 20);
line('two students need attention in Fall Cohort A', needAttention === 2);
line('teacher sees two classes', teacherClasses === 2);
line('admin sees three classes and 24 students', adminClasses === 3 && adminStudents === 24);
```
`needAttention` uses the portal's rule (`CenterTeacherPortal.tsx:53-58`): attendance under 70%, or 10+ answers under 50% accuracy, or no answer in 7 days.

- [ ] **Step 2: Write `demo_build_center`**

`PERFORM setseed(0.42);` first, so every copy is the same. All times are relative to `now()`. Data:

| What | Rows |
|---|---|
| Members | `Daniel Brooks` center_admin, `Elena Rivera` teacher (display name `Ms. Rivera`), `James Okafor` teacher (no login). Member emails are `…@demo.flowersos.co` placeholders. |
| Classes | `Fall Cohort A` (`Mon/Wed 5-7pm`, starts 60 days ago, Rivera), `Fall Cohort B` (`Tue/Thu 4-6pm`, 45 days ago, Rivera), `Spring Intensive` (`Sat 10am-1pm`, 20 days ago, Okafor). Keep `starts_on` within 120 days (gotcha G). |
| Students | A: Maya Chen, Ethan Park, Sofia Alvarez, Liam Patel, Zara Ahmed, Lucas Silva, Noah Kim, Ava Johnson, Hana Suzuki, Omar Haddad. B: Chloe Martin, Arjun Mehta, Emma Novak, Diego Torres, Mei Lin, Jacob Wright, Amara Okeke, Felix Meyer. Spring: Isabella Rossi, Kenji Watanabe, Nadia Rahman, Samuel Green, Leila Farah, Tom Becker. Phones `5550100`–`5550123`. `onboarding_eligible = false` (gotcha E). `sat_month` two months ahead. |
| Real SAT | Ethan 760 math, Sofia 740, Chloe 700 (`real_sat_date` 40 days ago). |
| Attempts | International math variants (`ext_variant`, active, not `hide_from_practice`), any of them (the details-only read makes history count). Maya: about 600 over the last 60 days, a day off 24 days ago and none since, so the streak is 23; 82% correct; today about 30 with 7 hard and 14 medium correct. Others: 40–350 each by an engagement level, 55–85% correct. Noah Kim: 30 answers at 45%. Ava Johnson: none in the last 9 days. **Gotcha A:** insert in time order with `answer` = the key (correct) or a different choice (wrong), then `UPDATE created_at` from the generated times. |
| Speed runs | Maya 3 today, 20 earlier; others a few. **Gotcha B:** insert, then `UPDATE created_at, correct, total`. |
| Goals | Maya speed 4, hard 10, medium 19; others defaults. |
| Attendance | Every scheduled session in the last 8 weeks: about 88% present, 7% late, 5% absent; none today, so "Mark" shows. |
| Sprints | `Sprint 1` (35–22 days ago) and `Sprint 2` (21–8 days ago) inserted as `finished`, with `tenant_rank_history` written directly (gotcha C), Maya ending Sprint 2 with `next_tier = 'gold'`; `Sprint 3` active, from 7 days ago to 7 days ahead. |
| Videos | Maya completed 2 of the slice videos. |
| Badges | `tenant_badge_celebrations` for every badge Maya and the others have earned (first_steps, centurion, marathon, sharpshooter, regular, any `master_<set>`), so no pop-ups (gotcha F). |
| Announcements | 2: center-wide "SAT test day checklist", Fall Cohort A "Bring your calculator Wednesday". |
| Registrations | 2 pending (admin shows a pending count). |

No `institution_payment_dues` and no `educator_demo_requests` (gotcha D).

- [ ] **Step 3: Write the rest of 0107**

- `demo_create`: `pg_advisory_xact_lock(7715402)`; check limits; insert `institution_customers` (`name 'Northside Academy'`, `country 'United States'`, `status 'active'`, `portal_enabled true`, `is_demo true`, `slug 'demo-' || substr(md5(gen_random_uuid()::text), 1, 12)`); `demo_build_center`; insert `demo_copies`; schedule `demo-cleanup` (`* * * * *`, `select public._post_edge_function('demo', '{"action":"cleanup"}'::jsonb)`) when it's missing, as `0016` does. Put the `-- lovable-cron-fallback-reviewed:` header line from 0016 at the top, reworded for this job.
- The other functions as listed in Interfaces.

- [ ] **Step 4: Register the migration and commit**

```bash
git add drizzle/migrations/0107_demo_copies.sql drizzle/migrations/meta
git commit -m "0107: sample center generator and demo copy bookkeeping"
```

---

### Task 3: `demo` edge function and the edge-side refusals

**Files:**
- Create: `supabase/functions/demo/index.ts`
- Modify: `supabase/functions/tenant-accounts/index.ts:38-42,119-123`, `supabase/functions/concept-video-url/index.ts:27-49`, `supabase/functions/student-analytics-insights/index.ts:15-16`
- Test: `demo-probe.mjs` (sections `refusals`, `end`, `limits`, written here, run in Task 4)

**Interfaces:**
- Consumes: Task 2's SQL functions (called with the service-role client).
- Produces, `POST /functions/v1/demo`:
  - `{action:'start', visitor:string}` returns `200 {copyId, endToken, slug, expiresAt, logins:{student:{email,password}, teacher:{…}, admin:{…}}}`, `429 {error:'demo_limit'}`, `503 {error:'demo_busy'}`, or `400` when `visitor` isn't 32 lowercase hex.
  - `{action:'end', copyId, endToken}` returns `200 {ok:true}` or `403`.
  - `{action:'cleanup'}` returns `200 {deleted:n}` (deletes expired copies only, so it is safe without auth).
  - Account emails `${role}-${copyId}@demo.flowersos.co`; passwords from the same generator as `tenant-accounts` (`tempPassword` + `withFreshPassword`).

- [ ] **Step 1: Write the failing probe sections**

- `refusals` (with a fresh copy):
  - admin `tenant-accounts {action:'create_member', institution_id, email:'someone@example.com', role:'teacher'}` → 403 `Turned off in the demo.`
  - admin `reset_member_password` → 403.
  - `{action:'student_lookup', slug}` → 403.
  - admin `submit_support_request` → error contains `Turned off in the demo`.
  - student `student-analytics-insights {stats:{}}` → 403.
  - student `concept-video-url` with a storage path not in the slice → 403 (skip with a note if no slice video is a storage file).
  - **Gate:** student `search_questions` returns 0 rows. Print `GATE` instead of `true`/`FALSE`.
- `end`: `{action:'end'}` with a wrong token → 403. With the right token → 200; then sign-in with the old password fails, and `tenant_lookup(slug)` is empty.
- `limits`: 6 starts with one visitor id → the 6th is 429. End all of them afterwards.
- `expiry` (long): start, wait 17 minutes, then sign-in fails and the lookup is empty.

- [ ] **Step 2: Implement `supabase/functions/demo/index.ts`**

- **Shape:** same as `tenant-accounts` (cors, `json()`, service-role client).
- **start:**
  - Hash the `endToken` (32 random bytes, hex) with SHA-256.
  - `ip` = first entry of `x-forwarded-for`, or `'unknown'`.
  - Call `demo_create`.
  - Create the 3 users with `auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { demo_copy: copyId } })`.
  - Call `demo_attach_logins`.
  - If any step fails after `demo_create`, delete the users made so far and call `demo_drop`, then return 500.
  - Map `demo_limit` to 429 and `demo_busy` to 503.
- **end / cleanup:** for each user id, `getUserById`, and delete only if the email ends with `@demo.flowersos.co`; then `demo_drop`. If a delete fails, keep the copy row so the next run retries. Cleanup finishes with `demo_cleanup_finish`.

- [ ] **Step 3: Add the edge-side refusals**

- `tenant-accounts`:
  - `findTenant` also selects `is_demo`. In `register`, `student_lookup` and `student_activate`, return `json({ error: 'Turned off in the demo.' }, 403)` when `tenant.is_demo`.
  - After `institutionId` is read (`:119`), look up `is_demo` for that id and return the same 403.
  - For `reset_member_password` and `reset_student`, use the row's `institution_id`.
- `concept-video-url`: parse `path` first, then call RPC `can_read_concept_video` with `{ _path: path }` as the caller (same fetch as today, new function name and body). Not `true` → 403 `Not allowed`.
- `student-analytics-insights`: after `user` resolves, `if (user.email?.endsWith('@demo.flowersos.co')) return json({ error: 'Turned off in the demo.' }, 403);`.

- [ ] **Step 4: Type-check the functions**

Run: `deno check supabase/functions/demo/index.ts supabase/functions/tenant-accounts/index.ts supabase/functions/concept-video-url/index.ts supabase/functions/student-analytics-insights/index.ts` (if `deno` isn't installed, `npx -y deno check …`).
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions
git commit -m "demo edge function; tenant-accounts, video links and AI insights refuse demo centers"
```

---

### Task 4: Make the server side live and pass the probe

**Files:** none in the repo. Uses `demo-probe.mjs`.

- [ ] **Step 1: Re-check migration numbers**

Run: `git fetch origin && git ls-tree --name-only origin/main drizzle/migrations | tail -3`, and check `feat/center-teacher-portal` and `feat/center-admin-batches` the same way.
Expected: nothing else uses 0106/0107; otherwise renumber, fix the journal, and amend the two commits.

- [ ] **Step 2: Ask Saagii to push the three server commits to main**

Only commits from Tasks 1–3, which change nothing for real users. Show him the list first. Then give him this Lovable prompt to paste: *"Apply migrations 0106_demo_centers and 0107_demo_copies in journal order. Deploy the edge functions demo, tenant-accounts, concept-video-url and student-analytics-insights. Then regenerate src/integrations/supabase/types.ts."*

- [ ] **Step 3: Run the probe**

Run: `node demo-probe.mjs regression copy refusals end limits`
Expected: every line `true`, and the `GATE` line shows 0 rows. If `GATE` shows rows, stop and ask Saagii whether to wait for the admin session's `search_questions` fix or add a demo-only block. The demo must not go public with rows there.

- [ ] **Step 3b: Check the other "signed in only" doors (spec section 4)**

- As a demo student, list the `question-images` bucket (`POST /storage/v1/object/list/question-images` with `{"prefix":"","limit":5}`) and print how many objects come back.
- Search the migrations for policies `TO authenticated USING (true)` and for functions granted to `authenticated` whose only check is `auth.uid() IS NOT NULL`.
- Bring the list to Saagii, with what each one exposes, and fix only the ones he picks (on this branch, as a new migration).

- [ ] **Step 4: Run the expiry check**

Run: `node demo-probe.mjs expiry` (about 17 minutes).
Expected: `true` lines for the sign-in failing and the lookup being empty. Then, using a Lovable query, `SELECT count(*) FROM demo_copies` returns 0 and `SELECT count(*) FROM cron.job WHERE jobname='demo-cleanup'` returns 0.

- [ ] **Step 5: Time a start**

The probe prints how long `start` takes. Expected: under 5 seconds. If it's slower, lower the attempt counts in `demo_build_center` before going further.

---

### Task 5: Separate sign-in storage for each demo role

**Files:**
- Create: `src/demo/storageKey.ts`, `src/demo/storageKey.test.ts`
- Modify: `src/integrations/supabase/client.ts:12-18` (Saagii approved, 30 Oct)

**Interfaces:**
- Produces: `export type DemoRole = 'student' | 'teacher' | 'admin'`; `demoRoleFromPath(pathname: string): DemoRole | null` (matches `^/demo/(student|teacher|admin)(/|$)`); `demoAuthOptions(pathname: string): { storageKey?: string }`. Returns `{}` off demo paths: never `{ storageKey: undefined }`, which supabase-js would turn into an empty key.

- [ ] **Step 1: Write the failing tests**

```ts
import { readFileSync } from 'node:fs';
import { demoAuthOptions, demoRoleFromPath } from './storageKey';

test('demo role paths get their own key', () => {
  expect(demoAuthOptions('/demo/student/student/home')).toEqual({ storageKey: 'sb-demo-student-auth-token' });
  expect(demoAuthOptions('/demo/teacher')).toEqual({ storageKey: 'sb-demo-teacher-auth-token' });
  expect(demoAuthOptions('/demo/admin/admin/dashboard')).toEqual({ storageKey: 'sb-demo-admin-auth-token' });
});
test('everything else keeps the default key', () => {
  for (const p of ['/', '/demo', '/demo/', '/demo/studentx', '/admin', '/student/home']) expect(demoAuthOptions(p)).toEqual({});
  expect(demoRoleFromPath('/demo')).toBeNull();
});
test('client.ts still uses the demo key (fails if Lovable regenerates the file)', () => {
  const src = readFileSync('src/integrations/supabase/client.ts', 'utf8');
  expect(src).toContain('...demoAuthOptions(window.location.pathname)');
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/demo/storageKey.test.ts`
Expected: FAIL, because `./storageKey` is missing.

- [ ] **Step 3: Implement `storageKey.ts` and add one line to `client.ts`**

In `client.ts`, import `demoAuthOptions` from `@/demo/storageKey` and add `...demoAuthOptions(window.location.pathname),` inside `auth: { … }`. Leave the "automatically generated" header in place.

- [ ] **Step 4: Run the tests and the build**

Run: `npx vitest run src/demo/storageKey.test.ts && npx tsc --noEmit -p tsconfig.app.json`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/demo/storageKey.ts src/demo/storageKey.test.ts src/integrations/supabase/client.ts
git commit -m "Demo roles keep their sign-in apart from the real one"
```

---

### Task 6: Demo start page, store, portal mount and floating bar

**Files:**
- Create: `src/demo/demoStore.ts`, `src/demo/demoStore.test.ts`, `src/demo/DemoStart.tsx`, `src/demo/DemoPortal.tsx`, `src/demo/DemoBar.tsx`
- Modify: `src/App.tsx:375-377` (the `/demo` branch), `src/portal/questionMeta.ts:11` (one call), `src/hooks/useInstitutionCustomers.ts:21` (hide demo centers)
- Test: `src/demo/demoStore.test.ts`

**Interfaces:**
- Consumes: Task 3's `demo` function; Task 5's `DemoRole`, `demoRoleFromPath`.
- Produces:
  - `type DemoCopy = { copyId: string; endToken: string; slug: string; expiresAt: string; practiceOnly: boolean; lang: string; ref: string | null; logins: Record<DemoRole, { email: string; password: string }> }`.
  - `demoEntry(search: string): { role: DemoRole; practiceOnly: boolean; lang: string; ref: string | null; autoStart: boolean }`. Uses `demoRole` from `@/lib/educatorApplications` and `sourceFromSearch` from `@/lib/educatorLanding`. `practiceOnly` is `signup=practice`; `autoStart` is `signup=practice` or `preview=educator`.
  - `parseDemo(raw: string | null, now: number): DemoCopy | null`: null when the value is missing, malformed or expired.
  - `demoStartError(status: number): string`:
    - 429 → `"You've started several demos in a row. Try again in a few minutes."`
    - 503 → `"The demo is busy right now. Try again in a minute."`
    - anything else → `"The demo couldn't start. Please try again."`
  - `loadDemo(): DemoCopy | null`, `saveDemo(c: DemoCopy): void`, `clearDemo(): void` (removes `flowersos-demo-v2` and every `localStorage` key starting with `sb-demo-`), `visitorId(): string` (32 hex, kept in `localStorage` `flowersos-demo-visitor`), `startDemo(e: ReturnType<typeof demoEntry>): Promise<DemoCopy>`, `endDemo(c: DemoCopy): Promise<void>`. The copy lives in `localStorage` under `flowersos-demo-v2`, so new tabs and reloads continue it.
  - `DemoBar` props: `{ role: DemoRole; practiceOnly: boolean; expiresAt: string; onSwitch(r: DemoRole): void; onEnd(): void }`.

- [ ] **Step 1: Write the failing tests**

```ts
test('entry from the educators page', () => expect(demoEntry('?role=admin&preview=educator&lang=eng&ref=websummit')).toEqual({ role: 'admin', practiceOnly: false, lang: 'eng', ref: 'websummit', autoStart: true }));
test('entry from the homepage', () => expect(demoEntry('?signup=practice&lang=mn')).toMatchObject({ role: 'student', practiceOnly: true, autoStart: true }));
test('bare /demo waits for a click', () => expect(demoEntry('')).toMatchObject({ role: 'student', autoStart: false }));
test('stored copy survives a reload until it expires', () => {
  const c = { ...sample, expiresAt: new Date(1_000_000 + 60_000).toISOString() };
  expect(parseDemo(JSON.stringify(c), 1_000_000)).toEqual(c);
  expect(parseDemo(JSON.stringify(c), 1_000_000 + 61_000)).toBeNull();
  expect(parseDemo('{"copyId":1}', 0)).toBeNull();
  expect(parseDemo(null, 0)).toBeNull();
});
test('start errors read as plain sentences', () => {
  expect(demoStartError(429)).toMatch(/Try again in a few minutes/);
  expect(demoStartError(503)).toMatch(/busy/);
  expect(demoStartError(500)).toMatch(/couldn't start/);
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/demo/demoStore.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement `demoStore.ts`**

Implement it, then run the tests until they PASS.

- [ ] **Step 4: Implement `DemoStart.tsx` (bare `/demo`)**

- **Layout and wording:** the start and ended screens of `InvestorDemo.tsx:93` (same layout and words; "Book a call" keeps `ref` through `withSource`).
- **Ended screen:** shown when `?ended=1` is present.
- **Starting:** if a stored copy exists, go straight to `/demo/<role>/`. Otherwise, with `autoStart` set or after the click, call `startDemo`, save the copy, and `location.assign('/demo/<role>/')`.
- **Errors:** show `demoStartError` with a "Try again" button.

- [ ] **Step 5: Implement `DemoPortal.tsx` (`/demo/<role>/*`)**

- **No copy:** if `loadDemo()` is null, `location.replace('/demo?ended=1')`.
- **Signing in:** if `supabase.auth.getSession()` has no session, `signInWithPassword(copy.logins[role])`. If that fails, end the demo and go to the ended screen.
- **Rendering:** the same providers as the center branch of `App.tsx:379-391` (light theme, Toaster, Sonner), then `<BrowserRouter basename={'/demo/' + role}><CenterPortalApp slug={copy.slug} /></BrowserRouter>` and `DemoBar`.
- **Sign-out:** render the portal only while a session exists. On `SIGNED_OUT` (the portal's own Sign out), call `endDemo`, `clearDemo`, and go to `/demo?ended=1`. The visitor never sees `CenterSignIn`.
- **Switching sides:** `onSwitch(r)` runs `location.assign('/demo/' + r + '/')`. The full reload picks up that role's storage key.
- **Ending:** when `expiresAt` passes, or `onEnd` fires, do the same as sign-out.

- [ ] **Step 6: Implement `DemoBar.tsx`**

Port `InvestorDemo.tsx:99-103` (role `Tabs` hidden when `practiceOnly`, an `mm:ss` timer, an "End demo" `Button`).

- [ ] **Step 7: Wire it up**

- **`App.tsx`:** `demoRoleFromPath(location.pathname)` → `DemoPortal`; `/demo` or `/demo/` → `DemoStart`. Remove the `InvestorDemo` import; the files stay until Plan 3.
- **`questionMeta.ts:11`:** `supabase.from('intl_questions').select(...).in('id', chunk)` becomes `supabase.rpc('intl_question_meta', { _ids: chunk })`. Keep the chunks and the result shape.
- **`useInstitutionCustomers.ts:21`:** add `.eq('is_demo', false)` to the customers query.
- These two edits need Task 4's regenerated `types.ts`, so pull `origin/main` first.

- [ ] **Step 8: Run the tests, type check and lint**

Run: `npx vitest run src/demo src/portal && npx tsc --noEmit -p tsconfig.app.json && npx eslint src/demo src/App.tsx`
Expected: all pass, no errors.

- [ ] **Step 9: Commit**

```bash
git add src/demo src/App.tsx src/portal/questionMeta.ts src/hooks/useInstitutionCustomers.ts
git commit -m "Live demo: real center portals in a private sample center, with side switching"
```

---

### Task 7: Browser check (phone path, real-login safety)

**Files:**
- Create: `~/Developer/Saagii21/flowersos/tools/portal-e2e/demo.mjs` (uses `cdp.mjs`; `E2E_CDP_PORT=9356 E2E_BASE=http://localhost:8113`)

- [ ] **Step 1: Write the checks**

| Check | Steps and expected result |
|---|---|
| `real login survives` | Sign in as zz admin at `/?center=zz-signin-test`; copy the default `sb-…-auth-token` value. Run the whole demo, then "End demo". Reload `/?center=zz-signin-test`: it lands on `/admin` and the stored token's user id is unchanged. |
| `educators path, phone` (375×812) | Open `/demo?role=admin&preview=educator&lang=eng&ref=probe`. The admin dashboard shows `Northside Academy` and `Active today` above 0. Switch to Teacher: `Welcome, Ms. Rivera!` and `Fall Cohort A` with `2 need attention`. Switch to Student: `Hey Maya` and the streak chip `23`. `noSideways` holds on every screen. Take shots `demo-phone-<role>`. |
| `homepage path` | `/demo?signup=practice&lang=eng` lands on the student side with no role tabs in the bar. |
| `shared copy` | As the student, answer one practice question (any choice, then Check). Switch to Teacher: Maya's question count went up by 1. |
| `reload keeps the copy` | Reload `/demo/teacher/` and open the admin "Teacher view" in a new tab: both show the same slug's data, and `demo_copies` gained no row (the probe's `start` count is unchanged). |
| `portal sign-out never shows sign-in` | Click the portal's own Sign out: the page shows "Your demo has ended", and no element with text `Forgot password` exists. |
| `limit message` | Stub `fetch` for `/functions/v1/demo` to return 429: the start page shows `Try again in a few minutes` and a "Try again" button. |
| `desktop` (1440×900) | The same three sides render; take shots `demo-desktop-<role>`. |

- [ ] **Step 2: Run it**

Run (dev server and Chrome on the ports in Global Constraints): `node demo.mjs`
Expected: every line `true`. Look at every screenshot: the bar must not cover the student phone dock or the teacher dock.

- [ ] **Step 3: Fix and re-run until all checks are `true`**

Commit any fixes as `fix(demo): …`.

---

### Task 8: Go live

**Files:**
- Modify: `AGENTS.md:6` and add one line to the rules list

- [ ] **Step 1: Update `AGENTS.md`**

- Line 6 becomes: "The demo (`/demo`) signs visitors in automatically as made-up sample people in a throwaway sample center (`institution_customers.is_demo`); never real data."
- Add: "Demo checks live inside `is_staff_or_center_member` policies (0106), `tenant_practice_tests`, `tenant_sat_start`, `submit_support_request`, `admin_customer_activity`, and the edge functions `tenant-accounts`, `concept-video-url` and `student-analytics-insights`. Keep the demo line when rewriting any of them, and run `flowersos/tools/portal-e2e/demo-probe.mjs` after."
- Commit: `git commit -am "AGENTS: demo signs visitors in as sample people; keep demo checks"`.

- [ ] **Step 2: Ask Saagii before pushing**

Show the commit list (Tasks 5–8). Remind him that `questionMeta.ts` changed, so the student session should pull. Push to main only on his yes.

- [ ] **Step 3: Ask Lovable about the sign-in limit**

Give Saagii this prompt: *"What is this project's auth rate limit for password sign-ins per IP, and can it be raised to 150 per 5 minutes before 9 Nov? A demo at a conference booth will have many visitors on one Wi-Fi."*

- [ ] **Step 4: Check the live site after Saagii publishes**

Run `demo.mjs` against `https://flowersos.co` with `E2E_BASE=https://flowersos.co` (skip the `limit message` stub).
Expected: all `true`. Tell Saagii the result with the phone screenshots.
