
# Plan: Fix SAT Date Error & Badge Progress Syncing

## Problem Analysis

### Issue 1: SAT Date Update Error
When students try to set their SAT test date, the database throws "infinite recursion detected in policy for relation 'students'".

**Root Cause**: The RLS policy "Anonymous can update accessed status only" contains a self-referential subquery that creates infinite recursion:
```sql
WHERE (students_1.id = students_1.id)  -- This is always true, causing recursive evaluation
```

### Issue 2: Badge Progress Not Syncing for Complex Requirements
Currently, only speed badges (Lightning Strike, Speedster) have progress tracking implemented. Badges with complex requirements like:
- `first_try_correct` (300 first-try correct answers)
- `consecutive_days_speed` (5 consecutive days)
- `vocabulary_completion` (100% completion)
- `all_68_questions`, `all_cb_problems`, etc.

These are not being calculated or synced to the database.

---

## Solution Overview

### Part 1: Fix RLS Policy (SAT Date)

**Problem**: Recursive policy is blocking all student table updates.

**Solution**: 
1. Drop the problematic "Anonymous can update accessed status only" policy
2. Create a new policy that allows students to update their own records (specifically the `sat_test_month` field) without recursive queries
3. Add a separate policy for students to update their own linked record using a non-recursive approach

**New Policies**:
```sql
-- Allow students to update their own sat_test_month
CREATE POLICY "Students can update own sat_test_month"
ON public.students
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (
  id IN (
    SELECT linked_student_id 
    FROM student_accounts 
    WHERE id::text = coalesce(
      current_setting('request.jwt.claims', true)::json->>'sub',
      ''
    )
  )
);
```

---

### Part 2: Badge Progress Sync System

Create a comprehensive badge progress calculation service that:
1. Calculates progress for ALL badge requirement types
2. Syncs progress to the database periodically
3. Automatically awards badges when all requirements are met

**Implementation Approach**:

#### A. Create Badge Progress Calculator Hook
New file: `src/hooks/useBadgeProgressCalculator.ts`

This hook will:
1. Query student's activity data (attempts, vocabulary progress, practice tests)
2. Calculate current progress for each badge requirement type
3. Return calculated progress percentages

#### B. Supported Requirement Types

| Requirement Type | Data Source | Calculation |
|-----------------|-------------|-------------|
| `first_try_correct` | `student_attempts` | COUNT where attempt_number=1 AND is_correct=true |
| `consecutive_days_speed` | `point_transactions` | Analyze dates with category='speed' |
| `consecutive_days_both` | `point_transactions` | Days with both speed + practice transactions |
| `all_68_questions` | `student_attempts` | DISTINCT questions with correct answer |
| `vocabulary_completion` | `student_vocabulary_progress` | Percentage of words with high confidence |
| `practice_test_avg` | `bluebook_attempts` | AVG total_score where completed |
| `speed_sessions_high_accuracy` | `point_transactions` | Count sessions with 95%+ accuracy (from metadata) |
| `consecutive_perfect_drills` | `point_transactions` | Analyze consecutive 100% accuracy sessions |

#### C. Create Badge Progress Sync Function
New file: `src/hooks/useSyncBadgeProgress.ts`

This will:
1. Run on dashboard mount and after key activities
2. Calculate all badge progress
3. Upsert to `student_badges` table with `requirements_progress` JSON
4. Automatically unlock badges when progress reaches 100%

#### D. Integration Points

Update the following to trigger badge progress sync:
- `StudentDashboardHome.tsx` - on mount
- `StudentSpeedSession.tsx` - after session completes (already done for speed badges)
- `StudentPractice.tsx` - after answering questions
- `StudentVocabulary.tsx` - after vocabulary practice

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| **Database Migration** | Create | Fix RLS policies on students table |
| `src/hooks/useBadgeProgressCalculator.ts` | Create | Calculate progress for all badge types |
| `src/hooks/useSyncBadgeProgress.ts` | Create | Sync calculated progress to database |
| `src/hooks/useSpeedBadgeProgress.ts` | Modify | Integrate with new sync system |
| `src/pages/student/StudentDashboardHome.tsx` | Modify | Add badge sync on mount |
| `src/hooks/useBadges.ts` | Modify | Include real-time progress from calculator |

---

## Technical Details

### RLS Policy Fix (Migration SQL)

```sql
-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Anonymous can update accessed status only" ON public.students;

-- Create a proper policy for student self-updates
-- Uses student_accounts join to verify ownership
CREATE POLICY "Students can update their own record"
ON public.students
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM student_accounts sa
    WHERE sa.linked_student_id = students.id
    AND sa.phone_number = current_setting('request.headers', true)::json->>'x-student-phone'
  )
);
```

### Badge Progress Calculator Logic

```typescript
// Calculate first_try_correct
const firstTryCorrect = await supabase
  .from('student_attempts')
  .select('id', { count: 'exact' })
  .eq('student_account_id', studentId)
  .eq('attempt_number', 1)
  .eq('is_correct', true);

// Calculate vocabulary_completion  
const vocabProgress = await supabase
  .from('student_vocabulary_progress')
  .select('id', { count: 'exact' })
  .eq('student_account_id', studentId)
  .gte('confidence_level', 3);  // High confidence = mastered
```

---

## Expected Outcome

1. **SAT Date**: Students can successfully update their SAT test date without errors
2. **Badge Progress**: All badges show accurate progress based on student activity
3. **Auto-Unlock**: Badges automatically unlock when all requirements are met
4. **Real-time Sync**: Progress updates after each relevant activity

---

## Security Considerations

- RLS policies ensure students can only update their own records
- Badge progress calculations use server-side queries
- No sensitive data exposed through badge progress tracking
