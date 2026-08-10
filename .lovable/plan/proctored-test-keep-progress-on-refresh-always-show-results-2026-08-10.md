# Proctored test: keep progress on refresh + always show results

Two fixes: students must never lose work when the page reloads, and a force-ended test must produce scores for everyone — visible to the student and the teacher.

## 1. Progress is not being saved during the test

What the database shows: for the last session, every participant who submitted has `answers_saved_at` exactly equal to `submitted_at` and `started_at` empty. `started_at` and `answers_saved_at` are only ever written by the mid-test save routine, so that routine never landed a single time — the test only ever wrote at submit. That is why a refresh restarts from question 1 with a blank paper. The permissions on the save routine are correct, so the failure is on the call side; the app fires it without awaiting or checking the error, so nothing surfaced. First step is to make that call report failures, then fix what it reports.

Fix, in layers, so a reload is safe even with no network:

- **Local-first snapshot (works offline, like the 68 exam).** Persist the whole run to the device: the downloaded paper, answers, current module, current question, per-module clock end, and violation count, written on every answer and every navigation. On load, restore from the device snapshot before waiting on the server, so the student lands exactly where they left off with the timer continuing from the original module start.
- **Server sync as backup.** Await the save routine, surface errors (small "not synced" indicator plus retry), retry on failure and on reconnect. On a fresh device with no snapshot, fall back to the server's saved answers and module, as today.
- **Resume screen.** When a snapshot or server progress exists, show a short "Continue where you left off — Module X, question Y" confirmation instead of dropping straight into a fresh Module 1, matching the class-exam recovery flow.
- Restoring the question index and clock also removes the current behaviour where an in-module refresh sends the student back to question 1.

## 2. Force end must produce results

Today force end only flips the session to `finished`. Only students whose browser is still open auto-submit; anyone who closed or crashed stays ungraded forever, so the teacher's roster shows no score and the student sees a bare "This session has ended".

- Add a server-side finalize step that runs when a session is force-ended (and when it ends normally): grade every participant who has not submitted, using their last saved answers, writing the same overall and per-module results the normal submit writes. Blank answers count as wrong.
- Teacher: after force end, the monitor shows every student with a score and the Module 1 / Module 2 chips it already renders, and the session stays openable from "Recent sessions" to review results later.
- Student: on a finished session, show their raw score and per-module breakdown instead of the dead-end message — including students who reconnect after the test was ended.

## Technical notes

- Client: `src/components/student/proctor/ProctorRunner.tsx` (snapshot persistence, awaited saves, restore of module/question/clock), `src/pages/public/ProctorExam.tsx` (resume prompt, finished-session results view).
- Teacher: `src/components/teacher/proctor/ProctorMonitor.tsx` calls the finalize step as part of "Force end" and reloads the roster.
- Database: new security-definer routine `proctor_finalize_session(session_id)` that reuses the existing grading logic from `proctor_submit` for unsubmitted participants; `proctor_state` already returns the score fields the student view needs.
- Verification: run a session end-to-end in a browser against a throwaway session — answer a few questions, hard-refresh mid-module and confirm answers, module, question and timer survive; then force end from the teacher side with one student's tab closed and confirm both the teacher roster and the student's page show scores. Test data cleaned up afterwards.
