
# Ultra-Detailed Student Analytics Dashboard

## Overview
This plan redesigns the `/practice/stats` page into a comprehensive, gaming-inspired analytics dashboard that identifies student weaknesses and provides actionable next steps. Every metric section will end with a clear "Action" recommendation.

## Design Philosophy
- **Gaming-inspired UI**: Dark mode support with competitive gaming color scheme (reds for weaknesses, yellows for moderate, greens for strengths)
- **Action-first approach**: Every section must have a concrete next step
- **Data-driven insights**: All analytics derived from real `student_attempts` data including `time_spent_seconds`, `is_correct`, difficulty levels, and categories

---

## Page Structure

### 1. Priority Alert Card (Hero Section)
A large, attention-grabbing card at the top highlighting the #1 weakness.

**Data Sources:**
- `student_attempts` joined with `questions` (category, subtopic)
- Calculate accuracy per topic, identify lowest

**Display:**
- Weakest topic name with icon
- Current accuracy % (large, red-tinted)
- Target accuracy: 85%
- Pulse animation on the card border

**Action Button:** "Start Practice Session" - navigates to `/practice/dashboard` with the category pre-selected

---

### 2. Weakness Identifier Section
Bar chart visualization of accuracy by topic/subtopic.

**Data Sources:**
- `student_attempts` with `questions.subject`, `questions.subtopic`, `question_categories.name`

**Display:**
- Horizontal bar chart (Recharts)
- Topics grouped by Math (Algebra, Geometry, Advanced Math, Data Analysis) and Verbal (Reading, Writing, Grammar)
- Color coding: Red (`<70%`), Yellow (`70-85%`), Green (`>85%`)
- Sorted by lowest accuracy first

**Actionable Output:**
```
"Your weakest areas: Geometry (45%), Advanced Math (52%)
Action: Complete 20 geometry problems this week."
```

---

### 3. Time Efficiency Dashboard
Analysis of time spent per question vs optimal time.

**Data Sources:**
- `student_attempts.time_spent_seconds` grouped by category
- Optimal times: Math ~90s, Easy ~60s, Hard ~120s

**Metrics:**
- Average time per question by category (comparison bars)
- Topics where student is too slow (>2x optimal)
- Topics where student is rushing (<0.5x optimal with low accuracy)

**Display:**
- Dual-bar chart: Student avg vs Target
- Alert badges for slow/rushing topics

**Actionable Output:**
```
"You're spending 2.5 min on geometry (target: 1.5 min)
You're rushing reading questions - 38 sec avg but 60% wrong
Action: Slow down on reading, speed up on geometry."
```

---

### 4. Question Difficulty Analysis
Breakdown of performance by Easy/Medium/Hard questions.

**Data Sources:**
- `questions.difficulty_level` + `student_attempts`

**Display:**
- Three columns with large accuracy percentages
- Visual indicators for each difficulty
- Highlight if missing easy questions (careless errors indicator)

**Actionable Output:**
```
"Missing 30% of EASY questions but only 40% of HARD
This indicates careless errors, not skill gaps
Action: 10-min focused practice with NO distractions"
```

---

### 5. Error Pattern Tracker
Categorization of mistake types.

**Data Sources:**
- `student_attempts` with `time_spent_seconds` and `is_correct`
- Categories derived algorithmically:
  - **Careless**: Quick answer (<30s) + incorrect on easy questions
  - **Time Pressure**: Long time (>3min) + incorrect
  - **Conceptual**: Multiple attempts on same question still wrong
  - **Trap Answers**: Wrong answer matches common trap patterns

**Display:**
- Pie chart showing distribution
- Primary error type highlighted

**Actionable Output:**
```
"67% of mistakes are CARELESS
Action: Review each wrong answer for 30 seconds. Use scratch paper."
```

---

### 6. Progress Velocity Graph
Score progression over time with projections.

**Data Sources:**
- `bluebook_attempts.total_score` or derived from `student_attempts` weekly accuracy
- `practice_tests.score` from linked student

**Display:**
- Line graph: Score/accuracy over last 4 weeks
- Points gained per week calculation
- Projection lines for 4/8/12 weeks (dashed lines)
- Target score marker (horizontal line)

**Actionable Output:**
```
"Improving +15 pts/week. You'll hit 1400 in 6 weeks.
To hit 1500, need +25 pts/week
Action: Add 2 more practice sessions weekly"
```

---

### 7. Goal Gap Tracker
Visual gap between current and target scores.

**Data Sources:**
- `bluebook_attempts.total_score` (latest)
- `practice_tests.score` (latest)
- Student's target score (from `students.sat_test_month` context or default 1400)

**Display:**
- Large score display: Current | Target | Gap
- Circular progress ring showing % to goal
- Gap breakdown by section (Math vs Verbal)
- Top 3 skill blockers with estimated point values

**Actionable Output:**
```
"Target: 1450 | Current: 1320 | Gap: 130 pts
Math gap: 80 pts (focus here first)
Biggest blockers: Algebra (35 pts), Data Analysis (25 pts)
Action: Master these 2 = 80% gap closed"
```

