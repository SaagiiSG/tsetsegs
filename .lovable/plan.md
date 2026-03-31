

## Fix: Sync External Questions Edge Function Timeout

### Problem
The `sync-external-questions` edge function times out because it fetches up to 1000 questions from the external database and processes them one-by-one (individual INSERT/UPDATE per question). The edge function hits the wall-clock timeout limit, causing "Failed to send a request to the Edge Function."

### Solution: Batch processing with smaller limits

Reduce the per-call workload and use batch upserts instead of individual row operations.

### Changes

**1. Edge Function (`supabase/functions/sync-external-questions/index.ts`)**

- Reduce the default query limit from 1000 to **100** questions per call
- Accept an `offset` parameter for pagination
- Replace the per-row INSERT/UPDATE loop with batch `.upsert()` calls (groups of 25)
- Return `has_more` and `next_offset` in the response so the client can continue

**2. Admin QuestionBank UI (`src/pages/admin/QuestionBank.tsx`)**

- Update `handleSync` to call the edge function in a loop, using `offset` pagination
- Show progress to the admin (e.g., "Imported 100/350...")
- Stop when `has_more` is false
- Each call stays well within the timeout limit

### Technical details

Edge function changes:
- Add `offset` and `limit` (default 100) to the request body
- Use `.upsert()` with `onConflict: 'original_cb_id'` instead of individual insert/update — this requires ensuring `original_cb_id` has a unique constraint
- If unique constraint isn't feasible, keep the current logic but process only 100 rows max per call

Client-side loop:
```
let offset = 0, totalImported = 0, totalUpdated = 0;
do {
  const { data } = await supabase.functions.invoke('sync-external-questions', {
    body: { subject, category, dry_run: false, offset, limit: 100 }
  });
  totalImported += data.imported;
  totalUpdated += data.updated;
  offset = data.next_offset;
} while (data.has_more);
```

### Files modified
- `supabase/functions/sync-external-questions/index.ts` — add offset/limit, batch processing
- `src/pages/admin/QuestionBank.tsx` — paginated sync loop with progress indicator

