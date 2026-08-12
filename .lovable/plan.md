# Proctored test: automatic scored results when the test ends

Today a finished proctored test only shows a raw score, and the per-question breakdown stays hidden until the teacher flips "review mode" from off to mistakes/explanations. Students who closed their tab before the end see a dead-end "This session has ended" page. This makes results automatic and complete, without changing how the test itself runs.

## What changes for the student

When the session ends (normal end or force end), the student's page shows, with no teacher action:

- SAT-style score: each section scaled to 200-800 and rounded to the nearest 10, plus the combined total when the paper has both sections. Sections that aren't in the paper are simply not shown.
- Raw score and per-module breakdown (Module 1 / Module 2, correct out of total) as it already renders.
- Full per-question review: every question in order, marked right / wrong / blank, with the correct answer and the explanation.
- Students who left the test or crashed get graded too: on reopening the link, the page finalizes them server-side from their last saved answers (blank = wrong) and shows the same result screen instead of "ask your teacher".

## What changes for the teacher

Nothing they must do. Their monitor already finalizes on end and shows scores; that stays. The review-mode control keeps working as an override — a teacher can still lock the breakdown back down for a session if they ever want to, it just no longer has to be turned on for students to see results.

## Technical notes

- `proctor_finalize_session`: after grading unsubmitted participants, promote `review_mode` from `'off'` to `'explanations'` for that session (leave any teacher-chosen value alone). Grading logic in `proctor_submit` is untouched.
- Also call finalize from the student side when `proctor_state` reports `session_status = 'finished'` and the student has no `submitted_at` (the RPC is already executable by anon and is idempotent), then reload state so the score appears. Guarded so it fires once.
- `src/pages/public/ProctorExam.tsx`: replace the finished-without-paper dead end with the result view; add scaled scores using the existing `scaleSectionScore` / `roundToTen` helpers from `src/lib/bluebookReview.ts`; open the per-question review directly from the result screen.
- `proctor_review` already returns correct answers and rationales when mode is `explanations`, and only for submitted/finished attempts, so no query change is needed.
- Verification: run a throwaway session end-to-end — submit one student normally, force-end with a second student's tab closed, and confirm both see scaled score, module breakdown and per-question explanations, and that the teacher monitor still lists both scores. Test data removed afterwards.
