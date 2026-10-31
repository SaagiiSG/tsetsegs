# Center Proctored Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Center teachers run a proctored practice test with the main site's steps:
1. Start: QR + join code.
2. The unlock code.
3. The oath.
4. Start for everyone.
5. Monitor and review mode.
6. Force end.

Signed-in center students join, wait, take the test in the existing center runner, and see results as review mode allows.

**Architecture:**
- **Tables:** one new table, `tenant_proctor_sessions`. A proctored sitting is an ordinary `tenant_test_attempts` row with a `session_id`.
- **Runner:** `CenterPracticeTest` runs the test unchanged except for small gates.
- **Server rules:** everything students must not bypass lives in SECURITY DEFINER RPCs, in one migration.
- **Teacher UI:** mirrors `src/components/teacher/proctor/*` in `src/portal/proctor/`.

**Tech Stack:** React 18 + TypeScript, TanStack Query, shadcn/ui, Supabase (Postgres RLS + RPC), vitest, PGlite for SQL checks, the CDP browser driver in `flowersos/tools/portal-e2e/`.

**Spec:** `docs/superpowers/specs/2026-10-30-center-proctored-tests-design.md`

## Global Constraints

- **Codes:** join and unlock codes are each 6 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no I, O, 0 or 1).
- **Tests:** only tests in the eligible list: published Math tests whose every question has an active International copy. This is the same rule as `tenant_practice_tests` in 0091.
- **Joining:** only signed-in students on the chosen class's active roster (`tenant_my_student_id`) can join. There is no phone step.
- **Paper:** students get no paper until the session is `active` and their oath is accepted.
- **Answer keys:** no `answer`, `alternate_answers` or `rationale` reaches a student while review is `off`.
- **Correctness mode:** a per-question `correct` boolean, with no keys.
- **Clock:** Module 1 runs from the room's `started_at`. Module 2 starts when that student advances (the existing `tenant_test_save` behaviour).
- **Late join:** a student who joins more than 2 minutes after `started_at` is flagged in the monitor.
- **Finalize:**
  - grades every oath-taken unfinished attempt;
  - deletes attempts that never took the oath (they never saw the paper);
  - turns review `off` into `explanations`.
