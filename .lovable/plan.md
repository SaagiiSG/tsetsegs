
# Bluebook SAT Simulator - Implementation Plan

## Overview

This plan adds a **Bluebook SAT Simulator** feature that replicates the College Board's digital SAT testing experience. The feature includes:

1. **Admin Management Page** - Create and manage full practice tests
2. **Student Test-Taking Experience** - Timed, adaptive-style modules with Bluebook-like UI
3. **Results & Analytics** - Score reports and performance tracking

---

## Digital SAT Structure (Reference)

The real Digital SAT has this structure:

| Section | Modules | Time per Module | Questions per Module |
|---------|---------|-----------------|---------------------|
| Reading & Writing | 2 modules | 32 min each (64 min total) | 27 questions each (54 total) |
| Math | 2 modules | 35 min each (70 min total) | 22 questions each (44 total) |
| **Break** | 10 minutes between sections | | |
| **Total** | 4 modules | 2 hours 14 minutes | 98 questions |

---

## Database Schema (New Tables)

### Table: `bluebook_tests`
Stores test metadata and configuration.

```sql
CREATE TABLE bluebook_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- "Practice Test 1"
  description TEXT,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Table: `bluebook_modules`
Each test has 4 modules (RW1, RW2, Math1, Math2).

```sql
CREATE TABLE bluebook_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES bluebook_tests(id) ON DELETE CASCADE,
  section TEXT NOT NULL,                 -- 'reading_writing' | 'math'
  module_number INT NOT NULL,            -- 1 or 2
  time_limit_minutes INT NOT NULL,       -- 32 for RW, 35 for Math
  difficulty TEXT,                       -- 'standard' | 'harder' | 'easier' (for module 2)
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Table: `bluebook_module_questions`
Links questions to modules with ordering.

```sql
CREATE TABLE bluebook_module_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES bluebook_modules(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(module_id, order_index)
);
```

### Table: `bluebook_attempts`
Tracks student test attempts.

```sql
CREATE TABLE bluebook_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES bluebook_tests(id),
  student_account_id UUID REFERENCES student_accounts(id),
  status TEXT DEFAULT 'in_progress',     -- 'in_progress' | 'completed' | 'abandoned'
  current_module INT DEFAULT 1,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  rw_raw_score INT,                      -- Reading/Writing raw score
  math_raw_score INT,                    -- Math raw score
  rw_scaled_score INT,                   -- 200-800
  math_scaled_score INT,                 -- 200-800
  total_score INT                        -- 400-1600
);
```

### Table: `bluebook_answers`
Individual question responses within an attempt.

```sql
CREATE TABLE bluebook_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES bluebook_attempts(id) ON DELETE CASCADE,
  module_id UUID REFERENCES bluebook_modules(id),
  question_id UUID REFERENCES questions(id),
  answer_submitted TEXT,
  is_correct BOOLEAN,
  is_marked BOOLEAN DEFAULT false,       -- "Mark for Review" flag
  time_spent_seconds INT,
  answered_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Admin Features

### New Admin Page: `/admin/bluebook`

Add to admin sidebar under "Tools" section (dev-only like Question Bank).

**Tabs:**
1. **Tests** - List all practice tests with status (draft/published)
2. **Create Test** - Build new practice tests
3. **Analytics** - View student performance across tests

### Test Builder UI

```text
+------------------------------------------------------------------+
| CREATE PRACTICE TEST                                              |
+------------------------------------------------------------------+
| Test Name: [________________________]                             |
| Description: [________________________]                           |
+------------------------------------------------------------------+
|                                                                   |
| READING & WRITING SECTION                                         |
| +----------------------+ +----------------------+                 |
| | MODULE 1 (32 min)    | | MODULE 2 (32 min)    |                 |
| | 27 questions         | | 27 questions         |                 |
| | [+ Add Questions]    | | [+ Add Questions]    |                 |
| +----------------------+ +----------------------+                 |
|                                                                   |
| MATH SECTION                                                      |
| +----------------------+ +----------------------+                 |
| | MODULE 1 (35 min)    | | MODULE 2 (35 min)    |                 |
| | 22 questions         | | 22 questions         |                 |
| | [+ Add Questions]    | | [+ Add Questions]    |                 |
| +----------------------+ +----------------------+                 |
|                                                                   |
| [Save Draft]                          [Publish Test]              |
+------------------------------------------------------------------+
```

### Question Selection Dialog

When clicking "Add Questions":
- Shows available questions filtered by subject (English for RW, Math for Math)
- Can bulk-select from existing CollegeBoard questions
- Can search/filter by category and difficulty
- Shows question preview before adding
- Drag-and-drop reordering within module

---

## Student Features

### New Student Route: `/practice/bluebook`

**Tests List Page:**
- Shows available practice tests
- "Start Test" button for unpublished attempts
- "Continue" for in-progress attempts
- "View Results" for completed attempts

### Test-Taking Interface

Full-screen, distraction-free UI mimicking Bluebook:

```text
+------------------------------------------------------------------+
| PRACTICE TEST 1 - MATH MODULE 1              ⏱️ 32:45 remaining   |
+------------------------------------------------------------------+
| Question 15 of 22                                                 |
|                                                                   |
| [Question content here with images/math rendering]                |
|                                                                   |
| A) Option A                                                       |
| B) Option B                                                       |
| C) Option C                                                       |
| D) Option D                                                       |
|                                                                   |
+------------------------------------------------------------------+
| [< Back]  [Mark for Review ★]  [Next >]       Question Navigator  |
|                                               [1][2][3][4][5]...  |
+------------------------------------------------------------------+
```

**Key Features:**
- Countdown timer per module
- Question navigator (shows answered/unanswered/marked)
- "Mark for Review" functionality
- Can move freely between questions within a module
- Auto-save answers
- 10-minute break screen between sections
- Calculator toggle for Math section (Desmos integration exists)

### Module Transition Flow

```text
RW Module 1 → RW Module 2 → 10 min Break → Math Module 1 → Math Module 2 → Results
```

### Results Page

After completion:
- Score breakdown (RW: 200-800, Math: 200-800, Total: 400-1600)
- Per-section accuracy
- Time analysis per question
- Review incorrect answers with explanations
- Compare with previous attempts

---

## File Structure

### New Files

```text
src/pages/admin/BluebookManager.tsx       -- Admin test management
src/components/admin/bluebook/
  ├── BluebookTestList.tsx                -- List of all tests
  ├── BluebookTestBuilder.tsx             -- Create/edit test
  ├── BluebookModuleBuilder.tsx           -- Add questions to module
  ├── BluebookQuestionSelector.tsx        -- Question picker dialog
  └── BluebookAnalytics.tsx               -- Performance analytics

