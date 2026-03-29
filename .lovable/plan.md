

# Flowers Wrapped — Class Closing Presentation

A Spotify Wrapped-style fullscreen presentation that teachers launch from their dashboard to wrap up a batch. It aggregates **class-level** stats (not per-student) and presents them across 6-7 animated slides.

## Slides (7 pages)

1. **Intro** — "That's a wrap, [Batch Name]!" with animated flower/bloom motif
2. **The Class** — Total students, total sessions held, class attendance rate
3. **By The Numbers** — Total questions attempted across all students, total homework completion rate
4. **Mock Test Journey** — Class average first mock → class average highest mock, with animated line/growth visual
5. **Class MVPs** — Top 3 students by score improvement (anonymized to first names only), top attender
6. **Most Improved** — Biggest single score jump in the class, celebrated with confetti-style animation
7. **Thank You / Goodbye** — Warm closing message, batch name, teacher name, FlowersOS branding

## Data Fetching

Query all students in the selected batch and aggregate:
- Attendance records → class average attendance rate, total sessions
- Homework → class completion rate
- Practice tests → class avg first/highest mock, top improvers
- Student attempts → total questions across class
- Student count

## Implementation

### New Files
- `src/pages/teacher/TeacherClassWrapped.tsx` — Full-screen Wrapped presentation page with all 7 slides, framer-motion animations, navigation dots, keyboard arrow support
- Route: `/teacher/wrapped/:batchId`

### Modified Files
- `src/App.tsx` — Add the new route under `TeacherProtectedRoute`
- `src/pages/TeacherDashboard.tsx` — Add a "Flowers Wrapped" button on completed batch cards that navigates to `/teacher/wrapped/:batchId`

### Design Direction
- Dark gradient background (deep indigo → electric cyan, matching FlowersOS brand)
- Large bold typography (Chillax-style), counter animations for numbers
- Each slide uses framer-motion enter/exit with spring physics (reusing the pattern from `StudentClosingReport`)
- Fullscreen mode with ESC to exit back to dashboard
- Progress dots + arrow key navigation + swipe on mobile

### No Database Changes
All data already exists in `students`, `attendance`, `homework`, `practice_tests`, `student_attempts`, `student_accounts`, and `batches` tables.

