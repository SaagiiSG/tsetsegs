# Sprint Enrollment via First Solved Problem

## Goal

Students are no longer auto-enrolled into the active sprint just by visiting the leaderboard. They get enrolled the moment they **solve their first question** in that sprint, and immediately see a popup showing their freshly-assigned rank and points.

## Current behavior (to remove)

- `src/hooks/useLeaderboard.ts` (lines ~235–319) runs a `useQuery` that auto-inserts a `student_sprint_rankings` row the first time the leaderboard loads. This silently enrolls every student who opens the leaderboard, even if they never practice.

## New behavior

### 1. Enrollment trigger moves to question-solving

Sprint points are currently awarded in three places (all on correct answers):

- `src/pages/StudentQuestion.tsx` (~L422–463) — SAT Math
- `src/pages/student/StudentEnglishQuestion.tsx` (~L225–245) — English
- `src/pages/student/StudentSpeedSession.tsx` (~L195–210) — Speed mode

Each of these reads the active sprint, then tries to UPDATE the student's `student_sprint_rankings` row. The new logic: if no ranking row exists for `(active_sprint, student)`, INSERT it first (using the same tier/group assignment logic that lives in `useLeaderboard.ts`), then apply the points. This means the very first correct answer in a sprint = enrollment.

Extract the existing enrollment block from `useLeaderboard.ts` into a shared helper, e.g. `src/lib/sprintEnrollment.ts`:

- `ensureSprintEnrollment(studentId, sprintId)` → returns the ranking row, inserting it (with tier inheritance from previous sprint + group assignment respecting `MAX_GROUP_SIZE`) if missing. Returns `{ ranking, wasNewlyEnrolled }`.

Update the three question pages to call this helper before the points UPDATE. Drop the silent auto-enroll `useQuery` from `useLeaderboard.ts` so visiting the leaderboard no longer enrolls.

### 2. Leaderboard treats non-enrolled students gracefully

With auto-enroll removed, a student who hasn't solved anything yet will have no ranking row. The leaderboard tabs (`CurrentSprintTab`, `MyRankTab`) should show an empty / call-to-action state: "Solve your first problem to join Sprint X."

### 3. First-solve celebration popup

After the first correct answer enrolls the student, fire a popup. New component:

- `src/components/student/SprintEnrollmentDialog.tsx` — Dialog showing:
  - Headline: "You're in Sprint {N}!"
  - Their tier + group
  - Points earned from this question
  - Current rank within their group (computed from `student_sprint_rankings` ordered by `total_points` within the same `sprint_id` + `current_tier` + `group_number`)
  - CTA: "View leaderboard" → navigates to `/student/leaderboard`; secondary "Keep practicing" closes.

Wiring: the three question pages call `ensureSprintEnrollment`; when `wasNewlyEnrolled === true`, set local state to open the dialog after the existing answer-feedback flow finishes (don't block the answer reveal). Rank is fetched fresh after the points UPDATE so the dialog shows accurate standing.

Only show the dialog on the **first solved problem of the sprint** — gate by `wasNewlyEnrolled`, so it never re-appears in the same sprint.

## Files touched

- New: `src/lib/sprintEnrollment.ts`, `src/components/student/SprintEnrollmentDialog.tsx`
- Edit: `src/hooks/useLeaderboard.ts` (remove auto-enroll query)
- Edit: `src/pages/StudentQuestion.tsx`, `src/pages/student/StudentEnglishQuestion.tsx`, `src/pages/student/StudentSpeedSession.tsx` (call helper, show dialog)
- Edit: `src/components/student/leaderboard/CurrentSprintTab.tsx` and `MyRankTab.tsx` (empty state for non-enrolled)

## Open questions

1. Should the enrollment trigger fire on **any** answered question, or only **correct** ones? Current points-award logic only runs on correct answers; enrolling only on correct keeps it consistent and rewards real effort. Confirm this is what you want, or whether even a wrong first attempt should enroll them. only on correct ones 
2. Should the popup also appear on the **Speed Session** flow? It can feel intrusive mid-timed-session; alternative is to enroll silently there and show the popup only on the regular practice pages. - if the first correcly solved question is in the speed session then after the session the sprint enrollment will be played