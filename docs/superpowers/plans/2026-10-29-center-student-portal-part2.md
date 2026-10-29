# Center Student Portal Part 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Center students get concept videos grouped into the 24 College Panda topic units, the 6 Tsetsegs practice tests with a test history, and colourful badges with the main app's unlock pop-up. Four part-1 leftovers get fixed along the way.

**Architecture:**
- Three migrations: topic data, a secure test engine modelled on `0014_center_sat_secure_engine.sql`, and badge "seen" rows. They go to main first and Lovable applies them.
- The frontend lives in `src/portal/`. It reuses main-app components (`BadgeCard`, `BadgeUnlockCelebration`, `ReferenceSheet`, `DesmosCalculator`) with center data injected.
- Pure logic (topic units, pop-up gate, badges to celebrate, card copy) sits in small `.ts` files with vitest tests.

**Tech Stack:** React 18 + Vite + TS, Supabase (Postgres RLS, SECURITY DEFINER RPCs), Tailwind + shadcn base-nova, TanStack Query, vitest (node env, `renderToStaticMarkup`).

**Spec:** `docs/superpowers/specs/2026-10-28-center-student-portal-part2-design.md`. The topic data is in `docs/superpowers/specs/2026-10-28-center-student-portal-part2/topics.json` and the look is option A in `videos-mockup.html` in the same folder.

## Global Constraints

- Repo: `~/Developer/tsetsegs-p1`, branch `feat/center-portal-part2`. Never touch `~/Developer/tsetsegs`, and never use ports 8080 or 4321 (use Vite 8095, Chrome CDP 9339). Never force-push main.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Data access:** data comes from `tenant_*` tables and SECURITY DEFINER functions keyed by `tenant_my_student_id(_institution)`. Students read and write only their own rows. Centers read only `intl_questions`, never `questions` (0088).
- **UI:**
  - Use shadcn base-nova components from `src/components/ui/`; never hand-roll a widget that exists there.
  - Use the portal "sky" classes (`sky-card`, `sky-btn`, …).
  - Lucide icons and flat SVG only. No emoji anywhere, in the UI or the copy.
