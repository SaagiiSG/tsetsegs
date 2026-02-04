

# Plan: Fix AI Parsing for Fill-in-the-Blank and Answer Extraction

## Problem Summary

The AI parsing edge functions (`parse-cb-question` and `parse-english-question`) have two issues:

1. **Fill-in-the-blank questions not recognized**: The current prompt only expects answers to be "A, B, C, or D" and doesn't account for fill-in-the-blank questions where the answer is a numeric value or text
2. **Correct answers in explanation section**: Some CollegeBoard PDFs don't show the correct answer prominently in the question area—instead, the answer is revealed in the rationale/explanation section. The AI needs to check there if not found elsewhere

---

## Technical Changes

### 1. Update `parse-cb-question` Edge Function

**File**: `supabase/functions/parse-cb-question/index.ts`

**Changes to the system prompt**:

```text
- Add instruction to detect question type (multiple choice vs fill-in-the-blank)
- For fill-in-the-blank: set option_a through option_d to null, correct_answer to the actual value
- Add instruction to extract correct answer from rationale/explanation if not found in question section
- Add a new field "question_type" to the JSON schema: "multiple_choice" or "fill_in_blank"
```

**Updated prompt structure**:
```json
{
  "question_id": "hex ID",
  "domain": "...",
  "skill": "...",
  "difficulty": "easy|medium|hard",
  "question_text": "...",
  "question_type": "multiple_choice or fill_in_blank",
  "option_a": "option A (null for fill-in-blank)",
  "option_b": "option B (null for fill-in-blank)", 
  "option_c": "option C (null for fill-in-blank)",
  "option_d": "option D (null for fill-in-blank)",
  "correct_answer": "A/B/C/D for MC, or the actual answer value for fill-in-blank",
  "rationale": "explanation text"
}
```

**Key prompt additions**:
- "Determine if this is a multiple choice question (has A, B, C, D options) or a fill-in-the-blank/student-produced-response question"
- "For fill-in-the-blank questions, set all options to null and put the actual answer value in correct_answer"
- "IMPORTANT: If the correct answer is not clearly marked in the question section, look for it in the rationale/explanation section. The explanation often starts with 'The correct answer is...' or 'Choice X is correct...'"

---

### 2. Update `parse-english-question` Edge Function

**File**: `supabase/functions/parse-english-question/index.ts`

**Changes to the system prompt**:

- Add instruction to extract correct answer from rationale if not visible elsewhere
- English questions can also have fill-in-the-blank format (though less common)
- Add same question_type detection

**Key prompt additions**:
- "If the correct answer letter is not visible in the question area, extract it from the rationale section. Look for phrases like 'The correct answer is...', 'Choice A is correct because...', etc."
- "For fill-in-the-blank questions (where student enters their own text), set options to null and put the actual answer in correct_answer"

---

### 3. Update Frontend Validation Logic

**File**: `src/components/admin/questions/CBQuestionImport.tsx`

**Changes**:
- Update `hasEmptyOptions` function to NOT flag fill-in-the-blank questions as having "empty options"—they legitimately have no options
- Check `question_type` from the parsed response to determine validation behavior

```typescript
const hasEmptyOptions = (q: ParsedQuestion): boolean => {
  // Fill-in-blank questions don't have options - that's expected
  if (q.question_type === 'fill_in_blank') return false;
  
  const isMultipleChoice = ['A', 'B', 'C', 'D'].includes(q.correct_answer?.toUpperCase() || '');
  if (!isMultipleChoice) return false;
  
  return (
    (!q.option_a || q.option_a.trim() === '') &&
    (!q.option_b || q.option_b.trim() === '') &&
    (!q.option_c || q.option_c.trim() === '') &&
    (!q.option_d || q.option_d.trim() === '')
  );
};
```

- Add `question_type` field to the `ParsedQuestion` interface

---

## Summary of Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/parse-cb-question/index.ts` | Update AI prompt to handle fill-in-blank and extract answers from rationale |
| `supabase/functions/parse-english-question/index.ts` | Update AI prompt to extract answers from rationale section |
| `src/components/admin/questions/CBQuestionImport.tsx` | Add `question_type` to interface, update validation logic |

---

## Expected Outcome

After implementation:
- Fill-in-the-blank questions will be correctly identified with `question_type: "fill_in_blank"` and their numeric/text answers extracted
- Multiple choice questions where the answer is only shown in the explanation will have the correct answer properly extracted
- The admin UI will correctly display fill-in-the-blank questions without flagging them as "empty options"