- **Self-starting:** a student may still self-start the same test (Saagii, 30 Oct). Self-started and proctored attempts must not collide.
- **Migration number:** `0105` (0104 is the admin session's). On main, 0103 and 0104 must land before 0105.
- **UI and copy:** shadcn/ui only, in the portal's glass classes, readable in light and dark (`.dark`), and no sideways scroll at 375px. Plain, short copy.

## Review Focus

1. **Refresh or second tab mid-test.** A student who refreshes, or opens the link in a second tab, comes back to the same attempt and the same clock. They do not get a new attempt or a reset timer. Tests are in Task 2 and Task 4.
2. **Late join after start.** A late joiner still has to unlock and take the oath. Their Module 1 clock is the room's, so it may already be short. Tests are in Task 2.
3. **Force end while a student is on Module 1.** Their saved answers are graded, and the runner shows the result within about 10 seconds without a manual refresh. Tests are in Task 2 and Task 4.
4. **Same test self-started and proctored.** Both attempts exist side by side. Neither the `tenant_test_start` resume nor the open-attempt index picks up the other one. Tests are in Task 1.
5. **Wrong code, then the right one.** A wrong unlock code shows an error and allows a retry. A rotated code invalidates the old one for students who have not unlocked yet. Tests are in Task 2.

---

### Task 1: Schema and gates on the existing test RPCs (migration 0105, part 1)

**Files:**
- Create: `drizzle/migrations/0105_center_proctored_tests.sql`, `drizzle/migrations/meta/0105_snapshot.json`. Copy the pattern of 0103: an empty snapshot with `prevId` set to 0103's `id`, and a journal entry with `idx` 105.
- Modify: `drizzle/migrations/meta/_journal.json`
- Test: `/Users/saranochirsereglen/Developer/Saagii21/flowersos/tools/proctor-sql/check.mjs`. This lives outside the repo. Install `@electric-sql/pglite@0.3` in that folder.

**Interfaces:**
- **Produces, tables:**
  - `tenant_proctor_sessions(id uuid pk, institution_id uuid not null → institution_customers, class_id uuid not null → tenant_classes on delete cascade, test_id uuid not null → bluebook_tests, title text not null, join_code text not null unique, unlock_code text not null, status text not null default 'lobby' check in ('lobby','active','finished'), review_mode text not null default 'off' check in ('off','correctness','explanations'), created_by uuid not null default auth.uid(), started_at timestamptz, finished_at timestamptz, created_at timestamptz not null default now())`.
  - On `tenant_test_attempts`, add `session_id uuid → tenant_proctor_sessions on delete set null`, `code_verified_at timestamptz`, `oath_accepted_at timestamptz` and `focus_violations integer not null default 0`.
- **Produces, access to the sessions table:**
  - RLS: staff (`tenant_has_role(institution_id,'teacher')`) can SELECT, and can UPDATE only `review_mode`. All other writes go through RPCs, so revoke INSERT and DELETE from authenticated.
  - Platform admins get ALL.
  - Students have no policy.
- **Produces, grants:** `GRANT SELECT(session_id, code_verified_at, oath_accepted_at, focus_violations) ON tenant_test_attempts TO authenticated`. 0091 grants columns one by one, so new columns are not readable without this.
- **Produces, indexes:**
  - Replace `tenant_test_open_idx` with `UNIQUE (student_id, test_id) WHERE status='in_progress' AND session_id IS NULL`.
  - Add `UNIQUE (session_id, student_id) WHERE session_id IS NOT NULL`.
- **Produces, internal function:** `public.tenant_test_grade(_attempt uuid) RETURNS void`.
  - Grades the attempt from its stored `answers`, using the same `fill_answer_matches` loop and `math_score` formula as `tenant_test_save` in 0091.
  - Sets `status='completed'` and `completed_at=now()`.
  - Does nothing if already completed.
  - `REVOKE ALL … FROM PUBLIC, anon, authenticated`.
- **Produces, redefined functions:**
  - `tenant_practice_tests(uuid)` and `tenant_test_start(uuid,uuid)`: as 0091, but every "open attempt" lookup adds `AND session_id IS NULL`.
  - `tenant_test_save(uuid,jsonb,boolean,integer)`: as 0091, plus:
    - when `session_id IS NOT NULL`, it returns without changes unless the session is `active` and `oath_accepted_at IS NOT NULL`;
    - the final-module branch stores `answers` and then calls `tenant_test_grade(a.id)`.
  - `tenant_test_state(uuid)`: as 0091, plus a `session` key (`{status, review_mode, title}`, or null). For proctored attempts:
    - `paper` is `[]` until the session is active and the oath is accepted;
    - once completed, `off` strips `answer`, `alternate_answers` and `rationale`;
    - `correctness` strips them too but adds `correct` (boolean, from `fill_answer_matches`);
    - `explanations` behaves like 0091.

- [ ] **Step 1: Write the failing checks.** `check.mjs` builds stand-ins:
  - roles `anon`, `authenticated` and `service_role`;
  - `auth.uid()` reading `current_setting('test.uid')`;
  - minimal `institution_customers`, `tenant_classes`, `tenant_students(id, institution_id, class_id, user_id, active)`, `tenant_members`, `bluebook_tests`, `bluebook_modules`, `bluebook_module_questions`, `questions(id, question_id)` and `intl_questions(id, question_id, is_active, question_text, answer, alternate_answers, rationale, …)`;
  - `fill_answer_matches(text, text, text[])` doing a trimmed, case-insensitive equality;
  - `tenant_has_role`, `tenant_my_student_id`, `has_role`;
  - then runs 0091, 0103 and 0105 in that order.

  It prints `ok` or `BAD` per check, as `flowersos/../scratchpad/pg/rls.mjs` did for 0103. Checks:
  - `self-start and proctored attempts of one test coexist`
  - `tenant_test_start resumes the self-started attempt, not the proctored one`
  - `proctored state has no paper before start`
  - `proctored save is ignored before start`
  - `review off strips answer, alternate_answers, rationale`
  - `correctness returns correct flags and no keys`
  - `explanations returns keys and rationale`
  - `self-started attempts behave exactly as 0091` (start → save → advance → graded score)
  - `student cannot execute tenant_test_grade`
- [ ] **Step 2:** Run `node /Users/saranochirsereglen/Developer/Saagii21/flowersos/tools/proctor-sql/check.mjs`. Expected: it fails, because 0105 doesn't exist yet.
- [ ] **Step 3:** Write part 1 of `0105_center_proctored_tests.sql` (everything in the Interfaces above), plus the journal entry and the snapshot.
- [ ] **Step 4:** Run check.mjs. Expected: every line `ok`.
- [ ] **Step 5:** Commit `0105 part 1: proctor session table, attempt columns, gated test RPCs`.

### Task 2: Proctor RPCs (migration 0105, part 2)

**Files:**
- Modify: `drizzle/migrations/0105_center_proctored_tests.sql` (append)
- Test: `flowersos/tools/proctor-sql/check.mjs` (add checks)

**Interfaces:** all functions are SECURITY DEFINER with `SET search_path=public`. Executable by `authenticated` only (`REVOKE … FROM PUBLIC, anon`). End with `NOTIFY pgrst, 'reload schema';`.

**Staff** (each checks `tenant_has_role(institution,'teacher')`; session functions take the institution from the session row):

| Function | Returns | Does |
|---|---|---|
| `tenant_proctor_tests(_institution uuid)` | `jsonb` | The eligible list, same shape as `tenant_practice_tests`, without `last_score` and `open_attempt`. |
| `tenant_proctor_create(_institution uuid, _class uuid, _test uuid)` | `uuid` | Checks the class is in the center and the test is in `tenant_proctor_tests`. Title is the test name. Generates both codes and retries on a `join_code` clash. |
| `tenant_proctor_rotate_unlock(_session uuid)` | `text` | New unlock code; lobby or active only. |
| `tenant_proctor_start(_session uuid)` | `void` | Lobby only: sets `status='active'` and `started_at=now()`, and sets `module_started_at=now()` on every attempt of the session. |
| `tenant_proctor_finalize(_session uuid)` | `void` | As in Global Constraints. Safe to call twice. |

**Student** (each checks that the attempt's `student_id = tenant_my_student_id(institution_id)`):

| Function | Returns | Does |
|---|---|---|
| `tenant_proctor_join(_institution uuid, _join_code text)` | `uuid` (attempt id) | Case-insensitive code, session not finished, student on the session's class roster. Returns the existing attempt for (session, student), or inserts one: paper built exactly as in `tenant_test_start`, `test_id`, `test_name`, `session_id`, and `module_started_at` = the session's `started_at` if active, else `now()`. |
| `tenant_proctor_unlock(_attempt uuid, _code text)` | `boolean` | Matches the session's current `unlock_code`, case-insensitive. Sets `code_verified_at`. |
| `tenant_proctor_oath(_attempt uuid)` | `void` | Requires `code_verified_at`. Sets `oath_accepted_at`. |
| `tenant_proctor_state(_attempt uuid)` | `jsonb` | `{ title, status, review_mode, started_at, unlocked: bool, oath: bool, attempt_status, current_module }`. Never the unlock code. |
| `tenant_proctor_focus(_attempt uuid, _violations integer)` | `void` | `focus_violations = GREATEST(focus_violations, _violations)`. |

- [ ] **Step 1: Add the failing checks.** In check.mjs, using two students in the class, one student in another class, and a teacher of another center:
  - `outsider class student cannot join`
  - `other-center teacher cannot create, start or finalize`
  - `join twice returns the same attempt`
  - `wrong unlock code returns false; right one true`
  - `rotated code rejects the old code`
  - `oath before unlock is refused`
  - `state never contains unlock_code`
  - `start sets every attempt's module_started_at to started_at`
  - `late join gets module_started_at = started_at`
  - `save works after start and oath`
  - `finalize grades oath-taken attempts from saved answers, deletes never-oathed ones, flips off→explanations`
  - `finalize twice is harmless`
  - `focus count only goes up`
- [ ] **Step 2:** Run check.mjs. Expected: the new checks fail.
- [ ] **Step 3:** Append the RPCs to 0105.
- [ ] **Step 4:** Run check.mjs. Expected: all `ok`.
- [ ] **Step 5:** Commit `0105 part 2: center proctor RPCs`.

### Task 3: Teacher side: Proctor in the dock

**Files:**
- Create: `src/portal/proctor/CenterProctor.tsx` (the list, start dialog, lobby, monitor and review-mode control; split into several files in `src/portal/proctor/` if it passes ~350 lines), `src/portal/proctor/proctorModel.ts`, `src/portal/proctor/proctorModel.test.ts`
- Modify: `src/portal/CenterTeacherPortal.tsx`. Add `'proctor'` to `Mode`, `MODE_ORDER` and `MODE_GLOW` (`'345 75% 55%'`), and a dock item `{ key: 'proctor', label: 'Proctor', icon: ShieldCheck }`. Render `<CenterProctor classes={classes} />` for that mode.
- Test: add a `proctor` section to `flowersos/tools/portal-e2e/teacher.mjs`

**Interfaces:**
- **Consumes:** the Task 2 staff RPCs. Reads `tenant_proctor_sessions` (staff SELECT) and `tenant_test_attempts` columns `id, student_id, started_at, code_verified_at, oath_accepted_at, current_module, focus_violations, status, math_score, math_correct, math_total`, with names from `tenant_students`.
- **Produces:**
  - `export function CenterProctor({ classes }: { classes: { id: string; name: string }[] })`
  - `proctorModel.ts` exports `rosterState(a): 'joined' | 'unlocked' | 'oath' | 'testing' | 'done'` and `isLateJoin(attemptStartedAt: string, sessionStartedAt: string | null): boolean`, using 2 minutes.

**Behaviour.** Mirror the layout and copy of `src/components/teacher/proctor/{ProctorContent,ProctorStartDialog,ProctorLobby,ProctorMonitor,ReviewModeControl}.tsx`:
- **List:** recent sessions for the teacher's classes (`class_id in classes`), up to 20.
- **Start dialog:** a test picker from `tenant_proctor_tests` and a class picker.
- **Lobby:**
  - QR code from `react-qr-code` pointing at `${location.origin}/proctor/${join_code}`, plus the join code;
  - the unlock code hidden behind an eye button, with Rotate;
  - roster refreshing every 4s;
  - "Start for everyone" calls `tenant_proctor_start`.
- **Monitor:** refreshes every 6s and shows module, focus losses, the late-join flag, and score once done. "Force end" (with a confirm) calls `tenant_proctor_finalize`. The review-mode Select does a direct UPDATE of `review_mode`.

Steps:
- [ ] **Step 1:** Write `proctorModel.test.ts`:
  - `rosterState` covers each stage;
  - `isLateJoin('…T10:02:01Z','…T10:00:00Z')` is true;
  - `isLateJoin('…T10:01:59Z','…T10:00:00Z')` is false;
  - `isLateJoin(x, null)` is false.

  Run `npx vitest run src/portal/proctor`. Expected: FAIL.
- [ ] **Step 2:** Implement `proctorModel.ts`. Run the tests. Expected: PASS.
- [ ] **Step 3:** Build `CenterProctor` and wire up the dock. Run `npx tsc --noEmit -p tsconfig.app.json`. Expected: only the `LandingShaderBackground.tsx` error.
- [ ] **Step 4:** Commit `Center teacher: Proctor in the dock (list, start, lobby, monitor, review mode)`.

The browser checks for this task run in Task 5, because the RPCs only exist once 0105 is live.

### Task 4: Student side: join, unlock, oath, wait, test, results

**Files:**
- Create: `src/portal/CenterProctorJoin.tsx`, `src/portal/proctorFocus.ts`, `src/portal/proctorFocus.test.ts`
- Modify:
  - `src/portal/CenterPortalApp.tsx`: route `/proctor/:code`. A student is sent to `/student/proctor/:code`. A signed-out visitor gets `sessionStorage['center-after-signin'] = '/student/proctor/:code'` and the sign-in. After sign-in, `home` uses and clears that value.
  - `src/portal/CenterStudentPortal.tsx`: route `proctor/:code` renders `<CenterProctorJoin />`.
  - `src/portal/CenterPracticeTest.tsx`:
    - `TestState` gains `session: { status: string; review_mode: string; title: string } | null` and `focus_violations`;
    - while proctored and not completed, `refetchInterval: 10000`;
    - when completed, the "Correct answer" block shows only if `q.answer` is present, and a right/wrong mark shows when `q.correct` is present;
    - while proctored and not completed, count focus losses with `proctorFocus` and send them with `tenant_proctor_focus`.
  - `src/portal/CenterPracticeTests.tsx`: the history select adds `session_id`, and rows with one show a "Proctored" badge.
- Test: `src/portal/proctorFocus.test.ts`

**Interfaces:**
- **Consumes:** the Task 2 student RPCs, and `tenant_test_state` with its `session` key from Task 1.
- **Produces:** `proctorFocus.ts` exports `countsAsFocusLoss(event: 'blur' | 'hidden', activeElementTag: string | undefined): boolean`. It is false when the active element is an `IFRAME` (Desmos), so calculator clicks don't count; that matches main.

**Screens in `CenterProctorJoin`, in order:**
1. **Joining** (calls `tenant_proctor_join`). Errors: "This code isn't open", "You're not on this class's list".
2. **Unlock code input.** A wrong code shows "That code didn't work".
3. **Oath.** A checkbox, plus "I agree" calling `tenant_proctor_oath`. Copy the oath text from main's `src/pages/public/ProctorExam.tsx`.
4. **Waiting room.** Polls `tenant_proctor_state` every 5s.
5. **Session active and oath taken:** `navigate('/student/tests/' + attemptId, { replace: true })`.
6. **Finished:** if completed, go to the runner (results). Otherwise show "This session has ended".

The page re-enters at the right step from `tenant_proctor_state`, so refreshing never restarts it.

- [ ] **Step 1:** Write `proctorFocus.test.ts`:
  - `countsAsFocusLoss('hidden', 'BODY')` is true;
  - `countsAsFocusLoss('blur', 'IFRAME')` is false;
  - `countsAsFocusLoss('blur', 'INPUT')` is true.

  Run the test. Expected: FAIL.
- [ ] **Step 2:** Implement `proctorFocus.ts`. Run the test. Expected: PASS.
- [ ] **Step 3:** Build the join page, the routes and the runner/history changes. Run `npx vitest run` and the type check. Expected: all tests pass, and only the known type error.
- [ ] **Step 4:** Commit `Center student: proctored test join, unlock, oath, waiting room; runner honours review mode`.

### Task 5: Merge, apply, prove it end to end

**Files:**
- Test: `flowersos/tools/portal-e2e/proctor.mjs` (new; reuses `cdp.mjs` and teacher.mjs's sign-in)

- [ ] **Step 1: Merge and push.**
  - Run `git fetch` and check that `origin/main` contains 0104 (the admin session's).
  - If it doesn't, stop and ask Saagii about the order, because 0105 must follow 0104.
  - Rebase the branch on `origin/main`, then run vitest, tsc and `node teacher.mjs` (expected: 0 FALSE).
  - Fast-forward push to `main`.
- [ ] **Step 2: Saagii applies the migrations.** Ask him to publish from Lovable and apply the pending migrations (0103, 0105).
  - Verify read-only: `tenant_homework` is readable, and `rpc('tenant_proctor_tests')` as the zz teacher returns at least 1 test.
- [ ] **Step 3: Write `proctor.mjs`** (zz center only; three browser contexts):
  1. The teacher creates a session for "ZZ Batch" from the first eligible test.
  2. Student 1 (99000001) and student 2 (99000002) open `/proctor/<code>`, enter a wrong code and then the right one, and take the oath.
  3. The teacher's roster shows both with "oath ✓"; the teacher starts.
  4. Student 1 answers 3 questions and refreshes, and still has the same attempt with less time left.
  5. Student 3 (99000003) joins late and must unlock, and the monitor flags a late join.
  6. The teacher sets review to "correctness", then force-ends.
  7. Student 1's runner shows a score and right/wrong marks, with no "Correct answer" text, within 15s.
  8. The teacher switches to "explanations", and student 1 sees correct answers.
  9. Run at desktop and phone, light and dark, with screenshots.
- [ ] **Step 4:** Run `E2E_CDP_PORT=9341 E2E_BASE=http://localhost:8097 node proctor.mjs`. Expected: `0 FALSE`. Fix forward, re-run, push.
- [ ] **Step 5:** Update `flowersos/` with a dated handoff note, then tell Saagii to publish.
