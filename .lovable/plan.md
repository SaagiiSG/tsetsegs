
# Enhanced Analytics Dashboard - Admin Panel

## Overview

Build a comprehensive analytics dashboard at `/admin/analytics` that replaces the current Question Bank analytics tab. This will be a dedicated, full-page analytics experience with 4 main tabs providing actionable insights for SAT prep platform teachers and administrators.

## Architecture

```text
/admin/analytics
├── Tab 1: Overview (Platform health, at-risk students, topic struggles, patterns, cohorts, interventions)
├── Tab 2: Question Performance (Question stats, calibration alerts, time outliers, wrong patterns)
├── Tab 3: Student Deep Dive (Individual student analysis with 5 sub-tabs)
└── Tab 4: Class Comparison (Cross-batch analysis with heatmaps and insights)
```

## Data Sources

The dashboard will aggregate data from these existing tables:
- `student_accounts` - Student profiles, login timestamps, device info
- `student_attempts` - Question attempt history with timing, correctness
- `student_sessions` - Login sessions and activity tracking
- `student_activity_logs` - Detailed activity events
- `questions` - Question metadata (difficulty, category, subtopic)
- `question_categories` - Topic categorization
- `student_sprint_rankings` - Competition tier and points data
- `sprints` - Sprint/season timing
- `bluebook_attempts` - Full practice test scores
- `bluebook_answers` - Individual test question responses
- `batches` - Class/batch information
- `students` - Linked student profiles with batch associations

---

## Component Structure

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `src/pages/admin/AnalyticsDashboard.tsx` | Main page component with 4-tab structure |
| `src/components/admin/analytics/OverviewTab.tsx` | Tab 1: Platform overview |
| `src/components/admin/analytics/QuestionPerformanceTab.tsx` | Tab 2: Question analytics |
| `src/components/admin/analytics/StudentDeepDiveTab.tsx` | Tab 3: Individual student analysis |
| `src/components/admin/analytics/ClassComparisonTab.tsx` | Tab 4: Cross-class comparison |
| `src/components/admin/analytics/PlatformHealthCard.tsx` | Circular progress health score |
| `src/components/admin/analytics/AtRiskStudentsTable.tsx` | Top 10 at-risk with actions |
| `src/components/admin/analytics/TopicStruggleHeatmap.tsx` | Topic performance grid |
| `src/components/admin/analytics/PracticePatternsChart.tsx` | 30-day activity trends |
| `src/components/admin/analytics/CohortAnalysis.tsx` | Retention funnel analysis |
| `src/components/admin/analytics/InterventionRecommendations.tsx` | AI-generated action cards |
| `src/components/admin/analytics/QuestionTable.tsx` | Paginated question list |
| `src/components/admin/analytics/DifficultyCalibrationAlerts.tsx` | Mismatched difficulty warnings |
| `src/components/admin/analytics/WrongAnswerPatterns.tsx` | Common error analysis |
| `src/components/admin/analytics/StudentSelector.tsx` | Sticky search/filter header |
| `src/components/admin/analytics/StudentProfileHeader.tsx` | Selected student info card |
| `src/components/admin/analytics/TopicMasteryGrid.tsx` | Topic mastery visualization |
| `src/components/admin/analytics/LearningBehaviorCharts.tsx` | Time/day performance analysis |
| `src/components/admin/analytics/ProgressTimeline.tsx` | 60-day progress graph |
| `src/components/admin/analytics/InterventionPanel.tsx` | Student-specific recommendations |
| `src/components/admin/analytics/ClassComparisonTable.tsx` | Multi-class metrics table |
| `src/components/admin/analytics/TopicMatrixHeatmap.tsx` | Topic x Class accuracy matrix |
| `src/hooks/useAdminAnalytics.ts` | Central data fetching hook |
| `src/hooks/useRiskCalculation.ts` | Student risk score calculation |

### Files to Modify

| File Path | Change |
|-----------|--------|
| `src/pages/Admin.tsx` | Add route for `/admin/analytics` |
| `src/components/admin/AdminSidebar.tsx` | Add Analytics menu item to Overview section |
| `src/pages/admin/QuestionBank.tsx` | Remove Analytics tab (now standalone page) |

---

## Tab 1: Overview - Detailed Specification

### Platform Health Card
- **Display**: Large card at top with circular progress indicator
- **Score Calculation** (0-100):
  - DAU % (students active today / total active accounts): 30%
  - Avg session length (target: 30+ mins): 25%
  - Completion rate (questions completed / started): 25%
  - Question velocity (questions/day vs target): 20%
