## Goal
Add a Duolingo-style streak indicator to the top of the student sidebar (next to the name), open a history dialog when tapped, and show an animated popup when a student extends their streak with their first practice of the day.

## 1. Sidebar streak badge
File: `src/components/student/StudentSidebar.tsx` (and the mobile equivalent `StudentDashboardSidebar.tsx` if it shows the same header).

- In the header row, keep name on the left, add a streak chip on the right: flame icon + current streak number.
- Colors: orange/coral flame when `current_streak > 0`, muted gray when 0 (streak frozen / not started).
- Tooltip on hover: "X day streak — tap to view history".
- Data source: `useStudentStreak()` (already exists, returns `streak.current_streak` and `activityDays`).
- Clicking the chip opens the history dialog (state in the sidebar).

## 2. Streak history dialog
New component: `src/components/student/StreakHistoryDialog.tsx`.

- Shadcn `Dialog`. Header: big flame + current streak, subline "Longest: N · Total practice days: M".
- Body: reuse the existing `StudyStreakCalendar` component (already renders a heatmap of `activityDays`) — wrap it inside the dialog. If layout doesn't fit, render a compact month grid for the last 90 days using `activityDays` from `useStudentStreak`.
- Footer: small motivational line ("Practice any question tomorrow to keep your streak.").
- Closes on overlay click / X.

## 3. Animated "streak extended" celebration
New component: `src/components/student/StreakExtendedToast.tsx`.

- Fullscreen-centered overlay (fixed, z-50) with a backdrop blur, auto-dismisses after ~2.5s or on click.
- Animated flame (scale-in + subtle bounce using Tailwind `animate-scale-in` and a custom flame pulse), confetti-style sparkle ring.
- Headline: "Streak extended!" + big number "N day streak 🔥".
- Sub: "Come back tomorrow to keep it going."
- Uses framer-motion if available, otherwise plain Tailwind keyframes already in the project (`animate-scale-in`, `animate-fade-in`, plus a custom flame keyframe).

## 4. Triggering the celebration (single source of truth)
Update `src/hooks/useStudentStreak.ts`:

- Change `updateStudentStreak(studentAccountId)` to return a result object: `{ extended: boolean, newStreak: number, wasFirstToday: boolean }`. `extended === true` only when `last_activity_date !== today` AND the new `current_streak > previous current_streak` (i.e. continued, not reset to 1 after a break — though we'll celebrate a reset-to-1 as "Streak started!" too, with the same component using a different label).
- Existing callers (`StudentQuestion.tsx`, `StudentEnglishQuestion.tsx`, `StudentSpeedSession.tsx`) currently fire-and-forget. We'll keep that but additionally dispatch a browser `CustomEvent('streak:extended', { detail })` from inside `updateStudentStreak` when the day flips. This avoids prop-drilling through three different question pages.

Mount a single `StreakCelebrationListener` inside `src/components/student/StudentLayout.tsx` that:
- Listens to `streak:extended`.
- Invalidates `['student-streak']` query.
- Renders `<StreakExtendedToast>` for one event at a time.

## 5. Files touched

```text
NEW  src/components/student/StreakHistoryDialog.tsx
NEW  src/components/student/StreakExtendedToast.tsx
NEW  src/components/student/StreakCelebrationListener.tsx
EDIT src/components/student/StudentSidebar.tsx          (header chip + dialog state)
EDIT src/components/student/StudentDashboardSidebar.tsx (if it has its own header — verify on build)
EDIT src/components/student/StudentLayout.tsx           (mount celebration listener)
EDIT src/hooks/useStudentStreak.ts                      (dispatch CustomEvent, return result)
```

No database changes — `student_streaks` table and `activityDays` query already provide everything.

## Out of scope
- No new badges, no streak freeze/repair, no push notifications. Just the chip, the dialog, and the celebration popup.
