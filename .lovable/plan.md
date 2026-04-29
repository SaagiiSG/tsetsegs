## Diagnosis (no bug in the code)

I checked the live data for Marcus D.'s practice dashboard. Card **6861** is orange because it genuinely has **3 wrong attempts and zero correct attempts** in the database (today, 09:24 UTC):

| Question | Attempts | Result | Card color |
|---|---|---|---|
| 6855 | wrong → **correct** (2nd try) | solved | green |
| 6861 | wrong, wrong, wrong | **never correct** | orange |
| 6863 | correct (1st try) | solved | green |
| 6864 | correct (1st try) | solved | green |

So the green-on-Nth-try logic from the previous fix **is working**. 6861 is orange because it has not been solved correctly yet — the system is rendering the correct state.

## Why the confusion keeps happening

After a wrong submission the question screen lets the student try again, but there is no obvious moment that says "you finally got it." It's easy to think you solved it when you really just moved on. Plus, after a correct attempt the dashboard relies on cache invalidation which can lag for a second.

## Plan: make the "you solved it" moment unmistakable

1. **`src/pages/StudentQuestion.tsx` — explicit success banner on correct answer**
   - When `is_correct === true` show a prominent green confirmation: "Correct! This question is now marked solved." with a CheckCircle2 icon.
   - When wrong, keep the existing retry UI but add subtitle: "Not yet solved — keep trying. Card stays orange until you get one correct."

2. **`src/pages/StudentQuestion.tsx` — force fresh dashboard state on success**
   - On correct submission, `await` both `queryClient.invalidateQueries` AND `queryClient.refetchQueries` for `student-attempts`, `review-queue`, `navigator-attempts` before navigating back, so the grid is guaranteed fresh.

3. **`src/pages/student/StudentPractice.tsx` — legend chip above the grid**
   - Small inline legend: green = solved, orange = needs another correct attempt, yellow = video watched only, gray = not started. Removes ambiguity at a glance.

4. **`src/pages/student/StudentPractice.tsx` — tooltip on each card**
   - Hovering a card shows: "X attempts, last correct: yes/no". Lets the student verify exactly why a card is the color it is.

5. **No DB changes, no logic changes to status calculation** — the existing `getQuestionStatus` rule (`attemptInfo.correct ⇒ completed`) is correct and stays as-is.

## What this does NOT do

- Does not change how points are awarded.
- Does not auto-flip 6861 to green — that question genuinely needs a correct answer first.
- Does not touch the spaced-repetition queue logic.

After this, when you next solve 6861 correctly the card will turn green immediately and a success banner will confirm it on the question screen.