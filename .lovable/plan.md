

## Plan: External Database Sync for Question Bank

### Overview
Build an edge function that connects to an external Supabase/Postgres database, fetches questions (both Math and English), and inserts them into your local `questions` table. An admin UI button in the Question Bank page will trigger the sync.

### How It Works

1. **Store the external database connection string** as a secret (`EXTERNAL_DB_URL`) so the edge function can connect securely.

2. **Create an edge function** (`sync-external-questions`) that:
   - Connects to the external Postgres DB using Deno's `postgres` driver
   - Runs a SELECT query to fetch new questions (filtered by a timestamp or ID to avoid duplicates)
   - Maps the external schema fields to your local `questions` table columns (`question_text`, `answer`, `multiple_choice_options`, `difficulty_level`, `subject`, `question_type`, `rationale`, `passage_text`, etc.)
   - Inserts them into your local `questions` table via the Supabase service role client
   - Returns a summary (imported count, skipped duplicates, errors)

3. **Add a "Sync External Questions" button** in the admin Question Bank page that calls the edge function and shows a toast with results.

### Technical Details

**Edge Function: `supabase/functions/sync-external-questions/index.ts`**
- Uses `https://deno.land/x/postgres/mod.ts` to connect to external DB
- Accepts optional filters via POST body (subject, since_date)
- Deduplicates by checking `original_cb_id` or a composite key before inserting
- Auto-generates sequential `question_id` values (e.g., `EXT0001`, `EXT0002`) for imported questions
- Protected: requires admin auth via `getClaims()`

**Admin UI Changes: Question Bank page**
- Add a "Sync from External DB" button in the toolbar
- Shows a dialog with sync options (subject filter, preview count)
- Displays results after sync completes

### Before We Start

I need to understand the external database's schema to map fields correctly. Could you share:
- The table name and column names of the questions in the external database
- The external database's connection URL (I'll store it securely as a secret)

### Steps
1. Add `EXTERNAL_DB_URL` secret
2. Create the `sync-external-questions` edge function
3. Add the sync button and dialog to the admin Question Bank UI
4. Test end-to-end

