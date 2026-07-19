## Goal
Create a hidden "ghost" student account (phone `88000000`, password `Uujim123@`) that can log in and use the platform like a real student, but never surfaces in any listing: leaderboards, admin student search, teacher class rosters/analytics, batch overviews, friends discovery, challenge lobbies, announcements audiences, sprint monitor, etc.

## Approach
Add a single `is_ghost boolean default false` flag on both `students` and `student_accounts`, then filter it out anywhere the app lists students. The ghost still exists for the logged-in user themselves — we only hide it from *other* people's views.

Using a dedicated `is_ghost` (rather than reusing `is_dev_account`, which currently only bypasses the 30-day device lock) keeps the two behaviors independent.

## Steps

### 1. Schema migration
- `ALTER TABLE public.students ADD COLUMN is_ghost boolean NOT NULL DEFAULT false;`
- `ALTER TABLE public.student_accounts ADD COLUMN is_ghost boolean NOT NULL DEFAULT false;`
- Partial index on each for fast exclusion.

### 2. Seed the ghost record (via insert tool)
- Insert into `students`: name "Ghost", phone `88000000`, `is_ghost=true`, `batch_id=NULL`, generated `unique_link_id`. (Nullable batch keeps it out of any batch roster.)
- Insert into `student_accounts`: `phone_number='88000000'`, `password_hash = crypt('Uujim123@', gen_salt('bf',10))`, `password_set_at=now()`, `is_ghost=true`, `is_dev_account=true` (bypass device lock so you can log in from anywhere), `linked_student_id` = the ghost student row.

### 3. Filter ghost out of all listings
Add `.eq('is_ghost', false)` (or SQL `WHERE is_ghost = false`) to the queries in these files. The ghost's own session queries (StudentAuthContext load-self, own profile, own progress) are keyed by `id`/`auth_user_id`, so they keep working untouched.

Student-facing:
- `src/hooks/useLeaderboard.ts` — global + friends leaderboard
- `src/hooks/useFriends.ts` — friend suggestions/search
- `src/hooks/useChallenge.ts` — participant/opponent lookups
- `src/pages/student/StudentShareProfile.tsx` and `src/hooks/useOtherStudentProfile.ts` — public profile fetches
- `src/pages/student/challenges/*` — lobby/opponent lists (via useChallenge)

Admin-facing:
- `src/pages/admin/StudentSearch.tsx` — both `fetchAllStudents` count/list and `performSearch`
- `src/components/admin/StudentAccountsManagement.tsx`
- `src/components/admin/RegistrationQueue.tsx` (only if it reads students)
- `src/pages/admin/SprintMonitor.tsx`, `AdminBatchAnalytics.tsx`, `AdminAnnouncements.tsx` audience counts
- `src/hooks/useAdminDashboard.ts`, `useAdminAnalytics.ts`
- `src/components/admin/BatchStudentsTable.tsx`, `BatchOverview.tsx`, `EditBatchDialog.tsx`, `CreateBatchForm.tsx`

Teacher-facing:
- `src/hooks/useTeacherDashboardData.ts` (student list preview, counts)
- `src/hooks/useTeacherMathAnalytics.ts`
- `src/pages/TeacherAllStudents.tsx`, `TeacherClassAttendance.tsx`, `TeacherClassAnalytics.tsx`, `TeacherStudentCards.tsx`, `TeacherStudentProfile.tsx`, `teacher/TeacherClassWrapped.tsx`

DB-level: `get_batch_student_counts` and `get_batch_completion_status` — update to exclude ghosts.

### 4. Verification
- Log in with `88000000` / `Uujim123@` → student dashboard loads.
- Admin Student Search: total count unchanged (excluding ghost), search "88000000" returns nothing.
- Teacher dashboard: ghost not in any class card or roster.
- Leaderboard: ghost absent even if it earns points.

## Notes
- Ghost has no `batch_id`, so it won't appear in batch-scoped queries even before filtering — but we still add the flag filter as defense-in-depth in case it's assigned to a batch later.
- If you ever want to promote the ghost to a normal account, flip `is_ghost=false` on both rows.