---

### 8. Consistency Score Card
Performance stability analysis.

**Data Sources:**
- `student_attempts.attempted_at` for time-of-day analysis
- `bluebook_attempts` or weekly accuracy variance

**Metrics:**
- Score variance chart (min/max range visualization)
- Best performance time of day (morning/afternoon/evening)
- Best day of week
- Session quality trend (rolling average)

**Display:**
- Variance visualization with confidence bands
- Time-of-day heatmap or icons
- Calendar heatmap for consistency

**Actionable Output:**
```
"Scores swing 150 points between sessions
You perform 23% better in morning sessions
Action: Schedule practice for 8-10am daily"
```

---

## File Structure

### New Files to Create:
1. **`src/pages/student/StudentStats.tsx`** - Complete rewrite of the stats page
2. **`src/components/student/analytics/PriorityAlertCard.tsx`** - Hero weakness card
3. **`src/components/student/analytics/WeaknessIdentifier.tsx`** - Bar chart weakness section
4. **`src/components/student/analytics/TimeEfficiencyDashboard.tsx`** - Time analysis
5. **`src/components/student/analytics/DifficultyAnalysis.tsx`** - Easy/Medium/Hard breakdown
6. **`src/components/student/analytics/ErrorPatternTracker.tsx`** - Pie chart of error types
7. **`src/components/student/analytics/ProgressVelocityGraph.tsx`** - Score over time
8. **`src/components/student/analytics/GoalGapTracker.tsx`** - Target vs current
9. **`src/components/student/analytics/ConsistencyScoreCard.tsx`** - Variance analysis
10. **`src/components/student/analytics/ActionBox.tsx`** - Reusable action recommendation component
11. **`src/hooks/useStudentAnalytics.ts`** - Central data fetching hook

---

## Technical Implementation

### Data Fetching Strategy
Create a central `useStudentAnalytics` hook that fetches all necessary data in parallel:

```typescript
interface StudentAnalytics {
  studentId: string;
  currentScore: number;
  targetScore: number;
  topicAccuracy: {
    topicName: string;
    subject: 'Math' | 'English';
    accuracy: number;
    questionsAttempted: number;
    averageTime: number;
    optimalTime: number;
  }[];
  errorPatterns: {
    careless: number;
    conceptual: number;
    timePressure: number;
    trapAnswers: number;
  };
  progressHistory: {
    date: string;
    score: number;
    accuracy: number;
  }[];
  difficultyBreakdown: {
    easy: { total: number; correct: number; accuracy: number };
    medium: { total: number; correct: number; accuracy: number };
    hard: { total: number; correct: number; accuracy: number };
  };
  consistencyMetrics: {
    scoreVariance: number;
    bestTimeOfDay: 'morning' | 'afternoon' | 'evening';
    bestDayOfWeek: string;
    dailyActivity: { date: string; attempts: number; accuracy: number }[];
  };
}
```

### Component Libraries Used
- **Recharts**: BarChart, LineChart, PieChart, RadarChart
- **Framer Motion**: Smooth loading animations
- **shadcn/ui**: Card, Progress, Badge, Button, Skeleton, Tabs, Tooltip

### Styling Approach
- Gaming color palette variables in CSS
- Gradient backgrounds for cards
- Glow effects for important metrics
- Smooth transitions on data load
- Dark mode native support via Tailwind

---

## Layout Responsive Grid

```
Desktop (lg+):
+------------------+------------------+
|   Priority Alert (full width)      |
+------------------+------------------+
| Weakness Chart   | Time Efficiency  |
+------------------+------------------+
| Difficulty       | Error Patterns   |
+------------------+------------------+
| Progress Velocity (full width)     |
+------------------+------------------+
| Goal Gap         | Consistency      |
+------------------+------------------+

Mobile (sm):
All sections stacked vertically
```

---

## Implementation Order

1. **Create the data hook** (`useStudentAnalytics.ts`) - Foundation for all components
2. **Build the ActionBox component** - Reusable across all sections
3. **Implement PriorityAlertCard** - Most impactful, visible first
4. **Build WeaknessIdentifier** - Core feature
5. **Build TimeEfficiencyDashboard** - Key differentiator
6. **Build DifficultyAnalysis** - Careless error detection
7. **Build ErrorPatternTracker** - Pie chart
8. **Build ProgressVelocityGraph** - Motivation driver
9. **Build GoalGapTracker** - Goal visualization
10. **Build ConsistencyScoreCard** - Optimization insights
11. **Integrate all into StudentStats.tsx** - Final assembly

---

## Estimated Complexity
- **New components**: 11 files
- **Data queries**: 5-6 parallel queries in the hook
- **Charts**: 5 different chart types
- **Lines of code**: ~1500-2000

This redesign transforms the basic stats page into a powerful, actionable analytics dashboard that genuinely helps students improve their SAT scores.
