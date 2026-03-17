## Plan: Redesign Speed Session Page + Add Bug Report Page + SAT Countdown Widget

### 1. Redesign Speed Session Page (`StudentSpeedSession.tsx`)

Based on the screenshot reference, the speed session page should have a **two-column layout**:

- **Left side (60-65%)**: Question content area with question text, answer options/input, and result feedback. Tool icons (speed mode, drawing, calculator, reference) as a compact icon bar at the top center.
- **Right side (35-40%)**: Large circular countdown timer (SVG ring) showing seconds left, a star rating system showing current performance tier, and a scoring breakdown table showing point tiers with time thresholds:
  - ★★★ 1600 pts → ≤28s (highlighted when achievable)
  - ★★ 1450 pts → ≤46s  
  - ★ 1300 pts → ≤91s

The current linear progress bar timer will be replaced with a prominent **circular SVG timer** with cyan/primary color theming. Question navigation dots at the bottom left. the point system for the speed session will stay the same.

### 2. Bug Report Page (`/practice/bug-report`)

A simple form page inside `StudentLayout` where students can submit bug reports:

- Title, description (textarea), optional screenshot upload (to Supabase storage)
- Category selector (UI bug, question error, performance issue, other)
- Stores in a new `bug_reports` table with `student_account_id`, `title`, `description`, `category`, `status`, `screenshot_url`
- Add route to `App.tsx` and a link in student sidebar/settings  
- Bug report in the admin page 

### 3. SAT Countdown Widget

A compact widget at the top of the speed mode page (`StudentSpeedMode.tsx`) showing days remaining until the next SAT test date. Uses known upcoming SAT dates (hardcoded or from a config) and displays a countdown like "XX days until SAT (Month Day)". nah Next SAT: DDday HHhour

---

### Technical Details

**Database migration needed:**

- Create `bug_reports` table with RLS policies (students can insert their own, read their own)

**Files to create:**

- `src/pages/student/StudentBugReport.tsx` — bug report form page

**Files to modify:**

- `src/pages/student/StudentSpeedSession.tsx` — complete redesign to two-column layout with circular timer, star rating, and score tier table
- `src/pages/student/StudentSpeedMode.tsx` — add SAT countdown widget at top
- `src/App.tsx` — add bug report route
- `src/components/student/StudentSidebar.tsx` or `StudentBottomNav.tsx` — add bug report link

**Styling approach:** Dark theme matching the screenshot — dark card backgrounds, the theme accent for the timer ring, star icons for tiers, clean typography. Follows the existing aesthetic direction (no generic slop).