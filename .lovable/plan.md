
# Plan: Add Alternate Correct Answers for Fill-in-the-Blank Questions

## Overview
For SAT math fill-in-the-blank questions, the same answer can be expressed in different ways (e.g., "1/2", "0.5", ".5", "2/4" are all valid for the same answer). This plan adds optional alternate answer inputs for both the "68 Questions" and "CollegeBoard" question forms.

## User Experience Flow
1. When an admin creates or edits a fill-in-the-blank question, they enter the primary correct answer
2. Below the primary answer, they see an "Add Alternate Answer" button
3. They can add up to 4 alternate answers (e.g., decimal form, fraction form, etc.)
4. When a student submits an answer, the system checks against all valid answers

---

## Technical Implementation

### Phase 1: Database Schema Update
Add a new column to store alternate answers:

```sql
ALTER TABLE questions 
ADD COLUMN alternate_answers text[] DEFAULT NULL;
```

This stores alternate correct answers as an array of text values, applicable only when `question_type = 'fill_blank'`.

### Phase 2: Update QuestionForm.tsx (68 Questions)

**Changes:**
1. Add `alternate_answers` to the form schema (optional array of strings)
2. Add a collapsible section below the "Correct Answer" field that appears only when `question_type = 'fill_blank'`
3. Use `useFieldArray` to manage dynamic alternate answer inputs
4. Include Add/Remove buttons for each alternate answer
5. Update the save mutation to include `alternate_answers` in the database insert/update

**UI Layout:**
```text
Correct Answer: [____0.5____]

[+ Add Alternate Answer]

Alternate Answers (optional):
  1: [____1/2____] [x Remove]
  2: [____.5_____] [x Remove]
  
[+ Add Alternate Answer]
```

### Phase 3: Update CBQuestionForm.tsx (CollegeBoard Questions)

Same implementation as Phase 2 but for the CollegeBoard question form:
1. Add `alternate_answers` field to the CB question schema
2. Add collapsible alternate answers section (visible only for fill_blank type)
3. Update save mutation to include alternate_answers

### Phase 4: Update Answer Validation (StudentQuestion.tsx)

**Current Logic (line ~303):**
```typescript
const correct = answer.toUpperCase() === currentQuestion.answer.toUpperCase();
```

**Updated Logic:**
```typescript
const normalizeAnswer = (ans: string) => ans.trim().toUpperCase();
const primaryCorrect = normalizeAnswer(answer) === normalizeAnswer(currentQuestion.answer);
const alternatesArray = currentQuestion.alternate_answers as string[] | null;
const alternateCorrect = alternatesArray?.some(
  alt => normalizeAnswer(answer) === normalizeAnswer(alt)
) ?? false;
const correct = primaryCorrect || alternateCorrect;
```

This checks the student's answer against:
1. The primary correct answer
2. All alternate answers (if any exist)

### Phase 5: Update English Question Validation (StudentEnglishQuestion.tsx)

Apply the same answer validation logic update to the English practice question page.

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/` | New migration to add `alternate_answers` column |
| `src/components/admin/questions/QuestionForm.tsx` | Add alternate answers UI for fill_blank type |
| `src/components/admin/questions/CBQuestionForm.tsx` | Add alternate answers UI for fill_blank type |
| `src/pages/StudentQuestion.tsx` | Update answer validation logic |
| `src/pages/student/StudentEnglishQuestion.tsx` | Update answer validation logic |

---

## Edge Cases Handled

1. **Empty alternates**: Only non-empty strings are saved
2. **Whitespace normalization**: Answers are trimmed before comparison
3. **Case insensitivity**: All comparisons are case-insensitive
4. **Multiple choice questions**: The alternate answers section is hidden for multiple choice
5. **Editing existing questions**: Load existing alternate answers when editing

---

## Summary
This feature ensures that students who provide mathematically equivalent answers (like 0.5 vs 1/2) receive credit, improving the accuracy and fairness of the practice system.
