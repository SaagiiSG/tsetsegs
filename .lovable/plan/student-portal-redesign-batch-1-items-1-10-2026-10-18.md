# Student portal redesign — Batch 1 (items 1–10)

Applies to both the main student portal and the center (customer) student portal. Only the look changes; behavior, data, and access rules stay the same. Center pages keep reading center-only data.

## What changes
1. **App background and frame**: soft sky-blue background with faint clouds; page content sits on large rounded white cards.
2. **Desktop sidebar**: floating white card, pill highlight on the current page, course status box at the bottom. Collapsing still leaves icons.
3. **Phone bottom bar and iPad dock**: floating frosted pill, springy press feedback, count badges.
4. **Course switcher**: pill button; dropdown shows each course with a progress bar and a check on the active one.
5. **Top chips (streak, rank, points)**: streak chip with a warm flame, rank chip with the rank crest, points chip with a coin. Tapping opens the matching dialog, same as today.
6. **SAT countdown**: calendar-style pill with a small progress ring; tap to set the test month.
7. **Announcement bell**: raised button with an unread dot; dropdown groups announcements by type.
8. **Dashboard home**: greeting with avatar, today's goal summary, big "Continue practicing" button, then the existing islands in rounded cards.
9. **Daily ring and completion dialog**: thicker ring with a fill animation and a burst at 100%; dialog with a large "Continue" button.
10. **Streak dialog**: large flame with the count, 7-day strip with checks and freeze slots, reward milestones shown as a locked/unlocked path. Center streak page gets the same look.

## Rules kept
- Chillax headings, JetBrains Mono numbers (project fonts); coral pink and deep indigo brand colors, applied through shared theme colors so dark mode keeps working.
- Reduced-motion users get no bouncing or bursts.
- Teachers/admins viewing a student see the same new look.

## Technical details
- Add student-scoped tokens in `src/index.css` (`--student-canvas`, `--student-card`, `--student-chip-*`, shadows) under a `.student-theme` class set by `StudentLayout` and the center student shell, so admin/teacher pages are untouched.
- Shared primitives in `src/components/student/ui/` (`StudentCard`, `StatChip`, `PillDock`) used by both portals to avoid forking.
- Files: `StudentLayout`, `StudentDashboardSidebar`, `StudentBottomNav`, `StudentIPadDock`, `CourseSwitcher`, `StreakAndRankBar`, `SATCountdownWidget`, `AnnouncementBell`, `StudentDashboardHome`, `DailyRing`, `BigCompletionRingDialog`, `StreakHistoryDialog`, `StreakRewardsPanel`, `CenterStreak`, center student shell/dashboard.
- Verify with screenshots at phone, iPad, and desktop widths for both portals, then present before Batch 2.
