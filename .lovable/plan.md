

# Fix: Speed Session History Not Showing

## Problem
The speed session history page reads from `student_activity_logs` to display past sessions, stats, and the 7-day performance chart. But this table has **no SELECT policy** for the public role. Since students use custom phone auth (which operates as `anon`/`public`), all their SELECT queries silently return empty arrays.

The INSERT policy works fine — sessions ARE being saved. Students just can't read them back.

## Fix

**Single database migration** — add a public SELECT policy to `student_activity_logs`:

```sql
CREATE POLICY "Public can read activity logs"
  ON public.student_activity_logs
  FOR SELECT TO public USING (true);
```

No code changes needed. The queries in `StudentSpeedMode.tsx` (lines 191-288) are correct — they just get empty results due to the missing policy.

## What This Fixes
- Speed session history drawer (all past sessions)
- Last 7 days performance chart
- Best score and total session count stats
- Dashboard speed session display (`StudentDashboardHome.tsx`)

## Also Included
Fix `student_question_notes` policies (currently restricted to `authenticated` instead of `public`):

```sql
DROP POLICY IF EXISTS "Authenticated can insert notes" ON public.student_question_notes;
DROP POLICY IF EXISTS "Authenticated can read notes" ON public.student_question_notes;
DROP POLICY IF EXISTS "Authenticated can update notes" ON public.student_question_notes;

CREATE POLICY "Public can insert notes" ON public.student_question_notes
  FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Public can read notes" ON public.student_question_notes
  FOR SELECT TO public USING (true);
CREATE POLICY "Public can update notes" ON public.student_question_notes
  FOR UPDATE TO public USING (true);
```

This fixes student notes/drawings not saving — same root cause (wrong role).

## Files
- **1 new migration** — the two policy fixes above

