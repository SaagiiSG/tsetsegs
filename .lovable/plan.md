
# SAT Dashboard Redesign

A full rebuild of `/practice/home` (`StudentDashboardHome.tsx`) into three rows, plus a small sidebar addition and a one-time goal-setting flow.

---

## 1. Sidebar — rank box under Leaderboard

In `StudentDashboardSidebar.tsx`, directly under the Leaderboard nav item, add a small card:

```
┌─────────────────────┐
│ 🏆 Leaderboard      │   ← existing button
├─────────────────────┤
│  Position    #14    │   ← new compact box, clickable → /practice/leaderboard
└─────────────────────┘
```

- Shows current **sprint group rank** (from `student_sprint_rankings` for the active sprint, scoped to the student's group).
- Subtle styling like the streak/freezer pills already in the header.
- Hidden when sidebar is collapsed.
- Clicking navigates to `/practice/leaderboard`.

---

## 2. One-time goal-setting flow

A modal that runs once on first dashboard visit, re-openable from a small ⚙️ on the daily ring.

Steps:
1. **SAT date** — date picker (prefill from `student_accounts.sat_test_date` if set).
2. **Intensity** — three cards: `Intense`, `Gradual`, `With the flow`.
3. **Computed ring preview** — show the three goals derived from days-until-SAT × intensity, with inline +/- tweak, then "Save".

Defaults if skipped: **2 speed sessions / 5 hard / 10 medium** per day.

Computation (rough):
- Intense: 3 speed / 8 hard / 15 medium
- Gradual: 2 speed / 5 hard / 10 medium (default)
- With the flow: 1 speed / 3 hard / 6 medium
- Scaled up ~25% when SAT is < 30 days away, down ~25% when > 120 days.

Persistence: new columns on `student_accounts` — `daily_goal_speed`, `daily_goal_hard`, `daily_goal_medium`, `daily_goal_set_at`, `goal_intensity`.

---

## 3. Row 1 — 25 / 75

### Left 25% — Daily Completion Ring (Apple Fitness style)
Square card with three concentric rings:
- **Outer** — Speed sessions completed today / goal (default 2)
- **Middle** — Hard questions correct today / goal (5)
- **Inner** — Medium questions correct today / goal (10)

"Today" = local-day window. Data: `student_sessions` for speed count, `student_attempts` joined to `questions.difficulty` for hard/medium counts (first-correct per question, today only). Small ⚙️ corner re-opens the goal flow.

### Right 75% — Question Set Island
Three vertical sections side-by-side, each its own progress bar filling upward:

```
┌──────────────────────────────────────── [ 📊 Big Ring ] ┐
│   68           150 Hard         CB 1074                 │
│  ▓▓▓            ▓▓▓▓             ▓▓                     │
│  ▓▓▓            ▓▓▓▓             ▓▓                     │
│  ▓▓▓            ▓▓▓▓             ▓▓                     │
│  42/68          90/150            612/1074              │
└─────────────────────────────────────────────────────────┘
```

- Hover on a section → popover preview of that practice set (title, % complete, last attempted, "Open" button → respective practice route).
- Top-right button opens a dialog with one **big Apple-style ring**:
  - Outer = CB 1074, Middle = 150 Hard, Inner = 68
  - Each = distinct correct / total in set.

---

## 4. Row 2 — 40 / 60

### Left 40% — Weakness Island
Lifted from the analytics page's weakness component (top 3–5 weakest topics by accuracy, with mini bars and "Practice this" link per row).

### Right 60% — Speed Island (reimagined)
Split into left + right halves:

**Left half**
- Top: Avg current speed (s/question) + Avg accuracy (last 10 sessions), big numbers.
- Bottom: Last sessions preview — compact list of 3 most recent speed sessions (date, time/q, accuracy).

**Right half**
- Line graph of speed-per-session with **7d / 14d / 30d** selector (reuses the selector from the speed-mode work we already did).
- On hover anywhere over the right half: a "Quick start" button surfaces, pre-filled with the last session's settings; click → `/practice/speed/session` with those params.

---

## 5. Row 3 — 50 / 50

### Left 50% — Mastery Hexagon
Radar/hexagon chart with 6 axes:
1. Advanced Math (accuracy %)
2. Algebra (accuracy %)
3. Problem Solving & Data Analysis (accuracy %)
4. Geometry & Trig (accuracy %)
5. Speed (normalized: target 20s/q → 100%, scales linearly)
6. Vocab (math vocab completion % from `student_vocabulary_progress`)

### Right 50% — Quick Vocab Quiz (customizable)
Card with a "Start" button and three selectors:
- **Length**: 5 / 10 / 20 words
- **Mode**: Flashcards · Definition→Word · Word→Definition · Sentence fill-in
- **Source**: All · Due for review · Weakest · Recently missed

Selections persist in localStorage so the next quiz uses last settings. Clicking Start launches an inline quiz overlay (no route change) so the student stays on the dashboard.

---

## Technical Section

### Files to create
- `src/components/student/dashboard/DailyRing.tsx` — three-ring SVG, today's progress.
- `src/components/student/dashboard/GoalSetupDialog.tsx` — 3-step flow.
- `src/components/student/dashboard/SetProgressIsland.tsx` — 68 / 150 / CB bars + popovers + big-ring dialog.
- `src/components/student/dashboard/BigCompletionRingDialog.tsx`.
- `src/components/student/dashboard/SpeedIsland.tsx` — reimagined card with 7/14/30 selector.
- `src/components/student/dashboard/MasteryHexagon.tsx` — radar via recharts.
- `src/components/student/dashboard/QuickVocabQuiz.tsx` — selectors + inline quiz.
- `src/components/student/SidebarRankBox.tsx` — sprint rank pill.
- `src/hooks/useDailyGoals.ts` — read/write `daily_goal_*` on `student_accounts`.
- `src/hooks/useDailyProgress.ts` — counts of today's speed sessions + hard/medium correct.
- `src/hooks/useSetProgress.ts` — distinct-correct counts for the three sets.

### Files to edit
- `src/pages/student/StudentDashboardHome.tsx` — full layout rewrite (3 rows, grid-12).
- `src/components/student/StudentDashboardSidebar.tsx` — add `SidebarRankBox` under Leaderboard item.
- Lift `WeaknessIsland` out of the stats page into a shared component if it isn't already, then reuse.

### Schema migration (one migration)
```sql
ALTER TABLE public.student_accounts
  ADD COLUMN IF NOT EXISTS daily_goal_speed   integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS daily_goal_hard    integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS daily_goal_medium  integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS goal_intensity     text,
  ADD COLUMN IF NOT EXISTS daily_goal_set_at  timestamptz;
```
No new tables, no new policies needed (existing `student_accounts` RLS already covers self-update).

### Notes
- All data fetched via existing supabase client + hooks pattern; new hooks follow the shape of `useStudentStreak`.
- Mobile: rows stack vertically; ring stays square; set-island bars become horizontal; hexagon and vocab quiz stack.
- No business-logic changes to speed mode, practice, or vocab beyond reading existing data.
