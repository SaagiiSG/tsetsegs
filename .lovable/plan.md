## 1. Admin Improvement Metric: First Mock → Highest Score

**File:** `src/hooks/useAdminAnalytics.ts` (`useImprovementMetrics`, ~lines 2365–2458)

Currently groups bluebook attempts by student and tracks `first` (earliest) and `latest` (most recent overwritten on each iteration). Change `latest` to `best` (max score) so improvement = highest score − first mock score.

- Rename field `latest` → `best` in the `studentScores` map.
- When seeding: `best = first = a.total_score`.
- On subsequent attempts: `best = Math.max(best, a.total_score)` instead of overwriting with the newest.
- `improvement = best - first` (keeps `>= 0`).
- Update label copy on `src/components/admin/analytics/ImprovementMetricsCard.tsx` from "First mock → Latest" to "First mock → Best score".

No schema or other consumer changes — the public shape of `ImprovementMetrics` stays the same.

## 2. Batch Creation: Hide Math Schedule for IELTS

**File:** `src/components/admin/CreateBatchForm.tsx` (also check `EditBatchDialog.tsx` for parity) and `src/components/admin/ScheduleBuilder.tsx`.

When `courseType === 'IELTS'`:
- Hide the Math schedule section in `ScheduleBuilder` (pass a prop like `showMath={courseType !== 'IELTS'}`, or render conditionally).
- On submit, force `math_schedule = null` and skip the math/english overlap check.
- The combined legacy `schedule` string should drop the `(Math)` prefix and the `+` separator when only English is present (already handled by the existing concat logic since `mathStr` will be empty).
- If user switches course type from SAT → IELTS, clear `mathSchedule` state so stray slots don't get saved.

Apply the same conditional in `EditBatchDialog` so editing an IELTS batch matches.

## 3. Student "Questions Solved" Counter Drifting (400 → 300 → 200)

**Root cause:** `useStudentProfile.ts` (line ~198) and `useOtherStudentProfile.ts` (~line 333) fetch `student_attempts` with no pagination. Supabase caps a single query at **1000 rows**. Once a student exceeds 1000 attempts, only an arbitrary 1000-row slice is returned, so `correctAttempts` fluctuates (and trends down as more incorrect/retry rows fill the slice). This matches the 400 → 300 → 200 symptom.

Two issues to fix together:

a. **Semantic bug:** `questionsSolved` counts raw correct *attempts* (re-solving the same question inflates the count). It should be distinct questions solved at least once.

b. **Row-limit bug:** Use `count: 'exact', head: true` aggregated queries instead of pulling all rows, since the page only needs counts.

**Fix in `useStudentProfile.ts` and `useOtherStudentProfile.ts`:**
- Replace the single full-row fetch with separate `head: true` count queries:
  - `totalAttempts` = count of all attempts for the student.
  - `firstAttempts` = count where `attempt_number = 1`.
  - `firstCorrect` = count where `attempt_number = 1 AND is_correct = true`.
- For `questionsSolved` (distinct questions correctly solved): query `student_attempts` selecting only `question_id` where `is_correct = true`, paginate in batches of 1000 using `.range()` until exhausted, then `new Set(...).size`. Alternatively add a SECURITY DEFINER SQL function `get_student_distinct_solved(_account uuid)` returning a single int; preferred for accuracy and performance.
- For `avgTimePerQuestion`: either drop it (it requires summing per-row data) or compute via a small RPC `SELECT AVG(time_spent_seconds)`.

Recommended approach: add a single RPC that returns `{ total_attempts, first_attempts, first_correct, distinct_solved, avg_time }` to avoid four round trips, and call it from both hooks.

### Technical Notes

- Field rename `latest → best` in `useImprovementMetrics` is internal to the hook; the returned `ImprovementMetrics` shape is unchanged so `ImprovementMetricsCard` keeps working.
- For the IELTS schedule change, the DB column `math_schedule` stays nullable; we just always write `null` for IELTS.
- The new RPC for student stats needs a migration; it should be `SECURITY DEFINER` with `SET search_path = public` and gated so students can only call it for themselves (or accept the account id and rely on existing RLS).

### Out of Scope

- Backfilling/recomputing historical metrics.
- Touching teacher dashboards other than the Class Analytics improvement label.
- Wider audit of other places that may also be hitting the 1000-row cap (can follow up).