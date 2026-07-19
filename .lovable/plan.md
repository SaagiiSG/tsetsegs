## 1. Carousel layout polish (`ClassCarousel.tsx`, `ClassCardBig.tsx`)

- Vertically center cards inside the scroll viewport (`items-center`, min-height that matches the empty dashboard area so cards sit mid-screen, not glued to the top).
- Cards go from ~60% width to **75%** of the viewport width (with a sensible min/max so they still feel right on desktop and iPad).
- Fix the left/right nav buttons getting clipped: move them out of `overflow-hidden` — either render them as siblings of the scroll viewport with `absolute` positioning and add horizontal padding to the parent so they have room to sit outside the card edge, or increase the outer wrapper padding so the buttons live inside the safe area.
- Remove every emoji from the card (e.g. the "✨" in TOP ATTENDANCE, "✨" in "All good") and swap to Lucide icons (`Sparkles`, `CheckCircle2`, `AlertTriangle`, `MapPin`, `Calendar`, etc.) already used elsewhere in the project.

## 2. Teacher dock: swap Review + Intense for Analytics

In `TeacherDashboard.tsx` mode dock:

- Remove the **Review** and **Intense** entries.
- Keep **Dashboard** and **Practice**.
- Add **Analytics** (icon: `BarChart3` or `TrendingUp`) that routes to a new mode/page rendering the Teacher Analytics view described below.
- No emojis in labels — icons only.

## 3. New page: Teacher Math Analytics

**Route/mode:** `analytics` mode inside `TeacherDashboard`, rendering `<TeacherMathAnalytics />` (new file `src/components/teacher/analytics/TeacherMathAnalytics.tsx`).

**Scope filters (top of page):**
- **Class picker** — defaults to "All active classes", lists each active batch owned by the logged-in teacher (via `teacherName ILIKE` on `batches.teacher`, same as existing dashboard).
- **Time window toggle** — 7 days / 30 days / All-time.
- Both controls persist to `localStorage` per teacher.

**Data source:**
- Students: all `students.batch_id` in the selected batch(es) owned by this teacher.
- Attempts: `student_attempts` joined to `student_accounts.linked_student_id` for those students, joined to `questions` for `subtopic` / `skill` / `subject='math'` grouping.
- Only math for now — English deferred.

**Topic grain:** SAT math **subtopics** (`questions.subtopic`, ~20 buckets like "Linear equations in one variable", "Nonlinear functions", "Circles"). Falls back to `skill` where subtopic is null.

**Three sections, in this order:**

1. **Go harder here (weakest topics)**
   - Ranked list of subtopics by lowest class accuracy on first attempts.
   - Requires a minimum sample (e.g. ≥ 10 attempts across the class) so a topic with 2 attempts doesn't dominate.
   - Row shows: subtopic name, accuracy %, attempts count, tiny sparkline of last 4 weeks, class-size context ("14/22 students tried"), expand chevron.
   - Expanding a row reveals the students dragging it down: name + their accuracy on that subtopic, sorted worst first. Each student row links to their existing profile.
   - Row action: **"Practice in class"** button → opens Teacher Practice Hub filtered to that subtopic.

2. **Biggest recent drops**
   - Subtopics where accuracy in the current window is meaningfully lower than the prior equal-length window (min sample in both windows).
   - Row shows: subtopic name, prior % → current %, delta (red down-arrow), attempts. Same expand + Practice actions as above.

3. **Safe to skim (strongest topics)**
   - Ranked list of subtopics with highest accuracy and enough attempts. Read-only, no drill-in needed — just gives teachers permission to move fast.

**Empty / low-data state:**
- If a class has < some threshold of attempts, show "Not enough practice data yet — students need more attempts before insights are meaningful" with a link to nudge the class.

**Loading:** skeleton rows, same look as the existing dashboard.

## 4. Technical notes

- New hook `src/hooks/useTeacherMathAnalytics.ts` — accepts `{ batchIds, windowDays }`, does the joins, returns `{ weakest, drops, strongest, studentsByTopic }`. Aggregates client-side after a single `student_attempts` fetch scoped to those account ids to keep query count low; if payload is too big for large classes we switch to an RPC.
- Sparkline: reuse existing chart primitives (`recharts`) already in the project.
- Practice Hub deep link: extend `TeacherPracticeHub` to read a `?subtopic=` query param on mount and preselect it.
- All colors via existing semantic tokens (no hardcoded `text-red-*` etc.) — reuse the tier/warning tokens already in `index.css`.
- Icons only. No emojis anywhere in the new page or the carousel edits.

## Out of scope for this turn

- English/Reading analytics (add later as a Subject toggle).
- Bulk-nudge from a weak topic (read-only + Practice jump only for v1).
- Any changes to the Practice or Dashboard modes beyond the dock label swap.