- **Visual**: 
  - Circular progress with score in center
  - Color: Green (80+), Yellow (60-79), Red (<60)
  - Trend indicator vs last week (up/down arrow with percentage)
  - Alert badge if score <70

### At-Risk Students Table
- **Columns**: 
  1. Name (clickable, navigates to Student Deep Dive tab)
  2. Batch + course type badge
  3. Risk score badge (0-100 with color coding)
  4. Risk factors (text summary)
  5. Last active (relative time)
  6. Actions (Message, Assign Practice, View Profile buttons)
- **Filters**: Risk level (High/Medium/Low), Class dropdown, Activity status
- **Risk Calculation**:
  - Login frequency (30%): Days since last login / 30
  - Accuracy trend (25%): Declining accuracy over last 2 weeks
  - Practice frequency (20%): Questions/week vs class avg
  - Topic avoidance (15%): Skipping weak topics
  - Sprint engagement (10%): Points relative to tier avg

### Topic Struggle Heatmap
- **Structure**: Grid with rows = SAT topics, columns = metrics
- **Metrics per topic**: Avg Accuracy %, Attempt Count, Avg Time (s), Students Struggling
- **Cell Colors**: 
  - Dark red: <50%
  - Light red: 50-60%
  - Yellow: 60-70%
  - Light green: 70-80%
  - Dark green: 80%+
- **Interactions**:
  - Click cell opens modal showing struggling students for that topic
  - "Assign Practice" bulk action in modal
  - "Action Needed" badge on topics with <70% avg accuracy

### Practice Patterns Chart (30 days)
- **Lines** (toggleable):
  - Daily Active Users (blue)
  - Questions per day (green)
  - Avg session minutes (purple)
  - Badge unlocks (orange)
- **Features**:
  - Sprint periods shown as shaded regions
  - Zoom options: 7/14/30/90 days
  - Export data button
  - Stats below: Peak day, Avg DAU, Sessions/user, Anomaly alerts

### Cohort Analysis (Collapsible)
- **Grouping Options**: Enrollment month, Sprint join date, Batch
- **Table Columns**: Cohort name, Initial size, Current active, Retention %, Avg accuracy, Avg hours, Top student
- **Retention Funnel**: Visual funnel showing:
  - Registered → Active (logged in 2+ times)
  - Active → Engaged (10+ questions)
  - Engaged → Competing (joined sprint)
  - Drop-off percentages between stages

### Intervention Recommendations
- **Layout**: Horizontal scrollable cards (max 10)
- **Card Structure**:
  - Priority badge (Critical/Important/Suggested)
  - Recommendation text
  - Impact count (students affected)
  - Action button
  - Dismiss button
- **Example Recommendations**:
  - "34 students stuck on Algebra - Create targeted drill"
  - "Reading practice down 40% this week - Send reminder"
  - "12 students with perfect streaks - Celebrate achievement"

---

## Tab 2: Question Performance - Detailed Specification

### Summary Cards (Top Row)
1. Total Questions (count of active questions)
2. Needs Review (clickable, filters table)
3. Never Attempted (clickable, filters table)
4. High Performers 90%+ (clickable, filters table)

### Question Table
- **Pagination**: 50 per page
- **Columns**:
  1. Question ID (clickable, opens detail modal)
  2. Topic badge
  3. Difficulty badge (Easy/Medium/Hard)
  4. Calibrated difficulty (shown if different from set difficulty)
  5. Total attempts
  6. Accuracy % with color badge
  7. Avg time vs expected time
  8. First attempt accuracy
  9. Retry success rate
  10. Flag count
  11. Status badge (needs review/calibrated/never attempted)
  12. Actions dropdown (View, Edit, Retire, Assign)
- **Filters**: Topic, Difficulty, Status, Search, Sort by
- **Features**: Column sorting, bulk selection

### Difficulty Calibration Alerts
- **Display**: Card grid (max 20 visible)
- **Per Card**:
  - Question ID + text snippet
  - Current difficulty setting
  - Actual performance data
  - Recommended difficulty + confidence %
  - Reason text
  - Action buttons: Adjust, Keep Current, Retire
- **Bulk Actions**: Multi-select + bulk adjust button

