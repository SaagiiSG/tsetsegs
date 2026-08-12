# Fix practice-test rendering, review and score rounding

Scope: the student practice-test flow at `/practice/bluebook` (test list, test runner, results/review dialog).

## What's actually broken (verified against the live data)

1. **Image-only answer choices render as blank rows.** 5 questions in the current tests (BBK0071, BBK0068, BBK0026, BBK0122, BBK0144) store empty choice text `{"A":"","B":"","C":"","D":""}` and put the actual choices in `choice_images`. Neither the test runner nor the review dialog reads `choice_images`, so students see A/B/C/D with nothing next to them.
2. **Second figure missing in review.** The runner shows both figures, but the review dialog only fetches and renders `question_image_url` — `question_image_url_2` is never selected on the list page's review query, so second figures vanish after the test.
3. **Question text sometimes disappears / turns into garbled math.** 4 questions in the current tests have an odd number of `$` because currency was written bare (e.g. ANP0025: "$8.50 for each student and $12 for each chaperone ... $730"). The math renderer pairs the first `$` with the next one, so a whole sentence is swallowed into a KaTeX span. Two fixes: clean the affected question text to use escaped `\$`, and make the renderer refuse an inline `$…$` span that contains no LaTeX command and looks like prose/currency (multiple words with a digit right after the opening `$`).
4. **Results are not reviewable.** Review is only offered for attempts whose status is `completed`; half of all attempts (25 of 50) are stuck `in_progress`, so those students have no way back to their answers. Also the review only ever loads the newest attempt per test, and questions the student skipped have no `bluebook_answers` row at all, so omitted questions are silently absent from the review list.
5. **Fill-in questions show no detail in review.** The dialog checks `question_type === 'fill_in_blank'`, but the data uses `fill_blank`, so the "your answer vs correct answer" block never renders for the 53 fill-in questions.
6. **Scores are not rounded to 10 and the denominators are wrong.** Section scaling divides by the number of *answered* rows (`Math.max(mathTotal, 44)`), so a student who skips questions gets an inflated section score, and totals land on values like 728 instead of 730.

## The fix

**Test runner (`StudentBluebookTest.tsx`)**
- Render `choice_images` next to each choice letter; when the choice text is empty show only the image, and keep the whole row clickable.
- Keep letter mapping keyed off the stored option keys (A/B/C/D) instead of array position so the selected letter always matches the stored answer.

**Review dialog (`BluebookResultsDialog.tsx`)**
- Add `question_image_url_2` and `choice_images` to the result shape; render both figures and image choices, with the correct/your-answer highlight applied to image choices too.
- Accept both `fill_blank` and `fill_in_blank` for the fill-in answer block.
- Show omitted questions in their real position (from the module question list, not only from answered rows).
- Optional rationale/explanation block under each question once the answer is revealed.

**Test list page (`StudentBluebook.tsx`)**
- Review query: select `question_image_url_2`, `choice_images`, and rationale; build the question list from the module questions so skipped items appear as "Omitted".
- Show a **Review** button for any attempt that has answers (including abandoned `in_progress` ones), with a short "unfinished attempt" note, so students can always see their mistakes.
- List past attempts per test (date + score) so an older attempt can be reviewed, not just the latest.

**Scoring**
- Compute raw totals from the number of questions in the test's modules (not from answered rows).
- Scale each section to 200–800, then round to the nearest 10 and clamp; total = the two rounded sections summed (so 728 shows as 730).
- Apply the same rounding when displaying stored scores from older attempts so cards, dialog and dashboard agree.

**Data cleanup**
- Escape bare currency `$` in the four affected questions (BBK0004, ANP0015, ANP0025, ANP0026) so their text renders fully.

## Technical notes

- `bluebook_answers` has no row for skipped questions; the review builder will left-join module questions against answers to produce a complete, correctly ordered list.
- Grading keeps using `isAcceptedFillBlankAnswer` (alternate answers respected) — no change to correctness rules.
- No schema change is required; rounding is applied at write time for new attempts and at display time for existing ones.
- No changes to the proctored-test or class-test flows.
