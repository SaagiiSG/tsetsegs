# SMS Automation — Phase 1

## Goals
1. **Parent absence/sick/excused SMS** (real-time, Mongolian) — sent the moment a teacher marks a student `absent`, `sick`, or `excused` in any session.
2. **Welcome SMS to student** (real-time) — sent when an admin creates a student account, includes login URL + password.
3. **Admin visibility** — every SMS is logged, with a small admin page to view history and resend.

## Setup

- Link existing workspace Twilio connection (`Saran-Ochir's Twilio`) to this project.
- Add runtime secret `TWILIO_FROM_NUMBER = +17627600310`.
- Reminder to user: in Twilio console enable **SMS Geo Permissions → Mongolia (+976)** and turn on **SMS Pumping Protection** before going live.

## Database

New migration:

```text
sms_logs
  id, created_at, kind ('absence' | 'welcome' | 'manual'),
  to_phone, from_phone, body, recipient_role ('parent' | 'student'),
  student_id (fk, nullable), batch_id (fk, nullable),
  session_number int null, status text null,  -- for absence: which session, which status
  twilio_sid text, twilio_status text,        -- 'queued' | 'sent' | 'failed'
  error text, dedupe_key text unique          -- prevents duplicate per (student, session, status)
```

RLS: admins manage all; teachers can SELECT rows for their batches.

## Edge functions

1. **`send-sms`** (internal helper, JWT verified)
   - Body: `{ to, body, kind, student_id?, batch_id?, session_number?, status?, recipient_role, dedupe_key? }`
   - Normalizes phone to E.164 (`+976` prefix for 8-digit MN numbers).
   - Inserts `sms_logs` row, calls Twilio via connector gateway (`/Messages.json`), updates row with `twilio_sid` + status.
   - Honors `dedupe_key` — if a row already exists, returns the prior result without resending.

2. **`notify-attendance-change`** (called by DB trigger via `pg_net`)
   - Receives `{ student_id, batch_id, session_number, status, session_date }`.
   - If status ∈ {`absent`,`sick`,`excused`} and student has `parent_phone`: build Mongolian message and call `send-sms` with `kind='absence'` and dedupe key `absence:{student_id}:{session_number}:{status}`.
   - Message template (status-aware, configurable later):
     - absent: `Сайн байна уу? Цэцэгс сургалтын төвөөс холбогдож байна. {name} {date} өдрийн хичээлд ирээгүй байна. Холбогдоно уу. Баярлалаа.`
     - sick / excused: `… {date} өдрийн хичээлээс чөлөө авсан байна. …`

3. **`send-welcome-sms`** (called from `create-teacher-account`-style flow when an admin creates a student account)
   - Looks up student, sends to `students.phone` with login URL + temporary password. Dedupe key `welcome:{student_id}`.

## DB trigger

```sql
create trigger attendance_sms_trigger
after insert or update on public.attendance
for each row execute function public.notify_attendance_sms();
```

`notify_attendance_sms()` walks `session_1..session_24`, detects which column changed to `absent|sick|excused` (compares OLD vs NEW), and for each change posts to `notify-attendance-change` via `net.http_post` using the project URL + anon key. Inserts only (no OLD) send for all 24 columns that are set.

## Admin UI

New route `/admin/sms`:
- Table of recent `sms_logs` (filter by kind, status, student).
- Per-row **Resend** button (calls `send-sms` without dedupe key).
- Top-level info card showing today's send count and failure rate.
- Add a sidebar link under Admin → "SMS Log".

## Student creation hook

Find the existing admin "create student account" flow and, on success, fire `send-welcome-sms` (non-blocking, toast on failure). No schema change needed for this.

## Out of scope (phase 2, just flagged)
- Homework nudges, class reminders, score notifications, bulk announcement composer. Will add once phase 1 is verified delivering to +976.

## Files touched
- New: `supabase/functions/send-sms/index.ts`, `supabase/functions/notify-attendance-change/index.ts`, `supabase/functions/send-welcome-sms/index.ts`
- New migration: `sms_logs` table + RLS + `notify_attendance_sms()` trigger + enable `pg_net`
- New: `src/pages/admin/SmsLog.tsx` + route entry + sidebar link
- Edit: the student-account-creation handler (frontend) to invoke `send-welcome-sms`
- Memory update: `mem://features/sms-automation-workflows`
