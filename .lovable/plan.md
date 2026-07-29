## Goal

A new **Test** tab in the teacher dashboard's Practice section that runs a timed 22-question class test drawn from the hardest problems in the 68 set, auto-pushed to every logged-in student in the chosen class, with live monitoring and post-test analytics for the teacher and an instant score for the student.

## Teacher flow

1. Practice → **Test** tab → "Start 68 Test".
2. Setup dialog:
   - Duration (preset chips 20 / 30 / 45 min + custom)
   - Start time (Now, or in 1/5/10 min, or pick a time)
   - Class picker (their batches)
   - Preview of the auto-selected 22 questions (accuracy % and avg time per question shown)
3. Confirm → test is created in `scheduled` state; teacher lands on a **live monitor** screen: who joined, who is in progress, live answered counts, focus-loss flags, countdown.
4. When time expires (or teacher taps "End now"), the test flips to `finished` and results appear.

## Student flow

1. Any logged-in student whose account links to that class gets a full-screen takeover: "Your teacher started a 68 Test — starting in Xs" with a countdown.
2. At T-0 the test opens automatically:
   - **Mobile**: one question per screen, big tap targets, bottom sheet for the question grid, sticky slim timer.
   - **Tablet/desktop**: two-pane layout, question grid rail, focus lock on.
   - Free navigation: skip, flag, revisit, change answers until time is up.
3. Subtle timer top-center; turns amber at 5 min, red at 1 min.
4. Auto-submit on timeout; manual "Submit test" with confirm.
5. Result screen: **X / 22**, accuracy, avg time per question, per-question correct/incorrect list (no answer reveal, per existing practice rules).

## Question selection

Computed at test creation from live `student_attempts` joined to `questions` where `question_set = '68'`:

- Rank by a difficulty score combining low first-attempt accuracy and high avg `time_spent_seconds` (z-scored, weighted 60% accuracy / 40% time), minimum attempt threshold so noisy questions don't win.
- Top 22 are snapshotted into the test row so the set is frozen for that test even if stats shift mid-test.

## Focus lock (tablet/desktop only)

Reuses the existing security wrapper pattern: on tab blur / visibility change the screen blurs with a "Return to your test" overlay, a warning toast fires, and each violation is logged to the attempt row. The teacher's results view shows a flag count per student. No auto-submit.

## Teacher results

- **Overall**: class average score /22, accuracy %, avg time per question, score distribution, hardest questions for this class (per-question accuracy bars).
- **Per student**: score, accuracy, avg speed, time used, focus-loss flags, per-question breakdown; sortable table plus a comparison against the class average.

## Technical notes

New tables (with GRANTs + RLS, teacher/admin write, student read-own):

- `class_tests` — batch_id, teacher, title, question_ids (jsonb snapshot), duration_seconds, starts_at, status (scheduled/active/finished/cancelled), created/finished timestamps.
- `class_test_participants` — test_id, student_account_id, joined_at, submitted_at, score, correct_count, total_time_ms, focus_violations.
- `class_test_answers` — test_id, participant_id, question_id, selected_answer, is_correct, time_ms, flagged.

Realtime is enabled on `class_tests` and `class_test_participants` so the auto-push, countdown, and live monitor all react instantly.

A DB function picks the hardest 22 (security definer, teacher/admin only) so the ranking runs server-side over the full attempt history rather than in the browser.

Frontend:

- `src/components/teacher/practice/test/` — `TeacherTestTab`, `StartTestDialog`, `TestLiveMonitor`, `TestResults` (overall + per-student).
- `src/components/student/test/` — a global `ActiveClassTestWatcher` mounted in the student shell (so the takeover works from any page), `TestCountdownOverlay`, `ClassTestRunner` (responsive), `TestResultScreen`.
- New tab wired into `TeacherPracticeHub` next to Browse / Live Session / Flagged.

The design stays inside the existing coral/indigo token system — no new hardcoded colors.
