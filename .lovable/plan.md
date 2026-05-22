# Update /admin/sprint-monitor for new enrollment logic

Sprint enrollment is now triggered when a student answers their first correct problem in a sprint (via `ensureSprintEnrollment`). The Sprint Monitor still assumes "all active students are seeded on season creation," which is now wrong. Update the page so admins see active vs latent participation accurately.

## Changes

### 1. Stop auto-seeding on season creation
In `handleCreateSeason` (SprintMonitor.tsx, lines ~205–271):
- Remove the block that fetches `student_accounts` and bulk-inserts `student_sprint_rankings` for Sprint 1.
- Keep sprint row creation and the existing toast.
- Update the builder footer copy from "All active students auto-enrolled" → "Students join by solving their first problem".

### 2. Rework the "Active Sprint" overview card
Currently shows `Participants: {totalParticipants}` which equals the count of ranking rows (was = all active students; now = students who have solved ≥1 problem).

Add a second stat so the picture is honest:
- **Enrolled**: `rankings.length` (students who solved ≥1)
- **Eligible**: count of `student_accounts` where `is_active = true`
- **Participation**: `enrolled / eligible` shown as a small progress bar + `%`

Add a new query `useQuery(['active-student-account-count'])` that selects `count` from `student_accounts` with `is_active=true` and `head: true`.

Rename the existing "Participants" label → "Enrolled (solved ≥1)" for clarity.

### 3. Tier breakdown empty-state
`tierBreakdown` filters out tiers with `studentCount === 0`. Early in a sprint this can leave the section empty. Add a fallback panel:

> "No students have joined Sprint N yet. Students appear here once they solve their first problem."

Shown only when `activeSprint` exists and `rankings.length === 0`.

### 4. Group capacity copy
The MAX_GROUP_SIZE constant in SprintMonitor.tsx is `55`, but `sprintEnrollment.ts` uses `40` (matches the `±15 around target 40` rule in project memory). Align SprintMonitor to use `40` so admin group displays match what students actually experience.

Update `calculateGroupNumber` use sites — group sizing in `tierBreakdown` already derives from real `group_number` on rows, so the only real change is the constant + any "capacity" labels that reference 55.

### 5. Minor: builder footer
Replace the bullet "All active students auto-enrolled" with "Students enroll on their first solved problem".

## Files touched
- `src/pages/admin/SprintMonitor.tsx` (only)

## Out of scope
- `finalize-sprint` edge function (separate concern — already operates on whoever is in `student_sprint_rankings`).
- Past seasons that were already seeded under the old logic stay as-is.
