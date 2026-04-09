

# SAT Math Score Prediction — Implementation Plan

## Context
Algorithm approved in previous conversation. Predicts a 20-point SAT Math score range for each student, shown on teacher dashboard only. Calibrated against Erdene-Tana (actual: 720, predicted: 710-730).

**Data insight from audit**: Time data needs capping at 600s per question to filter idle sessions.

## Files to Create

### 1. `src/hooks/useScorePrediction.ts`
New hook that takes a `studentId` (from `students` table) and returns the prediction.

**Data fetching:**
- Last 3 `practice_tests` scores for the student (ordered by `test_number` desc), filtered to SAT batches
- `attendance` record for the student's batch (sessions 1-15)
- `homework` records for the student's batch
- `student_attempts` via the linked `student_accounts` record — grouped by difficulty, with `time_spent_seconds` capped at 600s

**Algorithm (all client-side):**

```text
Base Score:
  - 3 tests: weighted avg (0.5, 0.3, 0.2)
  - 2 tests: (0.6, 0.4)  
  - 1 test: use directly
  - 0 tests: lookup from hard accuracy

Attendance Adj (-20 to 0):
  - Session 3 = 2x weight, others 1x
  - present/late = counted
  - 100% → 0, 90%+ → -3, 80%+ → -8, 70%+ → -15, <70% → -20

Homework Adj (-10 to 0):
  - completed / total assigned
  - 100% → 0, 90%+ → -2, 80%+ → -5, <80% → -10

Practice Intensity (-10 to +15):
  - Hard accuracy: >55% → +10, 40-55% → +3, 25-40% → 0, <25% → -5
  - Volume: >400 → +5, 200-400 → +2, <100 → -5
  - No platform data → 0

Output: { low: predicted-10, high: predicted+10, confidence, factors }
```

**Return type:**
```ts
{
  predictedRange: [number, number];
  confidence: 'high' | 'medium' | 'low';
  baseScore: number;
  factors: {
    attendanceRate: number;
    attendanceAdj: number;
    homeworkRate: number;
    homeworkAdj: number;
    hardAccuracy: number;
    attemptVolume: number;
    practiceAdj: number;
  };
  hasBaseline: boolean;
}
```

### 2. `src/components/teacher/ScorePredictionCard.tsx`
Card component for the teacher student profile page.

- Shows predicted range prominently (e.g., "710 - 730")
- Color: green (700+), yellow (600-700), red (<600)
- Confidence badge (high/medium/low)
- Expandable breakdown showing each factor's contribution
- "Estimated" label when no practice test baseline exists
- Uses existing Card, Badge UI components

### 3. `src/components/teacher/ScorePredictionBadge.tsx`
Compact inline badge for student cards/lists.
- Shows range like "710-730" in a small colored badge
- Tooltip with confidence level on hover

## Files to Modify

### 4. `src/pages/TeacherStudentProfile.tsx`
- Import and render `ScorePredictionCard` in the student profile
- Pass the student ID to `useScorePrediction`
- Place it prominently near the top of the profile

### 5. `src/components/teacher/StudentCard.tsx`
- Import `ScorePredictionBadge`
- Add the compact badge to each student card in the list view
- Need to check how the student card currently gets its student data to pass the right ID

## Technical Notes

- The hook needs to bridge `students.id` → `student_accounts.linked_student_id` to get platform attempt data
- `practice_tests` uses `student_id` (from `students` table), not `student_account_id`
- `attendance` and `homework` also use `student_id` from `students` table
- Cap `time_spent_seconds` at 600s when computing avg speed to filter idle time
- All computation is client-side — no edge function needed
- Clamp final prediction to [200, 800]

