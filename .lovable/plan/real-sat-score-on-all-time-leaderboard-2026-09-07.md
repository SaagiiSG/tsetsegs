# Real SAT Score on All-Time Leaderboard

## Goal
Let admins record a student's official SAT score (math, english, test date) from the student profile page, then surface that score on the all-time leaderboard row and inside the public full-profile dialog.

## User decisions
- Display: show a compact SAT score in the leaderboard row **and** full details in the profile dialog.
- Admin input: add/edit the score on the **student profile page** (`/admin/student/:id`).
- Fields: **total score, math section score, english section score, test date**. If english is empty, only math is shown.
- Visibility: **public to all students** on the leaderboard.

## Plan

### 1. Database schema
Migration adds four nullable columns to `public.student_accounts`:
- `sat_math_score` integer, 200–800
- `sat_english_score` integer, 200–800
- `sat_total_score` integer, 400–1600
- `sat_score_date` date

Add CHECK constraints for the valid SAT ranges and include standard `created_at`/`updated_at` handling if not already present. GRANTs and RLS are unchanged; existing policies already permit authenticated staff updates and public reads.

### 2. All-time leaderboard backend
Update the existing `all_time_leaderboard` RPC to join `student_accounts` and return:
- `sat_math_score`
- `sat_english_score`
- `sat_total_score`
- `sat_score_date`

Update `useLeaderboard.ts` `AllTimeEntry` interface to include these fields.

### 3. Leaderboard row UI
In `src/components/student/leaderboard/AllTimeTab.tsx`, add a compact SAT score column between the tier info and the total-points block.
- If `sat_total_score` exists, show it as the main number.
- If only `sat_math_score` exists, show math only (no english label).
- If no score exists, leave the space empty or show a subtle placeholder.
- Keep mobile responsive; hide the new column on very small screens if needed.

### 4. Full profile dialog UI
In `src/hooks/useOtherStudentProfile.ts`, select the new SAT columns from `student_accounts`.
In `src/components/student/leaderboard/FullProfileDialog.tsx` (or `ProfileHeader`), render an "Official SAT Score" card showing:
- Total score (large)
- Math and English breakdown when both are present
- Test date
- Math-only view when english is missing

### 5. Admin input on student profile
In `src/pages/TeacherStudentProfile.tsx`:
- Fetch the linked `student_accounts` row (already queried for share token; extend the select).
- Add a new "SAT Score" card in the Overview tab for SAT batches, or a dedicated tab if cleaner.
- Provide numeric inputs for Math, English, Total, and a date picker for Test Date.
- Auto-calculate Total = Math + English when both are entered.
- Save via `supabase.from('student_accounts').update(...)` and invalidate queries on success.
- Show toast confirmation/error.

### 6. Validation
- Client-side: math/english each 200–800, total 400–1600.
- Server-side: CHECK constraints from step 1.

## Files to change
- `supabase/migrations/` — schema migration (new columns + RPC update)
- `src/hooks/useLeaderboard.ts`
- `src/components/student/leaderboard/AllTimeTab.tsx`
- `src/hooks/useOtherStudentProfile.ts`
- `src/components/student/leaderboard/FullProfileDialog.tsx`
- `src/pages/TeacherStudentProfile.tsx`

## Out of scope
- Multiple historical SAT scores per student (single current score only).
- Teacher-side profile page; admin page is the requested entry point.
- Any score verification flow; values are manually entered by staff.
