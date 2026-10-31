# Center proctored tests: the main site's proctor flow for center teachers

Agreed with Saagii on 30 Oct 2026: center teachers get proctored tests, a new item in the teacher dock. He asked for "the same steps as the main site".

## Why

On the main site a teacher can run a Bluebook practice test in the room:
- everyone joins by QR;
- the teacher reads out an unlock code;
- students take an oath;
- the teacher starts everyone at once and watches progress live.

Center teachers can't do this yet. Their students can only start practice tests alone, from the student portal's Tests page. Centers run classes in a room, and a test under supervision is what they sell to parents.

## The main flow this copies

Mapped from the code on 30 Oct.

**Teacher** (`src/components/teacher/proctor/`):
1. **Start dialog.** Pick a test and, optionally, a class. This creates a session with a 6-character join code and a 6-character unlock code, both drawn from a 32-character alphabet without I, O, 0 or 1.
2. **Lobby.**
   - Shows a QR code and link to `/proctor/<join code>`, plus the join code itself.
   - The unlock code stays hidden until the teacher reveals it, and the teacher can rotate it.
   - The roster shows each student as joined, unlocked or "oath ✓", refreshed every 4 seconds.
3. **Start for everyone.** The session becomes `active` and the room's start time is set.
4. **Monitor.** For each student: module, focus losses, a "late join" flag (joined more than 2 minutes after the start), score and per-module results. Refreshes every 6 seconds.
5. **Review mode.** Set in the lobby or the monitor: off, correctness only, or full answers and explanations.
6. **Force end.**
   - Grades everyone who took the oath but never submitted.
   - Marks the session finished.
   - Turns review "off" into "explanations".

**Student** (`src/pages/public/ProctorExam.tsx`):
1. Join with the QR or link.
2. Type the unlock code.
3. Tick the oath.
4. Wait in the waiting room.
5. Take the modules. There is no break, and each module has a check-your-work screen.
6. Submit, or be auto-submitted when the teacher ends the session.
7. See results, as far as review mode allows.

## Goals

1. **Dock item.** A "Proctor" item in the center teacher dock opens the proctor page: recent sessions plus a "New session" button, as on the main site.
2. **Start.** Teachers pick from the tests their center can already use: published Math tests whose every question has an International copy. That is the same list as `tenant_practice_tests` in 0091. They also pick one of their classes.
3. **Same steps as main for teachers.** Lobby with the QR, join code, hidden or rotatable unlock code and live roster; start for everyone; monitor; review mode; force end.
4. **Same steps as main for students:**
   - the QR or link opens the center portal;
   - after sign-in they enter the unlock code, tick the oath, wait, take the test, and see results as review mode allows.