### Time Outliers Table
- **Columns**:
  1. Question ID (clickable)
  2. Topic
  3. Avg time taken
  4. Expected time
  5. Ratio (e.g., "2.8x slower")
  6. Issue indicator (confusing wording, complex calculation, etc.)
  7. Student feedback summary
  8. Actions

### Wrong Answer Patterns
- **Question Group Cards**:
  - Question ID
  - Correct answer
  - Wrong options with selection counts
  - Most common wrong answer highlighted
  - Percentage breakdown per option
  - Pattern analysis text (e.g., "Students confusing X with Y")
  - Affected students count (clickable)
  - "Create Lesson" button
- **Topic Error Summary**: Aggregate error types by topic
- **Progress Graph**: Common errors decreasing over time

### Never Attempted & Skipped Sections
- **Never Attempted Table**:
  - Question ID, Topic, Date added, Suspected reason, Actions (Push to students, Feature, Review)
- **Skipped Table**:
  - Question ID, Skip rate %, Topic, Feedback, Actions (Add hint, Simplify, Mark optional)
- **Export button** for both sections

---

## Tab 3: Student Deep Dive - Detailed Specification

### Student Selector (Sticky Header)
- **Search**: Dropdown with name/phone search
- **Filters**: 
  - Batch (multi-select)
  - Risk level (High/Medium/Low/All)
  - Rank tier (Bronze through Ruby)
  - Activity status (Active/Inactive/New)
- **Quick Pills**: At Risk, Top Performers, Inactive 7+, Sprint Leaders
- **Recently Viewed**: Last 5 students for quick access

### Profile Header (When Student Selected)
- **Left Side**:
  - Avatar (initials if no image)
  - Full name
  - Phone number
  - Batch name + course badge
- **Right Side Grid**:
  - Rank tier with icon
  - Level + progress bar to next
  - Total practice hours
  - Risk score badge
- **Action Buttons**: Message, Assign Practice, Reset Password, View Account, Deactivate, Add Note
- **Last Login**: Timestamp with relative time

### Sub-Tab 3A: Overview
- **4 Stat Cards**:
  1. Questions: Attempted count, Overall accuracy + trend, 1st attempt acc, Improvement %, mini 30d graph
  2. Time: Total hours, Avg session mins, Sessions this week vs last, Most active time, 30d heatmap
  3. Sprint: Rank + icon, Points, Position "X of Y", Promotion badge, Points to advance, mini graph
  4. Engagement: Current streak, Longest streak, Days since login, Risk score, Trend arrow
- **Recent Activity Feed**: Last 10 activities (timeline format, clickable)

### Sub-Tab 3B: Topic Mastery
- **Layout**: Math and English accordions
- **Per Topic Card**:
  - Topic name + icon
  - Accuracy % + status badge (Mastered/Proficient/Learning/Struggling/Not Started)
  - Questions completed "X/Y"
  - Avg time vs optimal
  - Last practiced date
  - Progress bar
  - Assign button
- **Panels**:
  - Weakness panel: Top 5 weak topics with assign buttons
  - Strength panel: List of mastered topics
- **Radar Chart**: Student performance vs class average across all topics

### Sub-Tab 3C: Learning Behavior
- **Peak Hours Chart**: Bar chart showing accuracy % by hour (6am-11pm)
- **Day of Week Chart**: Bar chart with best day highlighted
- **Difficulty Distribution**: Pie chart (Easy/Medium/Hard %)
- **Speed vs Accuracy Quadrant**: Scatter plot with 4 labeled quadrants
- **Retry Metrics**: Rate, success %, "Good Learner" badge if applicable
- **Session Quality**: Qs per session, completion %, focus score

### Sub-Tab 3D: Progress Timeline
- **Main Chart**: 60-day multi-line graph
  - Accuracy trend line
  - Practice frequency bars
  - Badge/rank milestone markers
  - Absence gap indicators
- **Milestones Timeline**: Below chart, showing achievements
- **Toggle**: Overlay class average for comparison

### Sub-Tab 3E: Intervention
- **AI Recommendations**: Priority-sorted cards with actions
- **Communication History**: Table with date, type, preview, response, status
- **Quick Message**: Template dropdown + textarea + send/schedule buttons
- **Notes Section**: Add new, category tags, admin-shared, searchable

### Bulk Actions (Bottom Bar)
- Message all selected
- Assign practice to all
- Export data
- Add to watch list

---

## Tab 4: Class Comparison - Detailed Specification

