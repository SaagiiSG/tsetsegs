# Hide BBK questions from student practice + rebuild the 68 exam as a QR flow

## Part 1 — BBK questions out of student practice

The 50 questions coded `BBK0001`–`BBK0050` currently live inside the `68` question set, so they show up in the student 68 set, smart/adaptive practice, speed mode, challenges, review queue and set progress counts.

Approach: add a `hide_from_practice` flag on questions, set it to true for all `BBK%` codes, and filter on it in every student-facing question query. They stay fully usable in the admin question bank and in published practice tests (Bluebook module builder / exams), which do not apply the filter.

Student-side paths that get the filter:

- 68 / 800 / CollegeBoard set browsing and the question navigator
- Smart (adaptive) practice selection
- Speed mode and speed sessions
- Challenges question pool
- Review queue and set progress / mastery counts
- The hardest-questions picker used by the class exam

Set-progress totals will drop by 49 for the 68 set, which is correct — students never see those items.

## Part 2 — 68 exam: QR + phone entry flow

The auto-takeover for logged-in students is removed. New flow:

**Teacher**
1. Dashboard dock → Test → choose duration + class (own active SAT classes only) → Start.
2. A full-screen **join screen** appears: large QR code plus a short join code, class name, question count, duration, and a live roster of who has joined.
3. Teacher taps "Start exam" (or the scheduled start time hits) — everyone who joined moves into the exam together. Late scanners can still join while the exam is running; their clock ends with the class clock.
4. Live monitor and results screens stay as they are today (per-student score, accuracy, avg speed, focus flags, class trends).

**Student**
1. Scans the QR → public page, no login required.
2. Enters phone number → checked against the students enrolled in that class. If it does not match, a clear "this number isn't in this class" message; if it matches, their result is linked to their student account for analytics.
3. Waiting screen until the teacher starts, then the exam opens: one question per screen on mobile, two-pane with question rail on tablet/desktop, question grid, flagging, subtle timer that turns amber at 5 min and red at 1 min, and the **Desmos calculator** available exactly like in normal practice.
4. Focus lock on tablet/desktop (blur overlay, violations logged); auto-submit at time up.
5. Score screen: X / 22, accuracy, avg time per question, per-question correct/incorrect list, no answer reveal.

## Technical notes

Database:

- `questions.hide_from_practice boolean not null default false`; set true where `question_id like 'BBK%'`. `pick_hardest_questions` gains the same exclusion.
- `class_tests`: add `join_code` (short unique code per test) and `opens_at` handling so "scheduled" means "waiting in lobby" rather than a fixed countdown.
- `class_test_participants`: add `phone` and make `student_account_id` nullable-but-resolved, so a QR joiner is matched to their account by phone.
- New security-definer RPCs callable by `anon`, scoped to a single test id/join code so nothing else is exposed:
  - `class_test_join(join_code, phone)` → validates the phone is enrolled in that test's batch, creates/returns the participant row plus test metadata.
  - `class_test_questions(participant_token)` → returns the frozen question list without answers.
  - `class_test_submit_answer(...)` / `class_test_submit(...)` → grade server-side so answers are never sent to the browser.
- Grants + RLS written so anonymous access exists only through those RPCs, never via direct table reads.

Frontend:

- New public route `/exam/:joinCode` → `src/pages/public/ClassTestJoin.tsx` (phone entry + lobby) which then renders the exam runner.
- `ClassTestRunner` refactored to work from RPC data instead of a logged-in student session, with the Desmos calculator mounted the same way as `StudentQuestion`.
- Teacher side: new `TestJoinScreen` (QR + roster + start button) inserted between `StartTestDialog` and `TestLiveMonitor`.
- `ActiveClassTestWatcher` removed from the student shell.
- QR rendered client-side with a small QR library (no external image service).
