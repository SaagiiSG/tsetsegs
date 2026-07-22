
## 1. Teacher dashboard carousel — middle card gets skipped on iPad

**Cause:** In `ClassCarousel.tsx`, snap resolution uses a displacement threshold of `cardWidth * 0.15`. On iPad, cards are ~85vw wide, so a slow swipe from card 1 easily crosses 15% of a card width and gets forwarded past card 2 to card 3. The velocity threshold (`0.35 px/ms`) compounds this — a normal iPad flick exceeds it and adds `+1` on top of the displacement bump.

**Fix:**
- Cap the intent shift to exactly `±1` from the gesture-start index (not the current active index) so a single swipe can never move two cards.
- Track `gestureStartIndex` at pointerdown/wheel start, and derive target as `startIndex + sign(delta)` when displacement > threshold, ignoring velocity as an *additional* bump.
- Raise displacement threshold to `cardWidth * 0.25` for pointer-based scrolls (touch), keep 0.15 for wheel/trackpad.

## 2. Renaming classes doesn't persist

**Root cause (verified in DB):** `public.batches` RLS only allows `admin` role to UPDATE. Teachers hit the update from `RenameClassDialog`, which returns 0 rows affected with no error — toast shows "Class renamed" but nothing is saved. On reload the original `batch_name` returns.

**Fix:** Add an RLS policy allowing teachers to update `nickname` on their own batches. Since column-level RLS isn't a thing here, do it via a dedicated `SECURITY DEFINER` RPC `set_batch_nickname(p_batch_id uuid, p_nickname text)` that:
1. Checks caller has role `teacher` or `admin`.
2. If teacher, verifies `batches.teacher ILIKE '%' || teacher_name || '%'` (same pattern as SELECT policy).
3. Updates only the `nickname` column.

Update `RenameClassDialog.tsx` to call the RPC instead of `supabase.from('batches').update(...)`.

## 3. Handbook mobile "light refresh every few clicks"

**Cause:** `useTeachingChecklist.ts` subscribes to realtime `postgres_changes` on `teaching_checklist_progress`. Every checkbox toggle inserts/deletes a row → realtime fires → `load()` runs → `setLoading(true)` → `ChecklistView` swaps the whole list for skeleton placeholders (the "refresh flash"). Optimistic state is already correct, so the reload is what's flashing the UI.

**Fix:**
- Do not toggle `setLoading(true)` on realtime-triggered reloads; only set it for the initial `load()`.
- Skip the reload entirely when the incoming payload row already matches the optimistic state (dedupe by `item_key`).
- Debounce the realtime handler (~250 ms) so a burst of taps collapses into one silent sync.

## 4. Speed Session — missing figures + no per-session history

**Figures cause:** `StudentSpeedSession.tsx` query selects only `id, question_id, question_text, answer, question_type, multiple_choice_options`. It never fetches `question_image_url`, `has_figure`, `figure_svg`, or `figure_type`, and the render block has no `<img>` / SVG. Questions with figures render as text-only.

**Figures fix:**
- Extend the query to include `question_image_url, has_figure, figure_svg, figure_type, figure_description`.
- Add rendering below the question text (mirror `ChallengePlay.tsx` pattern): show `figure_svg` inline when present, else `<img src={question_image_url}>` when set. Add loading state so the timer's `useEffect` doesn't start until the image reports load, to keep timing fair.

**History cause:** Nothing persists the *set* of questions per speed session — results live only in local state; only `student_attempts` and `point_transactions` get individual rows without a session grouping id.

**History fix (minimal, presentation-focused):**
- New table `public.speed_sessions` (id, student_account_id, subject, category_id, duration, total_questions, correct_count, points_earned, started_at, completed_at) + `speed_session_items` (session_id, question_id, order_index, answer_submitted, is_correct, time_ms). GRANTs + RLS: student can read/insert their own; admins/teachers can read all.
- At `sessionComplete`, insert the session + items in one call.
- Add "Session details" view on the completion screen listing each question (question_id label, correct/incorrect, time, expand → `MathText` + figure) reusing the existing `MathText` component.
- Add a small "Past speed sessions" section on `StudentSpeedMode.tsx` (latest 10) that opens the same detail view.

## 5. Can't find CB0011 in the admin question bank

**Verified in DB:** `CB0011` exists (id `da54d684-…`), `is_active=true`, `is_original=true`, but its `question_set` is `EquivalentExpressions` — not `68` and it *is* included in the CB tab's `neq('question_set','68')` count. So it's in the underlying data.

**Likely cause:** The CB tab's `QuestionList` filters/pagination don't surface it in the visible page; there's currently no search-by-`question_id` on the admin list.

**Fix:** Add a search input at the top of the CB and 68 tabs that filters `questions.question_id ILIKE %term%` server-side and resets pagination, so typing `CB0011` immediately shows it.

## Technical section

Files to edit:
- `src/components/teacher/dashboard/ClassCarousel.tsx` — snap logic
- `supabase migration` — new RPC `set_batch_nickname`; new tables `speed_sessions`, `speed_session_items` with GRANTs + RLS
- `src/components/teacher/dashboard/RenameClassDialog.tsx` — call new RPC
- `src/hooks/useTeachingChecklist.ts` — silent realtime reloads + debounce
- `src/pages/student/StudentSpeedSession.tsx` — fetch + render figures; persist session on completion; results view
- `src/pages/student/StudentSpeedMode.tsx` — past sessions list
- `src/components/admin/questions/QuestionList.tsx` (+ `QuestionBank.tsx`) — question_id search field

No changes to auth, sprint, or points logic.
