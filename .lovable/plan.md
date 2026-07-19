## Teacher Dashboard Redo

Rebuild `/teacher/dashboard` around a horizontal-snap carousel of big, information-rich class cards. Remove the top tab strip entirely; keep the class filter (Active / Completed / All). Add class nicknames and iOS-style motion throughout.

### 1. Remove old chrome

- Delete the `Tabs` strip (Classes / Students / Alerts) from `src/pages/TeacherDashboard.tsx`.
- Drop the `StudentAlertsTab` and `StudentSearchCommand` embeds; those tabs go away as requested.
- Keep header: teacher name, ⚙️ settings, sign-out. Keep the filter `Select` (Active / Completed / All).

### 2. Class nickname (rename in a dialog)

DB migration on `public.batches`:
- Add `nickname text` (nullable).

Card header shows `nickname || batch_name`. A small ✏️ icon on each card opens a `RenameClassDialog` with:
- Input for nickname (max ~40 chars), Save / Clear buttons.
- Save updates `batches.nickname`; Clear sets it to `null` (falls back to auto name).
- Optimistic update via React Query, toast on success.

### 3. Big horizontal class cards

New component `src/components/teacher/dashboard/ClassCardBig.tsx`.

Layout — each card is ~60% of viewport width on desktop (min 520px, max 780px), full-width on mobile:

```text
┌─────────────────────────────────────────────────────────┐
│ Nickname / Batch name              ✏️   👥 24 students │
│ MWF · 16:40–18:30  ▾                                    │
│ Room 1011 · Started Jan 12, 2026                        │
├─────────────────────────────────────────────────────────┤
│ Attendance 87%   ▓▓▓▓▓▓▓▓░░   Homework 74%  ▓▓▓▓▓▓▓░░░ │
│ Avg score 68%      ↗ +6 this week                       │
├─────────────────────────────────────────────────────────┤
│ ⭐ Most improved:  Bat-Erdene (+120), Sarnai (+95) …    │
│ ⚠️ Needs attention: 3  ›  (chips of names)              │
├─────────────────────────────────────────────────────────┤
│ [ Students ]  [ Analytics ]  [ QR ]  [ Wrapped* ]       │
└─────────────────────────────────────────────────────────┘
```

Expandable schedule: closed shows compact day glyphs (`MWF 16:40–18:30`); tap the ▾ to expand into per-day lines with animated height.

*Wrapped button only when the batch is completed.

### 4. "Needs attention" rule

A student is flagged when BOTH are true in the current week window:
- Missed at least 1 session (attendance status = absent) in the last 7 days.
- Has at least 1 incomplete homework assignment.

Compute in a single query per dashboard load, group by `batch_id`, cache in React Query. Show count + up to 3 name chips; tap chip → `/teacher/students/:batchId?focus=<studentId>`.

Most-improved uses the last 14 days of `student_attempts` accuracy delta vs prior 14 days; take top 2.

### 5. Horizontal scroll carousel

- Container: `overflow-x-auto snap-x snap-mandatory` with `scroll-padding` and `gap-4`.
- Each card: `snap-center shrink-0` at responsive widths.
- Trackpad + wheel + touch drag all work natively.
- Add left/right chevron buttons on desktop (hidden on touch) that call `scrollBy({ left: ±cardWidth, behavior: 'smooth' })`.
- Page dots under the carousel reflecting active card via `IntersectionObserver`.
- When Filter = All, keep the existing month/year grouping but render each group as its own horizontal row with a sticky group header.

### 6. iOS-feel motion

- Global spring: `type: 'spring', stiffness: 260, damping: 30, mass: 0.9` for entrance and layout.
- Card mount: staggered `opacity 0→1`, `y 12→0`, `scale 0.98→1` (40ms stagger).
- Filter change: `AnimatePresence mode="popLayout"` cross-fade + slide.
- Expandable schedule uses `motion.div` `layout` with `height: auto`.
- Rename dialog uses sheet-style spring in and rubber-band dismiss on mobile.
- Skeleton uses shimmer, not spinners.
- Haptic tick (via `useHaptics`) on filter change and card tap.

### 7. Data plumbing

Single React Query hook `useTeacherDashboardData(teacherName)` returning per-batch:
- studentCount, attendanceRate, homeworkRate, avgScore, weekDelta, mostImproved[], needsAttention[], scheduleParsed.

Powered by parallel queries against `batches`, `students`, `attendance`, `homework_assignments`, `student_attempts`. One trip on mount + real-time subscription on `students` (already present) refetches.

### 8. Files touched / added

- `src/pages/TeacherDashboard.tsx` — strip tabs, mount carousel.
- `src/components/teacher/dashboard/ClassCardBig.tsx` (new)
- `src/components/teacher/dashboard/ClassCarousel.tsx` (new)
- `src/components/teacher/dashboard/RenameClassDialog.tsx` (new)
- `src/components/teacher/dashboard/ScheduleGlyph.tsx` (new; MWF/TTHS compression)
- `src/hooks/useTeacherDashboardData.ts` (new)
- DB migration: add `batches.nickname`.

### Out of scope

- No changes to student-side pages, admin dashboard, or the batch analytics page itself (still linked to via the Analytics button).
- No new SMS or notifications.