5. **Shared clock for Module 1, as on main.**
   - Module 1's clock runs from the room's start, so a late joiner gets only the time left in Module 1.
   - Each student's Module 2 clock starts when that student finishes Module 1, so there is no room timetable.
   - The test ends when everyone submits or the teacher force-ends it.
   - (Builder check: main's lobby sets `current_module: 1` and never moves it on.)
6. **Reuse the center test runner.** Students take the test in the existing `CenterPracticeTest` runner, so the Desmos calculator, reference sheet, flagging, auto-advance and save-and-retry all carry over.
7. **History.** A proctored attempt appears in the student's existing test history, marked as proctored.

## Differences from the main site (my calls, for Saagii to check)

| Main site | Center | Why |
|---|---|---|
| The student types a phone number to join; the participant id becomes the only credential | Students are already signed in to the center portal, so the QR opens the portal and their identity comes from the sign-in (`tenant_my_student_id`). No phone step. | On the main site, anyone who knows a join code and a registered phone number gets a participant id that can save and submit that student's answers. Center sign-in closes that hole. |
| The class choice is stored but not enforced | Only students on the chosen class's roster can join | Keeps the roster clean and stops students from other classes or centers joining |
| The question paper is available once the oath is accepted, before the start | The paper is held back until the teacher starts | Nobody can read questions while waiting |
| Math and Reading & Writing | Math only | Center tests are Math only (0091) |
| Device-vs-server answer conflict screen | The center runner's existing draft recovery | The center runner already saves each module's draft and retries after a dropped connection |

## Non-goals

- English or Reading & Writing sections.
- Breaks between modules. The main flow has none.
- Proctoring tests the center can't already use.
- Changes to the main site's proctor flow.

## Anti-goals (it fails even if it works)

- A student can reach answer keys or explanations before the teacher allows it.
- A student outside the chosen class, or from another center, can join, save or submit.
- One center's teacher can see another center's sessions, codes or results.
- A self-started practice attempt and a proctored attempt of the same test fight over the same row.

## Known gap, kept on purpose

**Students can self-start a proctored test on their own.** Saagii, 30 Oct: allow it, same as the main site. Students can take a test alone before or during a session and see its answers once they finish. There is no blocking and no "already practised" flag.

**Center students can already read answers in the question bank.**
- They can read `answer`, `alternate_answers` and `rationale` for any International question straight from `intl_questions`. That access comes from 0088 and 0005, and the practice bank depends on it.
- During a proctored test, a student who knows how to use the browser's developer tools could look up a question's answer by its id.
- The main site has the same gap. Closing it means routing practice, Live, review and the rest through locked-down functions, which is a large, risky change. 0088 already broke main students once.
- **So "no leaks" here means:** the proctor RPCs, `tenant_test_state` and the attempts table never return keys while review is off. It does not cover the bank.

## Data

**`tenant_proctor_sessions`.** Columns:
- `id`, `institution_id`, `class_id`, `test_id` (→ `bluebook_tests`), `title`;
- `join_code` (unique) and `unlock_code`;
- `status`: lobby, active or finished;
- `review_mode`: off, correctness or explanations;
- `created_by`, `started_at`, `finished_at`, `created_at`.

Center staff (`tenant_has_role(institution_id,'teacher')`) manage their center's sessions. Students never read this table directly, because it holds the unlock code.

**`tenant_test_attempts` gets:**
- `session_id` (null for self-started attempts);
- `code_verified_at`, `oath_accepted_at`;
- `focus_violations` (int, default 0).

**Fixes to existing pieces:**
- **The open-attempt index.** Today it is unique on `(student_id, test_id) WHERE in_progress`. It must not block a proctored attempt when the same test is also open as self-started, so key proctored attempts by `(student_id, session_id)` and leave the existing index to self-started ones.
- **Staff read access.** Center staff can already read attempts through 0103's "Center staff read test attempts" policy. `paper` stays ungranted.

**RPCs** (all SECURITY DEFINER, each checking identity inside):

| RPC | Caller | Does |
|---|---|---|
| `tenant_proctor_tests(_institution)` | Staff | The eligible test list, so the start dialog can show it. `tenant_practice_tests` itself refuses staff. |
| `tenant_proctor_join(_institution, _join_code)` | Signed-in student on the class roster | Creates or returns their attempt for that session, with the paper snapshot taken as in `tenant_test_start`. Refuses a finished session. |
| `tenant_proctor_unlock(_attempt, _code)` | That student | Case-insensitive match against the session's unlock code. Sets `code_verified_at`. |
| `tenant_proctor_oath(_attempt)` | That student | Sets `oath_accepted_at`, but only if already unlocked. |
| `tenant_proctor_state(_attempt)` | That student | Session status, title, review mode and the room's start, plus their own unlock, oath, module and progress. Never the unlock code. |
| `tenant_proctor_start(_session)` | Staff | Sets the session to `active` and `started_at = now()`, and sets every joined attempt's `module_started_at` to the same time. |
| `tenant_proctor_finalize(_session)` | Staff | Grades every oath-taken attempt that never finished, using the grading inside `tenant_test_save`, pulled out into a helper both can call. Marks the session finished and turns review `off` into `explanations`, as on the main site. |

**Changes to existing RPCs:**
- **`tenant_test_state`.** For a proctored attempt:
  - no paper until the session is active;
  - answer keys and rationale only when review mode allows: correctness shows right or wrong only, explanations shows everything.
- **`tenant_test_save`.**
  - For a proctored attempt, refuse saves before the session is active and after it is finished.
  - A late joiner's clock runs from the room's `module_started_at`.
  - Focus losses are counted, and the count only ever goes up.

## Student side

- A route in the center portal, e.g. `/proctor/:code`.
- Signed out: the existing sign-in, then back to that route.
- Screens in order: unlock code → oath → waiting room (refreshed every few seconds) → `CenterPracticeTest` → results. The results respect review mode, just as main's `proctor_review` does.
- Window blur and tab switching add to `focus_violations`.

## Teacher side

- The center's `ProctorContent`, `ProctorStartDialog`, `ProctorLobby`, `ProctorMonitor` and `ReviewModeControl`.
- Same layout and steps as main, reading the center tables and RPCs above.
- Shown under the new "Proctor" dock item.
- Built with shadcn components and the portal's glass classes, and checked in light and dark mode.

## Left to the builder

- **Refreshes.** Polling as on the main site, or realtime: the center already uses realtime for live sessions.
- **The code generator.** Must use the same alphabet and length as main.
- **Sharing teacher components.** Share main's components where the data can be passed in. Otherwise mirror them in `src/portal/`.
- **Late join.** The exact "late join" cut-off follows main (2 minutes).
- **Small follow-ons, following main or existing center patterns:**
  - attempts from students who joined but never took the oath;
  - per-module results in the monitor;
  - whether the score shows while review is off (main shows it);
  - not counting calculator clicks as focus losses (main already skips them);
  - which sessions each staff member can see.

## Checks

- **Database.** Every RPC rejects the wrong student, the wrong center and the wrong session state. Run the checks in PGlite with role stand-ins, as was done for 0103.
- **End to end.** On the zz test center with two signed-in zz students: join, unlock, oath, start, answer, late join, force end, and each review mode.
- **No leaks.** No path returns `answer` or `rationale` to a student while review is off.
