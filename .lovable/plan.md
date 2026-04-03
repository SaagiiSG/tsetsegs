

## Expand Practice Tab into a Full Teacher Practice Hub

### Vision
The "Practice" tab becomes a comprehensive teaching tool — not just the Kahoot live session. Teachers get a question browser where they can view, solve, and discuss any problem from the question bank, with Desmos calculator access. The Live Session (Kahoot) becomes one sub-feature within this hub.

### Structure

```text
Practice Tab
├── [Tab: Browse Questions]  ← NEW (default)
│   ├── Question set picker (68 / CB / 150 Hard / English / All)
│   ├── Subject toggle (Math / English)
│   ├── Category filter + difficulty filter
│   ├── Scrollable question list with preview cards
│   ├── Click → full question view (MathText, passage, image, choices)
│   ├── Teacher can select answer → see correct/wrong + rationale
│   ├── Desmos calculator button (floating, same as student has)
│   └── Reference sheet button (for geometry formulas)
│
├── [Tab: Live Session]  ← existing Kahoot feature (moved here)
│   └── LivePracticeContent (create session, lobby, play, results)
│
└── [Tab: Flagged]  ← move TeacherFlaggedQuestions here
    └── Read-only flagged questions list with preview
```

### File Changes

1. **New: `src/components/teacher/practice/TeacherPracticeHub.tsx`**
   - Tab container with three sub-tabs: "Browse", "Live Session", "Flagged"
   - Browse tab is default
   - Renders `TeacherQuestionBrowser`, `LivePracticeContent`, `TeacherFlaggedQuestions`

2. **New: `src/components/teacher/practice/TeacherQuestionBrowser.tsx`**
   - Question set selector (reuses same sets as student practice)
   - Subject toggle (math/english), category dropdown, difficulty filter
   - Fetches questions from `questions` table with filters
   - Renders a scrollable list of question cards (question_id, preview text, difficulty badge, category)
   - Click a card → opens `TeacherQuestionViewer` dialog

3. **New: `src/components/teacher/practice/TeacherQuestionViewer.tsx`**
   - Full question display using `MathText` (same rendering as StudentQuestion)
   - Shows passage, image, multiple choice options or fill-in-blank input
   - Teacher can select an answer → reveals correct answer, rationale, video link
   - Desmos calculator toggle button (reuses `DesmosCalculator` component)
   - Reference sheet toggle (reuses `ReferenceSheet` component)
   - Navigation: prev/next question buttons within filtered set

4. **Edit: `src/pages/TeacherDashboard.tsx`**
   - Replace `<LivePracticeContent />` with `<TeacherPracticeHub />`
   - Remove standalone `TeacherFlaggedQuestions` from the dashboard tabs (it moves into Practice hub)
   - Remove the "Flagged" tab from the dashboard's main tabs since it's now inside Practice

### No Database Changes
All data already exists — this is purely a UI/component restructuring using existing question data and components.

### Key UX Details
- Teachers project questions on screen for class discussion
- Desmos floats the same way it does for students — draggable, snappable
- Question cards show difficulty color coding (green/yellow/red)
- Rationale is hidden until teacher "submits" an answer (prevents accidental spoilers)
- Mobile-friendly: question list collapses to single column, viewer goes full-screen

