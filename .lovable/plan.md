

## Plan: Add "150 Hard Questions" Tab + Skip-Duplicates Sync

### What changes

**1. Edge Function: Skip existing questions instead of updating**
`supabase/functions/sync-external-questions/index.ts`

- Change dedup logic: when a question already exists in the main DB (matched by `original_cb_id` or `question_id`), **skip it** instead of updating
- Add a `skipped` count to the response
- Remove all update logic (the `toUpdate` array and individual update calls)
- This makes sync import-only: only new questions get added

**2. Admin Question Bank: Add "150" tab**
`src/pages/admin/QuestionBank.tsx`

- Add a new stat card for "150 Hard Qs" showing count of questions with `question_set = 'SATMathTraining800'`
- Add a new tab trigger "150 Hard" in the TabsList
- Add a new TabsContent rendering `<QuestionList questionSet="150" />`
- Update sync result toast to show skipped count

**3. QuestionList: Support '150' question set**
`src/components/admin/questions/QuestionList.tsx`

- Extend `questionSet` prop type from `'68' | 'CB'` to `'68' | 'CB' | '150'`
- Add filter branch: when `questionSet === '150'`, query `.eq('question_set', 'SATMathTraining800')`

### Files modified
- `supabase/functions/sync-external-questions/index.ts` — skip duplicates, add `skipped` count
- `src/pages/admin/QuestionBank.tsx` — add stat card, tab, count query
- `src/components/admin/questions/QuestionList.tsx` — support '150' question set filter

