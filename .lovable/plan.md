## Move Student to Different Class

Add a "Move to another class" action on each student card in the teacher dashboard, alongside the existing Remove option.

### UX flow
1. Teacher clicks a new **Move to class** button (icon: `ArrowRightLeft`) in the student card actions area, next to "Remove from class".
2. A dialog opens showing:
   - Student name + current batch (read-only)
   - Searchable dropdown of all active batches with the **same `course_type`** as the current batch (excluding the current one). Each option shows: batch name, schedule, teacher name, current student count.
   - Confirmation copy explaining attendance/homework/test records will be reassigned to the new batch.
3. On confirm:
   - Update `students.batch_id` to the new batch.
   - Update all related records' `batch_id` to the new batch: `attendance`, `homework`, `practice_test_scores` (and any other tables tied via `batch_id` for this student).
   - Show success toast, close dialog, remove the moved student from the current carousel view (or refetch).
4. After move, teacher stays on the current batch view; the student no longer appears.

### Files to change
- `src/components/teacher/StudentCard.tsx`
  - Add `onMoveToClass?: (newBatchId: string) => Promise<void>` prop
  - Add Move button in the same actions block as Remove
  - New `MoveToClassDialog` subcomponent (loads target batches via Supabase on open, filtered by `course_type`)
- `src/pages/TeacherStudentCards.tsx`
  - New `handleMoveStudent(studentId, newBatchId)` async handler that performs all the updates (students, attendance, homework, practice tests)
  - Remove the moved student from local `students` state
  - Pass handler to `StudentCard`

### Data updates (no schema changes)
For the moved student, set `batch_id = newBatchId` on:
- `students` (1 row)
- `attendance` (rows where `student_id = X AND batch_id = oldBatchId`)
- `homework` (same filter)
- `practice_test_scores` (same filter, if table tied to batch)

All mutations use the existing RLS — teacher already has admin/teacher write access on these tables for batches they manage. Since the user chose "all teachers, same course type", we rely on the teacher being authenticated (existing policies allow teachers/admins to update these records).

### Edge cases handled
- Disable confirm button while loading / no target selected
- Show empty state if no other batches exist for that course type
- Toast on partial failure (use single try/catch, surface clearest error)
- Refetch switched-students map after move so the orange "Switched" warning doesn't reappear inappropriately

### Out of scope
- No schema changes
- No bulk move (single student per action)
- No undo (teacher can move them back manually)
