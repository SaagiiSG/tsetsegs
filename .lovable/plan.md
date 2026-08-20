# Proctored Test History for Students

Add a student-facing page under practice where students see every proctored (mock) test they've taken, their score breakdown, and their mistakes question-by-question.

## What the student sees

New route `/practice/proctor-results` ("My Mock Tests"), reachable from the quick-navigation sheet (alongside "Exam Results") and linked from the practice home.

1. **List of attempts** — newest first: test title, date, status badge (Submitted / Ended by teacher), SAT-scale total score rounded to the nearest 10, plus R&W and Math scaled scores and raw correct/total.
2. **Best score card** at the top, same style as the existing Exam Results page.
3. **Tap an attempt → review** — reuses the existing per-question review UI from the proctored exam (question text, both figures, choices, the student's answer, correct answer and rationale). A "Mistakes only" toggle filters to wrong/skipped questions.
4. **Locked state** — if the teacher has review turned off for that session, the row still shows the score but the review opens a short "Your teacher hasn't released the answers for this test yet" message. If review is set to score-only, answers/rationales stay hidden and only correct/wrong marks show (this is what the existing review already enforces).

## Behavior notes

- Only finished/submitted attempts appear; a test still in progress is not listed (students continue those from the join link as they do today).
- Attempts are matched to the logged-in student the same way class exam results are: by their account and their linked student record, so older attempts joined by phone still show up.

## Technical

- **New RPC `proctor_my_history(p_student_account_id uuid, p_linked_student_id uuid)`** — security definer, returns one row per `proctor_participants` record for that student where `submitted_at is not null` or the session is `finished`: participant id, session id, test title, `finished_at`/`submitted_at`, `review_mode`, `rw_correct`, `math_correct`, `rw_total`, `math_total`, `module_results`. Needed because `proctor_participants` is staff-only under RLS and students are not Supabase-auth users. Granted to `anon, authenticated` (matching the existing proctor RPC pattern), and it returns nothing when both id params are null.
- **New page** `src/pages/student/StudentProctorResults.tsx`, route registered in `src/App.tsx` under the practice shell; nav entry added to `src/components/student/practice/PracticeCommandSheet.tsx`.
- **Review reuse**: call the existing `proctor_review(p_participant_id)` RPC via the existing `useProctorReview` hook and render `ProctorReview` from `src/components/student/proctor/ProctorReview.tsx` in a dialog/full-screen view. Add an optional "mistakes only" filter at the page level by filtering the rows passed in — no change to the review component's contract.
- **Scoring display**: use the existing scaled-score helpers already used for Bluebook results (`roundToTen` from `src/lib/bluebookReview.ts`) so numbers match the mock-test results screen.
- No changes to the proctor exam runner, teacher monitor, or finalization flow.
