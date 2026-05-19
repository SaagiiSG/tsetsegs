# SMS Flows Admin Page + Teacher Test Broadcast

## Goal
Give admins a single page to manage all SMS automations (existing + future), and send a test SMS now to 5 teachers.

## Part 1 — Test broadcast (immediate)

Send `"Hello tsetsegs iin basgh nara"` to: Saran-Ochir, Enguun, Dulguun, Udval, Brody (phones already in `teachers` table).

Done via a "Send Test" button on the new page that calls `send-sms` for each — logged in `sms_logs` with `kind='manual'`, `recipient_role='other'`.

## Part 2 — SMS Flows page (`/admin/sms-flows`)

New page listing every SMS automation as a toggleable "flow" card:

| Flow | Trigger | Status | Notes |
|---|---|---|---|
| Welcome SMS | Student created | Live | existing |
| Absence/Sick/Excused notice | Attendance update | Live | existing |
| Course fee paid | Student marked paid | **New — needs payment field** |
| Batch starts tomorrow | Daily 09:00 cron, `batches.start_date = tomorrow` | **New** |
| Manual broadcast | Admin sends | New | ad-hoc to teachers/students/parents |

Each card: name, description, trigger, last-fired, sent-count, enable/disable toggle, "Edit template" (Mongolian message body with `{name}`, `{date}`, `{batch}` placeholders), "Send test".

Bottom section: recent send activity (reuses sms_logs).

## Part 3 — Backend additions

1. **`sms_flows` table**: `key`, `name`, `description`, `enabled`, `template_mn`, `recipient_role`, `updated_at`. Seeded with the 5 flows above. Templates read from this table by all edge functions.
2. **`students.fee_paid_at timestamptz`** column → trigger on transition from NULL to set → calls new `send-fee-paid-sms` function.
3. **`send-batch-start-reminder` edge function** + pg_cron daily at 09:00 Asia/Ulaanbaatar → iterates batches starting tomorrow, sends to each student's parent.
4. **`send-broadcast-sms` edge function** for the admin manual sender (accepts recipient list + body, respects per-flow enabled flag).
5. All existing functions (`send-welcome-sms`, `notify-attendance-change`) updated to check `sms_flows.enabled` before sending and read template from DB.

## Part 4 — UI

- New route `src/pages/admin/SmsFlows.tsx`
- Add "SMS Flows" entry in `src/components/admin/menuSections.ts` next to existing "SMS Log"
- Flow cards use existing shadcn `Card` + `Switch`; template editor uses `Textarea` with placeholder helper text
- Manual broadcast modal: recipient picker (All Teachers / All Active Students / All Parents / Custom phones), template preview, confirm

## Technical notes
- Cron uses existing `_post_edge_function` helper pattern
- All sends go through `send-sms` (already normalizes +976/+1 and logs)
- Dedupe key for batch-start-reminder: `batch_start_{batch_id}_{date}` to prevent double-send
- Flow toggles enforced server-side in edge functions (not just UI)

## Open question
The "course fee paid" trigger needs a payment field on `students`. Plan adds `fee_paid_at` — confirm or point me to where payment is currently tracked.
