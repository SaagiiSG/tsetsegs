

# Plan: Fix Bottom Bar Layout + Add Note-Taking on Review Page

## Task 1: Fix the Bottom Bar Layout (StudentQuestion.tsx)

The current bottom bar wraps content inside a `container mx-auto max-w-3xl` which constrains the width. Per the requested layout:

```text
[ [x of xxx]                                                                    [check][< previous] [next >] ]
```

**Changes:**
- Remove the inner `container mx-auto max-w-3xl` wrapper so the bar content stretches the full width of the bottom bar
- Use `justify-between` directly on the bar's inner padding area
- Left side: question counter ("x of xxx") with navigator
- Right side: Check button, then Previous and Next buttons grouped together
- Keep the calculator-snap margin logic as-is

**File:** `src/pages/StudentQuestion.tsx` (lines 635-702)

## Task 2: Add Note-Taking Feature on Review Page

Students should be able to write personal notes on wrong questions from the Review page, to help them revisit and study.

### 2a. New Database Table: `student_question_notes`

```sql
CREATE TABLE public.student_question_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_account_id uuid NOT NULL,
  question_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_account_id, question_id)
);

ALTER TABLE public.student_question_notes ENABLE ROW LEVEL SECURITY;

-- Public insert/update/select (matches existing student_progress pattern)
CREATE POLICY "Public can insert notes" ON public.student_question_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update notes" ON public.student_question_notes FOR UPDATE USING (true);
CREATE POLICY "Public can read notes" ON public.student_question_notes FOR SELECT USING (true);
CREATE POLICY "Admins can manage notes" ON public.student_question_notes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

### 2b. UI on Review Page (StudentReview.tsx)

Add a note icon on each wrong question card. When clicked, it expands an inline textarea below the card (or opens a small dialog) where the student can type and save a note.

**Behavior:**
- Each wrong question card gets a small "note" icon button
- Clicking it expands a textarea inline below the card
- Auto-saves on blur or after a short debounce
- Shows a small indicator (filled note icon) if a note already exists
- Notes are fetched alongside wrong questions using the student's account ID

**File:** `src/pages/student/StudentReview.tsx`

### Technical Details

**StudentQuestion.tsx bottom bar changes (lines 636-701):**
- Remove the `<div className="container mx-auto max-w-3xl ...">` wrapper
- Replace with direct `flex items-center justify-between` on the outer fixed div's inner content using just padding (`px-6`)

**StudentReview.tsx note-taking additions:**
- Add a new query to fetch `student_question_notes` for the current student
- Add state for `expandedNoteId` and `noteContent`
- On each wrong question card, add a `StickyNote` icon button
- When expanded, show a `Textarea` below the card with save-on-blur
- Use upsert (on conflict `student_account_id, question_id`) for saving

