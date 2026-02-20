

# Plan: Add Note-Taking to the Practice Question Page

## What Changes

Add a collapsible "My Notes" section below the question card on the practice page (`StudentQuestion.tsx`). This lets students jot down thoughts while solving problems -- using the same `student_question_notes` table already created.

## UI Placement

Below the question card (after the result feedback area), add:
- A button/toggle labeled "My Notes" with a `StickyNote` icon
- When expanded, an inline `Textarea` appears
- Auto-saves on blur using upsert to `student_question_notes`
- Shows a filled icon indicator if a note already exists for this question

## Technical Details

**File: `src/pages/StudentQuestion.tsx`**

1. **New state variables:**
   - `noteExpanded` (boolean) -- whether the notes textarea is visible
   - `noteContent` (string) -- current note text

2. **New query:** Fetch the existing note for the current question + student:
   ```
   SELECT content FROM student_question_notes
   WHERE student_account_id = X AND question_id = Y
   ```

3. **New mutation:** Upsert note on blur:
   ```
   INSERT INTO student_question_notes (student_account_id, question_id, content)
   VALUES (...)
   ON CONFLICT (student_account_id, question_id)
   DO UPDATE SET content = ..., updated_at = now()
   ```

4. **UI placement:** After the question `Card` (around line 845), add a new collapsible section:
   - A `Button` with `StickyNote` icon + "My Notes" label
   - When expanded, a `Textarea` that loads existing note content
   - Saves on blur automatically
   - `StickyNote` icon is filled/highlighted if a note exists

5. **Import** `StickyNote` from lucide-react

6. **Reset** `noteExpanded` and `noteContent` when `questionId` changes (in existing `useEffect` or new one)

No database changes needed -- the `student_question_notes` table with the unique constraint on `(student_account_id, question_id)` already exists.