src/pages/student/BluebookTests.tsx       -- Student test list
src/pages/student/BluebookSession.tsx     -- Test-taking experience
src/pages/student/BluebookResults.tsx     -- Score report
src/components/student/bluebook/
  ├── BluebookTimer.tsx                   -- Countdown timer
  ├── BluebookNavigator.tsx               -- Question navigation
  ├── BluebookBreakScreen.tsx             -- 10-min break UI
  └── BluebookScoreCard.tsx               -- Results display
```

### Modified Files

| File | Changes |
|------|---------|
| `src/components/admin/AdminSidebar.tsx` | Add "Bluebook" link under Tools (dev-only) |
| `src/pages/Admin.tsx` | Add route for `/admin/bluebook` |
| `src/App.tsx` | Add student routes for bluebook pages |

---

## Implementation Phases

### Phase 1: Database & Admin Foundation
1. Create database tables with migrations
2. Add RLS policies for admin access
3. Create admin sidebar link
4. Build `BluebookTestList` component (empty state + list view)

### Phase 2: Test Builder
1. Build `BluebookTestBuilder` with module cards
2. Create `BluebookQuestionSelector` dialog
3. Implement question ordering/reordering
4. Add save draft and publish functionality

### Phase 3: Student Test Interface
1. Create `BluebookTests` list page
2. Build `BluebookSession` full-screen test experience
3. Implement timer, navigation, and auto-save
4. Add break screen between sections

### Phase 4: Results & Analytics
1. Create `BluebookResults` score report
2. Add score calculation (raw to scaled)
3. Build admin analytics dashboard
4. Add attempt history tracking

---

## Technical Details

### Score Calculation

The SAT uses a raw-to-scaled score conversion. For simplicity, we'll use a linear approximation:
- RW: (correct answers / 54) * 600 + 200
- Math: (correct answers / 44) * 600 + 200
- Total: RW + Math

### Auto-Save Strategy

Use debounced saves (every 5 seconds when answer changes) to `bluebook_answers` table. Store:
- Current answer for each question
- Time spent on current question
- "Marked for review" status

### Timer Persistence

Store remaining time in the `bluebook_attempts` table and calculate elapsed time on resume. Handle edge cases:
- Browser refresh: Resume from saved state
- Tab close: Show "resume" option on return
- Time expired: Auto-submit module and proceed

### RLS Policies

```sql
-- Students can only see published tests
CREATE POLICY "Students see published tests" ON bluebook_tests
  FOR SELECT USING (is_published = true);

-- Students can only access their own attempts
CREATE POLICY "Students own attempts" ON bluebook_attempts
  FOR ALL USING (student_account_id = auth.uid());

-- Admins have full access (via user_roles check)
```

---

## UI/UX Considerations

### Test-Taking Experience
- Full-screen mode encouragement (not forced)
- Clean, minimal interface matching Bluebook aesthetic
- Large, readable fonts
- High-contrast answer options
- Smooth transitions between questions

### Mobile Support
- Responsive but optimized for tablet/desktop
- Show warning if screen too small
- Maintain functionality on mobile if needed

### Accessibility
- Keyboard navigation support
- ARIA labels for screen readers
- Sufficient color contrast