### Class Selector
- **Multi-select checkboxes** (max 5 classes)
- **Quick selects**: All SAT, All IELTS, Current month, Active only

### Comparison Table
- **Rows**: Metric names
- **Columns**: Selected classes
- **Metrics**:
  - Student count
  - Avg accuracy (badge colored)
  - Avg questions/student
  - Avg practice hours
  - Engagement %
  - Top student name
  - At-risk count
  - Health score (0-100)
- **Highlighting**: Best value green, worst value red

### Topic Matrix Heatmap
- **Rows**: All SAT topics
- **Columns**: Selected classes
- **Cells**: Average accuracy % with color gradient
- **Auto-Insights**: Text below (e.g., "Class A outperforms Class B by 23% in Reading")
- **Click Interaction**: Modal showing all students from that class on that topic

### Engagement Charts (30 days)
- **Multi-line Chart**: 
  - One line per class for DAU
  - Toggle for questions/day or session length
  - Legend with class colors
- **Bar Chart**: Weekly sessions by class

### Sprint Section
- **Participation Rate**: % of students in active sprint per class
- **Avg Points**: By class
- **Tier Distribution**: Stacked bar showing Bronze/Silver/Gold/etc per class
- **Cross-Class Top 20**: Leaderboard showing top students across selected classes

### Insights Panel
- **Auto-generated Cards**: Based on comparison data
- **Recommendations**: Actionable items (e.g., "Consider pairing Class A and B for peer learning")
- **Export Report**: Generate PDF/CSV comparison report

---

## Technical Implementation Details

### Data Fetching Strategy
- Use `react-query` with proper cache keys
- Implement data fetching hook `useAdminAnalytics.ts` with:
  - `useOverviewMetrics()` - Platform health, at-risk, topics
  - `useQuestionPerformance()` - Question-level stats
  - `useStudentAnalytics(studentId)` - Individual student data
  - `useClassComparison(batchIds)` - Cross-class metrics
- Pagination for large tables (50 items/page)
- Debounced search (200ms)

### Risk Score Algorithm
```text
riskScore = (
  loginRecency * 0.30 +      // Days since last login / 30, capped at 1
  accuracyDecline * 0.25 +   // Negative trend over 2 weeks
  practiceDeficit * 0.20 +   // Questions/week vs class avg
  topicAvoidance * 0.15 +    // Weak topics not practiced
  sprintDisengagement * 0.10 // Points below tier average
) * 100
```

### Chart Libraries
- Use existing `recharts` (already installed)
- Components: AreaChart, BarChart, LineChart, PieChart, RadarChart
- Custom heatmap using CSS Grid + color interpolation

### Responsive Design
- Mobile: Stacked cards, collapsed tables with horizontal scroll
- Tablet: 2-column layouts
- Desktop: Full multi-column layouts with side panels

---

## Routing Integration

```text
Admin.tsx Routes:
├── /admin (Dashboard)
├── /admin/analytics (NEW - Analytics Dashboard)
│   ├── ?tab=overview (default)
│   ├── ?tab=questions
│   ├── ?tab=students&studentId=xxx
│   └── ?tab=comparison&classes=id1,id2
├── /admin/questions (Question Bank - Analytics tab removed)
└── ... (other existing routes)
```

---

## Migration Notes

1. The existing `AnalyticsDashboard.tsx` component in Question Bank will be deprecated
2. Core calculation logic from `useStudentAnalytics.ts` will be reused and extended
3. Student search patterns from `StudentSearch.tsx` will be incorporated
4. Sprint monitoring logic from `SprintMonitor.tsx` will be referenced for tier data

---

## Implementation Phases

**Phase 1: Core Structure**
- Create main page with 4-tab skeleton
- Add routing and sidebar navigation
- Implement basic data fetching hooks

**Phase 2: Overview Tab**
- Platform health card with score calculation
- At-risk students table with basic filtering
- Topic struggle heatmap

**Phase 3: Question Performance Tab**
- Question table with pagination
- Difficulty calibration alerts
- Wrong answer patterns

**Phase 4: Student Deep Dive Tab**
- Student selector with search/filters
- Profile header and 5 sub-tabs
- Topic mastery visualization

**Phase 5: Class Comparison Tab**
- Multi-class selector
- Comparison table and heatmap
- Engagement charts

**Phase 6: Polish**
- Intervention recommendations (AI-generated)
- Export functionality
- Mobile responsiveness
- Performance optimization