- **Copy:** English, plain and short. No numbers that aren't real (no "+0 points", no placeholder scores, no fake 0 on a failed read).
- **Layout:** mobile first, with no sideways scroll at 375px. Dark mode must read well.
- **Migrations:**
  - Each is a file in `drizzle/migrations/` with a `meta/_journal.json` entry and a `meta/00NN_snapshot.json`. The snapshot is the previous one with a new `id` and with `prevId` set to the previous `id`.
  - Every migration ends with `NOTIFY pgrst, 'reload schema';`.
  - Numbers here assume 0089 is the last one (Lovable's empty `0089_apply_pending_0088.sql`). Before pushing, check `git ls-tree origin/main drizzle/migrations/` and renumber if Lovable added files.
- **Main app:** pages look the same as before. The only main-app edit allowed is `BadgeCard` hiding its "Worth" line when `pointValue` is 0.
- **No `Array.prototype.at`** in app or test code: Lovable's preview build rejects it (it rewrote two `.at(-1)` test lines on 29 Oct). Use `arr[arr.length - 1]`.
- **Tests:** `npx vitest run` passes. `npx tsc --noEmit -p tsconfig.app.json` shows only the 2 existing `shaders/react` errors.

## Review Focus

1. **A student who watched videos in the old global order opens the new page.** Every video they watched stays watched and open, and the video that was their old "next" is still open. *Owner: Task 2, test `keeps old next open`.*
2. **The tab closes mid-module and reopens after the module's time is up.** The runner advances instead of letting them answer. The server ignores late answers but still advances and grades. *Owner: Task 7, test `moduleSecondsLeft is 0 after the deadline`. Probe in Task 4.*
3. **A student opens a test that has an unfinished attempt.** Start becomes Resume, and starting again returns the same attempt id rather than a second one. *Owner: Task 4 probe `start twice returns same id`; Task 6 test `card says Resume`.*
4. **A badge pop-up is due while a live class game card or any dialog is on screen.** It waits, then shows once the screen is clear. *Owner: Task 9, tests `blocked by live session`, `blocked by open dialog`, `second owner waits`.*
5. **A video whose `module` doesn't match any of the 26 topic names** (an admin typo, or a video added later). It still shows, in a final "More videos" unit. *Owner: Task 2, test `unknown module goes to More videos`.*

---

### Task 1: Topic data migration

**Files:**
- Create: `drizzle/migrations/0090_center_video_topics.sql`
- Create: `drizzle/migrations/meta/0090_snapshot.json`
- Modify: `drizzle/migrations/meta/_journal.json`

**Interfaces:**
- Produces:
  - `concept_videos.module` = the exact topic `name` from topics.json for all 129 videos.
  - `order_index` = 1…129 in book order: topic 1 first, and inside each topic the order listed in topics.json, which is the old relative order.

- [ ] **Step 1: Generate the SQL from topics.json with a one-off node script** (not committed). The output has four statements, in this order:
  1. `UPDATE public.concept_videos SET order_index = order_index + 1000 WHERE id IN (…129 ids…);` This moves them out of the way.
  2. `UPDATE public.concept_videos c SET module = v.module, order_index = v.ord FROM (VALUES ('<uuid>'::uuid, '<name>', <ord>), …) v(id, module, ord) WHERE c.id = v.id;` with 129 rows.
  3. `UPDATE public.concept_videos SET domain = 'Problem Solving & Data' WHERE id = '<id of the topic-24 video>';` (old order_index 117.)
  4. `UPDATE public.concept_videos SET title = replace(title, 'Quadractic', 'Quadratic') WHERE title LIKE '%Quadractic%';`

  Head the file with a 2-line comment: why (Saagii 28 Oct: book order, 26 College Panda topics, two mislabels fixed). Escape any `'` in names. End with `NOTIFY pgrst, 'reload schema';`.
- [ ] **Step 2: Verify the file.** `grep -c "::uuid" drizzle/migrations/0090_center_video_topics.sql` gives `129`. The ord values are exactly 1..129 once each (check with a node one-liner over the file).
- [ ] **Step 3: Add the journal entry** (`idx 90`, `tag 0090_center_video_topics`) **and the snapshot.**
- [ ] **Step 4: Commit:** `git commit -m "0090: concept videos get their College Panda topic and book order; fix two mislabels"`

### Task 2: Topic model (pure)

**Files:**
- Create: `src/portal/videoTopics.ts`
- Test: `src/portal/videoTopics.test.ts`

**Interfaces:**
- Produces:
  - `type Area = 'Advanced Math' | 'Algebra' | 'Problem Solving & Data' | 'Geometry & Trig'`
  - `const TOPICS: readonly { n: number; name: string; area: Area }[]`: all 26, numbers and names exactly as topics.json.
  - `const AREA_COLOR: Record<Area, { light: string; dark: string }>`:

    | Area | light | dark |
    |---|---|---|
    | Advanced Math | `#7B6CF6` | `#A39AF9` |
    | Algebra | `#3B8DF5` | `#73AEF8` |
    | Problem Solving & Data | `#FB8A4C` | `#FCA97C` |
    | Geometry & Trig | `#E07CC8` | `#EBA3DA` |

  - `type VideoState = 'done' | 'open' | 'locked'`
  - `type TopicUnit<V> = { n: number | null; name: string; area: Area | null; items: { video: V; state: VideoState }[]; watched: number; total: number }`
  - `function topicUnits<V extends { id: string; module: string | null; order_index: number }>(videos: V[], done: Set<string>): TopicUnit<V>[]`. Units are in topic-number order and skip topics with no videos. Items are sorted by `order_index`. The "More videos" unit (`n: null, area: null`) comes last and only when needed.
  - **State rule:** a watched video is `'done'`. The first unwatched video in its unit is `'open'`. Every later unwatched video is `'locked'`.
  - `function upNext<V>(units: TopicUnit<V>[]): { unitIndex: number; videoId: string } | null`: the `'open'` item in the first unit that has one.

- [ ] **Step 1: Write the failing tests** in `videoTopics.test.ts`:
  - `TOPICS matches topics.json`: read the JSON with `fs` from `docs/superpowers/specs/2026-10-28-center-student-portal-part2/topics.json`. `TOPICS.map(t => [t.n, t.name, t.area])` equals the JSON's `[topic, name, area]` list.
  - `units follow book number, not order_index`:
    - Input: a video in 'Quadratic Functions' (topic 16) with order_index 1, and one in 'Systems of Equations' (topic 13) with order_index 2.
    - Expect `units.map(u => u.n)` to equal `[13, 16]`.
  - `skips topics without videos`: no unit has `n === 7` or `n === 23`.
  - `state per unit`:
    - Input: three videos a, b, c in one topic; done = {a}.
    - Expect states `['done', 'open', 'locked']`.
    - Also: a fresh second topic's first video is `'open'` (any topic can be started).
  - `keeps old next open`:
    - Input: videos in old global order. done = every video before the old global "next".
    - Expect that video's state to be `'open'`, and every done video `'done'`.
  - `unknown module goes to More videos`:
    - Input: a video with module `'Quadratic Equationz'` and one with module `null`.
    - Expect both in the last unit, `{ n: null, name: 'More videos' }`.
  - `upNext is in the lowest unfinished topic`:
    - Input: topic 1 fully done, topic 2 partly done.
    - Expect `upNext` to point at topic 2's open video. When everything is done, it returns `null`.
- [ ] **Step 2: Run** `npx vitest run src/portal/videoTopics.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement `videoTopics.ts`** with the interfaces above. Matching `module` to a topic name is exact after `trim()`.
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Commit:** `feat(portal): topic units model for concept videos`

### Task 3: Practice test engine and badge "seen" rows (migrations)

**Files:**
- Create: `drizzle/migrations/0091_center_practice_tests.sql`
- Create: `drizzle/migrations/0092_center_badge_celebrations.sql`
- Create: the two snapshots and two journal entries.

**Interfaces:**
- Produces, in 0091:
  - **Table `public.tenant_test_attempts`**, with columns:
    - `id uuid pk default gen_random_uuid()`
    - `institution_id uuid not null → institution_customers`
    - `student_id uuid not null → tenant_students on delete cascade`
    - `test_id uuid → bluebook_tests on delete set null`
    - `test_name text not null`
    - `started_at timestamptz not null default now()`
    - `completed_at timestamptz`
    - `status text not null default 'in_progress'`
    - `current_module int not null default 0`
    - `module_started_at timestamptz not null default now()`
    - `answers jsonb not null default '{}'`
    - `paper jsonb not null default '[]'`
    - `math_correct int`, `math_total int`, `math_score int`

    And around it:
    - Unique index on `(student_id, test_id) WHERE status = 'in_progress'`.
    - RLS on. One policy: `SELECT TO authenticated USING (student_id = tenant_my_student_id(institution_id) OR has_role(auth.uid(), 'admin'))`.
    - Column-level `GRANT SELECT` on every column except `paper`. No insert, update or delete grants; only the functions write.
  - `tenant_practice_tests(_institution uuid) RETURNS jsonb`. Returns an array, newest test first (`test_year desc, test_month desc, name`), of `{ id, name, test_month, test_year, modules, questions, minutes, last_score, open_attempt }`.
    - Only published tests where **every** question has an active `intl_questions` row with the same `question_id`.
    - `last_score` is the newest completed `math_score` for this student and test, or null.
    - `open_attempt` is the in-progress attempt id, or null.
    - Raises `'Not allowed'` if `tenant_my_student_id` is null.
  - `tenant_test_start(_institution uuid, _test uuid) RETURNS uuid`. Uses an advisory lock on the student. If there's an in-progress attempt for this test, it returns it. Otherwise it builds `paper` and inserts:
    - `paper` is `[{ number, minutes, questions: [intl row as jsonb, …] }]`, with modules in `module_number` order and questions in `bluebook_module_questions.order_index` order.
    - Each question has the intl columns `id, question_id, question_text, passage_text, question_image_url, question_image_url_2, multiple_choice_options, choice_images, answer, alternate_answers`.
    - Raises `'This test is not available'` if the test isn't published or any question lacks an active intl copy.
  - `tenant_test_state(_attempt uuid) RETURNS jsonb`:
    - Returns the attempt minus `paper`, plus `paper` with `answer` and `alternate_answers` stripped while in progress.
    - When completed, each question also carries `rationale`, read **live** from `intl_questions` by `id`.
    - Raises `'Not allowed'` unless it's the owner.
  - `tenant_test_save(_attempt uuid, _answers jsonb, _advance boolean DEFAULT false) RETURNS void`. Follows `tenant_sat_save` in 0014 (row lock, owner check, object check), with these changes:
    - It takes answers only for current-module question ids, and only while `now() <= module_started_at + minutes + 5 seconds`.
    - Advancing moves to the next module with `module_started_at = now()`. There's no break.
    - After the last module it grades every question with `public.fill_answer_matches(value, answer, alternates)` and sets:
      - `math_correct`, `math_total`;
      - `math_score = (round((200 + correct::numeric / total * 600) / 10) * 10)::int`;
      - `status = 'completed'`, `completed_at = now()`.
  - All four functions are SECURITY DEFINER with `search_path = public`. `REVOKE ALL … FROM PUBLIC, anon`, then `GRANT EXECUTE … TO authenticated`.
- Produces, in 0092:
  - **Table `public.tenant_badge_celebrations`**: `student_id uuid not null → tenant_students on delete cascade`, `institution_id uuid not null → institution_customers`, `badge_key text not null`, `celebrated_at timestamptz not null default now()`, `primary key (student_id, badge_key)`.
  - RLS: students `SELECT` and `INSERT` their own rows (`student_id = tenant_my_student_id(institution_id)`).
  - `GRANT SELECT, INSERT TO authenticated`.

- [ ] **Step 1: Write 0091.** Use 0014 as the template for locking, owner checks and redaction. Head comment: center practice tests use the Tsetsegs tests, but read only the International copies (Saagii 28 Oct); keys stay hidden until finished; graded on the server.
- [ ] **Step 2: Write 0092,** with a one-line head comment: a badge pop-up shows once per student per badge, on any device.
- [ ] **Step 3: Add the journal entries and snapshots** (0091 after 0090, 0092 after 0091). Run `node -e 'require("./drizzle/migrations/meta/_journal.json")'`. Expected: no error.
- [ ] **Step 4: Commit both:** `0091/0092: center practice test engine (International copies, server graded) and badge seen rows`

### Task 4: Database milestone (push migrations, Lovable applies, live probe)

**Files:**
- Create: `<scratchpad>/portal-e2e/db-probe.mjs`. The scratchpad is the session scratchpad. The probe reuses `.env` and the zz login flow from `run.mjs`: `tenant-accounts` `student_lookup`, then the password grant.

- [ ] **Step 1: Put only the migration commits from Tasks 1 and 3 on main.**
  1. `git fetch origin` and check the newest number in `drizzle/migrations/` on origin/main. If it isn't 0089, renumber 0090–0092 (files, journal, snapshots) and amend.
  2. `git switch -c db/part2 origin/main`, cherry-pick the two migration commits, then `git push origin db/part2:main`. This must be a fast-forward.
  3. `git switch feat/center-portal-part2 && git rebase origin/main`.
- [ ] **Step 2: Hand Saagii this Lovable prompt** (adjust the numbers if renumbered). Wait for his paste-back.
  ```
  Please apply these migration files in order, exactly as written, then paste me the results:
  drizzle/migrations/0090_center_video_topics.sql
  drizzle/migrations/0091_center_practice_tests.sql
  drizzle/migrations/0092_center_badge_celebrations.sql
  After applying:
  1. select module, count(*) from concept_videos where is_published group by module order by 1;
  2. select min(order_index), max(order_index), count(distinct order_index) from concept_videos where is_published;
  3. select proname from pg_proc where proname like 'tenant_test_%' or proname = 'tenant_practice_tests';
  4. Signed in as center student 99000001 (center zz-signin-test, password ZzStudent2026):
     call tenant_practice_tests for that center and tell me how many tests come back.
  Don't change any app code.
  ```
- [ ] **Step 3: Write `db-probe.mjs`.** It signs in as 99000002 and asserts each of these, printing `true`/`FALSE` per line:
  - `tenant_practice_tests` returns 6 tests, each with `modules === 2` and `questions === 44`.
  - `start twice returns same id` (`tenant_test_start` called twice).
  - `tenant_test_state` while in progress has no `answer`, `alternate_answers` or `rationale` on any question.
  - A save with an answer for a question id from module 2 while on module 1 doesn't store it.
  - Another student (99000003) calling `tenant_test_state` on that attempt gets an error.
  - Reading `tenant_test_attempts.paper` directly gets a permission error.
  - Finishing both modules (`_advance: true` twice) gives `status 'completed'`. `math_score` equals `Math.min(800, Math.max(200, Math.round((200 + c / t * 600) / 10) * 10))` for the returned `math_correct` and `math_total`. Completed state has `rationale` keys.
  - `tenant_badge_celebrations`: inserting the student's own row works; inserting with another student's id fails.
  - `concept_videos`: 129 published rows with a non-null module that matches a `TOPICS` name.
- [ ] **Step 4: Run** `node <scratchpad>/portal-e2e/db-probe.mjs`. Expected: every line `true`. A FALSE means fixing the SQL in a new migration (never editing an applied one) and repeating Steps 1–4 for it.

### Task 5: Concept videos page by topic

**Files:**
- Modify: `src/portal/VideoRoadmap.tsx` (replace the unit grouping and path).
- Create: `src/portal/topicArt.tsx`
- Modify: `src/portal/CenterStudentPortal.tsx` (the `videoIds` passed to `RoadmapPreview` on home).
- Test: `src/portal/VideoRoadmap.test.tsx`

**Interfaces:**
- Consumes: `topicUnits`, `upNext`, `AREA_COLOR`, `TopicUnit` from Task 2.
- Produces:
  - `AreaArt({ area, className }: { area: Area; className?: string })`: one flat inline SVG per area, drawn in that area's colour family. The motifs are a parabola (Advanced Math), a line on a grid (Algebra), bars (Problem Solving & Data), and a triangle in a circle (Geometry & Trig).
  - `Chest({ open, className }: { open: boolean; className?: string })`: a flat SVG chest.

- [ ] **Step 1: Write the failing tests** (`renderToStaticMarkup`, mock `@/integrations/supabase/client`, wrap in `CenterContext` like `StudentRail.test.tsx`). The fixture has 3 topics: 'Exponents & Radicals' with 2 videos (first done), 'Functions' with 1, and 'Quadratic Functions' with 1. Tests:
  - `shows topic banners with book numbers`: html contains `Topic 1 · Exponents &amp; Radicals`, `Topic 5 · Functions` and `1/2 watched`.
  - `colours each banner by area`: the 'Functions' banner's `style` contains `#7B6CF6`.
  - `only the up-next topic starts open`: the Topic 1 Collapsible has `data-open`, and the Topic 5 one doesn't. (Check the attribute the base-nova Collapsible renders, and assert on that.)
  - `no emoji`: html doesn't match `/\p{Extended_Pictographic}/u`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement the page in `VideoRoadmap.tsx`** to the option A look in `videos-mockup.html`:
  - **Units:** one shadcn `Collapsible` per unit (`defaultOpen` only for `upNext().unitIndex`).
  - **Banner:** the trigger is the banner, filled with the area colour (`light` normally, `dark` under `.dark`, through a CSS variable `--unit` set inline). It shows `Topic {n} · {name}`, or "More videos" for `n: null`, and `{watched}/{total} watched`.
  - **Body:** today's zig-zag node path, plus `AreaArt` beside the path and `Chest open={watched === total}` at the end.
  - **Nodes:**
    - done = filled `--unit` with a check;
    - open = `--unit` with a ring and a "Start" bubble on the up-next node only;
    - locked = muted with a lock.
  - Keep the header and total count, the search and label filter (flat list while filtering, labelled "Topic {n}" instead of "Lesson {i}"), and the video dialog with "Mark as watched" exactly as today.
  - Change the subtitle to `Pick any topic. Inside a topic, each video unlocks the next.`
- [ ] **Step 4: Update home** so `videoIds` = `topicUnits(videos, new Set(me.videosDone)).flatMap(u => u.items.map(i => i.video.id))`. `RoadmapPreview` then follows "Up next".
- [ ] **Step 5: Run** `npx vitest run src/portal`. Expected: PASS.
- [ ] **Step 6: Commit:** `feat(portal): concept videos as colourful College Panda topic units`

### Task 6: Practice tests list, history, rail and routes

**Files:**
- Create: `src/portal/CenterPracticeTests.tsx`
- Create: `src/portal/practiceTests.ts`
- Test: `src/portal/practiceTests.test.ts`
- Modify: `src/portal/StudentRail.tsx`, `src/portal/StudentRail.test.tsx`, `src/portal/CenterStudentPortal.tsx` (routes)

**Interfaces:**
- Consumes: the `tenant_practice_tests` rows and `tenant_test_start` from Task 3.
- Produces:
  - `type PracticeTest = { id: string; name: string; test_month: number | null; test_year: number | null; modules: number; questions: number; minutes: number; last_score: number | null; open_attempt: string | null }`
  - `function testCardLine(t: PracticeTest): string` returns `"2 modules · 44 questions · 70 minutes"`.
  - `function testCardAction(t: PracticeTest): 'Start' | 'Resume'`
  - `CenterPracticeTests()` page. The runner route is `/student/tests/:attemptId` (Task 7).

- [ ] **Step 1: Write the failing tests:**
  - `card line`: `testCardLine({ …, modules: 2, questions: 44, minutes: 70 })` returns `'2 modules · 44 questions · 70 minutes'`. A 1-module test says `1 module`.
  - `card says Resume`: `open_attempt: 'x'` gives `'Resume'`, and null gives `'Start'`.
  - In `StudentRail.test.tsx`, add `'Practice tests'` to the label list and assert `href="/student/tests"`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **Rail:** add `{ to: '/student/tests', label: 'Practice tests', icon: ClipboardList }` to `NAV`, right after Concept videos.
  - **Page:** shadcn `Tabs` with "Tests" and "My test history".
    - **Tests tab:** a card per test with the name, `Month YYYY` (from the numeric `test_month`/`test_year`, left out when null), `testCardLine`, `Last score {n}` when not null, and a Start/Resume button. Start calls `tenant_test_start` and navigates to `/student/tests/{id}`.
    - **Queries:** keyed `['center-tests', center.id, …]` so the runner's invalidation refreshes both tabs.
    - **History tab:** `tenant_test_attempts` (select every column except `paper`), newest first. Each row shows the test name, the date, and either `Math {math_score}` or `In progress · Module {current_module + 1}`, with a Review or Resume button.
    - **Header:** `Practice tests` with the subtitle `Tsetsegs SAT Math tests. Practice scores are estimates, not official SAT scores.`
    - **States:** loading (`SkyListSkeleton`), error (`role="alert"` plus Try again), and empty history (`Your finished tests will appear here.`).
  - **Routes:** add `tests` → `<CenterPracticeTests />` and `tests/:attemptId` → `<CenterPracticeTest />`.
- [ ] **Step 4: Run** `npx vitest run src/portal`. Expected: PASS.
- [ ] **Step 5: Commit:** `feat(portal): practice tests page with test history`

### Task 7: Test runner and review

**Files:**
- Rename: `src/portal/CenterSAT.tsx` → `src/portal/CenterPracticeTest.tsx` (`git mv`). Delete `CenterSATList` (it's dead code).
- Create: `src/portal/testTimer.ts`
- Test: `src/portal/testTimer.test.ts`

**Interfaces:**
- Consumes: `tenant_test_state` and `tenant_test_save` from Task 3.
- Produces:
  - `CenterPracticeTest()`, the route component.
  - `function moduleSecondsLeft(moduleStartedAt: string, minutes: number, now: number): number`. Whole seconds, never below 0.

- [ ] **Step 1: Write the failing tests:**
  - `moduleSecondsLeft counts down`: started 10:00:00, 35 minutes, now 10:34:00 gives `60`.
  - `moduleSecondsLeft is 0 after the deadline`: started 10:00:00, 35 minutes, now 11:00:00 gives `0`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement the runner** by adapting the renamed file:
  - Use the RPCs `tenant_test_state`, `tenant_test_save` (`_advance` as today), and drafts key `center-test-draft:{attempt}:{module}`.
  - Remove the break and the R&W branches. The header is `{test_name}` on top of `Module {n} of {count}`.
  - The finish button says `Finish module` until the last module, then `Finish test`.
  - When completed, the score block shows `{math_score}` with `Practice score (estimate) · {math_correct}/{math_total} correct`.
  - The review buttons are `Module 1` and `Module 2`. Review shows `Your answer` (`Omitted` when blank), `Correct answer` and the rationale. With no rationale it shows `No explanation yet.`
  - Add `ReferenceSheet` (mounted once) plus a `Reference` button calling `toggleReferenceSheet()` next to Calculator.
  - Back links go to `/student/tests`, and the query invalidation key is `['center-tests', center.id]`.
  - Use `moduleSecondsLeft` for the timer. Keep the existing auto-advance-at-0 and reconnect logic.
  - No videos anywhere.
- [ ] **Step 4: Run** `npx vitest run src/portal` and `npx tsc --noEmit -p tsconfig.app.json`. Expected: PASS, with only the 2 `shaders/react` errors.
- [ ] **Step 5: Commit:** `feat(portal): practice test runner and review on the International copies`

### Task 8: Badges in colour

**Files:**
- Modify: `src/portal/centerProfile.ts` (`CenterBadge`, `centerBadges`), `src/portal/centerProfile.test.ts`
- Modify: `src/portal/CenterProfileView.tsx` (`CenterBadgeGrid`)
- Modify: `src/components/student/badges/BadgeCard.tsx` (hide "Worth" when `pointValue` is 0)
- Test: `src/portal/CenterBadgeGrid.test.tsx`

**Interfaces:**
- Produces:
  - `CenterBadge = { key: string; name: string; desc: string; got: boolean; prog: [number, number]; rarity: BadgeRarity; icon: string }`
  - Keys, rarities and icons:

    | key | rarity | icon |
    |---|---|---|
    | `first_steps` | common | `Star` |
    | `centurion` | uncommon | `Medal` |
    | `marathon` | rare | `Mountain` |
    | `sharpshooter` | rare | `Target` |
    | `regular` | uncommon | `Clock` |
    | `master_68` | epic | `Gem` |
    | `master_SATMathTraining800` | legendary | `Crown` |
    | `master_CB` | epic | `Diamond` |

    Every icon exists in both `BadgeCard`'s and `BadgeUnlockCelebration`'s icon maps.
  - `function toStudentBadge(b: CenterBadge): StudentBadge` (exported from `CenterProfileView.tsx`):
    - `pointValue: 0`, `category: 'discipline'`, `requirements: []`;
    - `progress = got ? 100 : Math.min(99, pct(prog[0], prog[1]))`;
    - `unlockedAt: null`.

- [ ] **Step 1: Write the failing tests:**
  - In `centerProfile.test.ts`: `badges carry key, rarity and icon`. Every badge has a unique `key`, and the table above holds.
  - In `CenterBadgeGrid.test.tsx`: `earned badge uses its rarity colour`. Render `CenterBadgeGrid` with one earned `master_SATMathTraining800`. The html contains `RARITY_COLORS.legendary.border` and doesn't contain `Worth:`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Add the fields to `centerBadges`.
  - `CenterBadgeGrid` keeps its `sky-card` wrapper, heading and `grid-cols-2 sm:grid-cols-4` grid, and renders main's `BadgeCard` with `toStudentBadge(b)`.
  - In `BadgeCard`, wrap the Worth line in `{badgeDef.pointValue > 0 && …}`.
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS (main's badge tests too).
- [ ] **Step 5: Commit:** `feat(portal): center badges in rarity colours with icons`

### Task 9: Badge pop-up, one pop-up at a time (M4)

**Files:**
- Create: `src/portal/popupGate.ts`
- Test: `src/portal/popupGate.test.ts`
- Create: `src/portal/CenterBadgeWatcher.tsx`
- Create: `src/portal/badgeQueue.ts`
- Test: `src/portal/badgeQueue.test.ts`
- Modify: `src/portal/CenterStudentPortal.tsx`
  - Add the `useMyCenterBadges(me)` hook, used by `BadgesPage` and the watcher.
  - Mount `<CenterBadgeWatcher>` next to `StudentLive`.
  - Make the ring nudge use the gate.

**Interfaces:**
- Produces:
  - `function screenBusy(doc: Pick<Document, 'querySelector'>): boolean`. True when `[aria-label="Live session"], [role="dialog"], [role="alertdialog"]` exists.
  - `function tryClaimPopup(owner: string, doc?: Pick<Document, 'querySelector'>): boolean`. Claims only when nobody holds the claim and the screen isn't busy.
  - `function releasePopup(owner: string): void`. Only the holder can release.
  - `function usePopupTurn(owner: string, wants: boolean, everyMs = 1500): boolean`. Polls `tryClaimPopup` while `wants` is true. Returns true once claimed. Releases when `wants` turns false or on unmount.
  - `function badgesToCelebrate(badges: CenterBadge[], seen: Set<string>): CenterBadge[]`. Earned and not seen, in list order.
  - `function useMyCenterBadges(me: Me): CenterBadge[] | null`. Null until `useSetTotals` has loaded.
  - `CenterBadgeWatcher({ studentId, badges }: { studentId: string; badges: CenterBadge[] | null })`

- [ ] **Step 1: Write the failing tests:**
  - `popupGate.test.ts`, using a fake doc `{ querySelector: sel => (match ? {} : null) }`:
    - `blocked by live session` (the selector includes `Live session`);
    - `blocked by open dialog`;
    - `second owner waits`: after `tryClaimPopup('a')` succeeds, `tryClaimPopup('b')` is false;
    - `release lets the next one in`: `releasePopup('b')` doesn't free a's claim, and `releasePopup('a')` does.
  - `badgeQueue.test.ts`:
    - `earned and unseen only`;
    - `a seen badge never returns even if lost and earned again`. Input: `got` true and key in `seen`. Expect it to be excluded.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **Watcher:**
    - Read seen keys from `tenant_badge_celebrations` for `studentId`. Keep a local `collected` set so a failed insert doesn't loop this visit.
    - `queue = badgesToCelebrate(badges, seen ∪ collected)`, then `usePopupTurn('badges', queue.length > 0)`.
    - When it's this watcher's turn, render main's `BadgeUnlockCelebration` with `{ id: key, name, description: desc, rarity, iconName: icon, pointValue: 0 }` and `remaining = queue.length - 1`.
    - Collect inserts one row. Collect all inserts every queued row (`upsert`, `ignoreDuplicates`).
  - **Ring nudge (M4):** HomePage keeps its "due" logic (`shouldShowRingNudge`, `nudgeShown`, the localStorage day key), but opens only when `usePopupTurn('ring-nudge', due)` is true. It releases on close.
- [ ] **Step 4: Run** `npx vitest run src/portal`. Expected: PASS.
- [ ] **Step 5: Commit:** `feat(portal): badge unlock pop-up; pop-ups wait for live games and other dialogs`

### Task 10: Part-1 leftovers (M7, M8, M2)

**Files:**
- Modify: `src/portal/CenterOnboarding.tsx` (Back button), `src/portal/onboarding.ts` and `src/portal/onboarding.test.ts` (copy), `src/portal/CenterDailyGoals.tsx` (read error), `src/portal/CenterStudentPortal.tsx` (failed line on home)

**Interfaces:**
- Produces:
  - `ringPlanCopy(goals, distinctMath, weak: string | null)`, which gains the third parameter. Update every caller.
  - `useCenterDailyProgress(...)` also returns `failed: boolean` (`runs.isError`).

- [ ] **Step 1: Write the failing tests** in `onboarding.test.ts`:
  - `R&W pickers hear the prediction is Math only` (`weak` is `'math' | 'reading_writing' | 'same'`; only `'reading_writing'` changes the copy). `ringPlanCopy({ hard: 5, medium: 10 }, 100, 'reading_writing')` returns `'About 15 questions a day. The score prediction covers Math only and unlocks after 340 more Math questions.'` (`CENTER_SAT_UNLOCK_AT` is 440.)
  - `Math pickers keep today's copy`: `ringPlanCopy({ hard: 5, medium: 10 }, 100, 'math')` equals today's output for the same input.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **M8:** the copy above. For `reading_writing` at or past the unlock it's `'About {n} questions a day. The score prediction covers Math only and is already unlocked.'`
  - **M7:** a ghost `Back` button left of the main action on steps 2–7.
    - It goes to `step - 1`, except from step 7, which goes to 5 so the step-6 question is never re-answered.
    - Answers already given stay in state.
    - On step 1 there's no Back.
  - **M2:** in `useCenterDailyProgress`, `queryFn` throws on `error`, and the hook returns `failed`. On home, when `prog.failed`, show `<p role="alert" className="text-xs text-muted-foreground">Couldn't load today's speed runs.</p>` under the ring. The top bar already hides the chips while `!ready`.
- [ ] **Step 4: Run** `npx vitest run src/portal`. Expected: PASS.
- [ ] **Step 5: Commit:** `fix(portal): onboarding Back, honest prediction copy for R&W, no fake 0 runs`

### Task 11: AGENTS.md, the full check, merge

**Files:**
- Modify: `AGENTS.md`
- Create: `<scratchpad>/portal-e2e/part2.mjs`, the browser check. It uses `cdp.mjs`, `line` and `results`, like `run.mjs`.

- [ ] **Step 1: Update AGENTS.md** with three lines:
  - Center practice tests are intended. They're the published Tsetsegs tests, served only from International copies through `tenant_test_*` (0091). This is different from the switched-off SAT simulation test, which stays off.
  - Center concept video units come from `concept_videos.module` matching a College Panda topic name in `src/portal/videoTopics.ts`, in `order_index` book order.
  - Center badge pop-ups show once per student per badge (`tenant_badge_celebrations`, 0092). Every portal pop-up goes through `src/portal/popupGate.ts`.
- [ ] **Step 2: Write `part2.mjs`.**
  - **Setup:** run each check on phone (375×812), narrow (768×1024) and desktop (1280×860), in light and dark. Sign in with the zz accounts against the live DB, with Vite on 8095.
  - **Videos:**
    - 24 unit banners in topic order, with Topic 7 and 23 absent;
    - an area colour on each banner;
    - only the up-next unit open;
    - opening a second topic's first video works;
    - "Mark as watched" persists after reload;
    - home's preview agrees with "Up next";
    - no sideways scroll.
  - **Tests, as 99000002:**
    - the Tests tab shows 6 cards;
    - Start opens the runner;
    - answer 3 questions, flag one, open Calculator and Reference;
    - reload mid-module and the answers stay;
    - Finish module, Finish test (accept `window.confirm` through `Page.javascriptDialogOpening` or by overriding `window.confirm`);
    - the score shows and the review shows answers with "No explanation yet." where empty;
    - the history tab lists the attempt;
    - the card shows `Last score`.
  - **Badges, as 99000003:**
    - answer practice questions until 10 are answered;
    - the pop-up shows "First steps" with no points line;
    - Collect, reload: no pop-up;
    - a fresh browser context: no pop-up;
    - the badges page shows the earned card in colour.
  - **Gate:** with a Sheet (Announcements) open when a badge comes due, no pop-up until it closes.
  - **Leftovers:**
    - onboarding Back on a fresh student (create one only with Saagii's OK, or reuse a zz student mid-onboarding);
    - the R&W copy on step 7.
  - **Part 1 re-check:** top bar chips, rail hover, profile page, ring nudge.
- [ ] **Step 3: Run** `node <scratchpad>/portal-e2e/part2.mjs`. Expected: every line `true`. Fix failures in the owning task's files and re-run.
- [ ] **Step 4: Ask Saagii to check the main app's own profile heatmap** with a real Tsetsegs student (it hasn't been seen in a browser since the 28 Oct fix). Include it in a Lovable "test with real accounts" prompt.
- [ ] **Step 5: Run the full suite one more time,** then merge.
  - Run `npx vitest run` and `npx tsc --noEmit -p tsconfig.app.json`.
  - `git fetch && git rebase origin/main && git push origin HEAD:main`, only as a fast-forward.
  - Tell Saagii to publish from Lovable.
  - Update the memory file `center-student-portal-part2.md`.
