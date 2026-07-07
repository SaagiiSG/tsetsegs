
## 1. Redirect to the created batch

After a successful batch creation in `CreateBatchForm.tsx`, navigate to the All Batches page with the new batch pre-opened.

- Use `useNavigate()` → `navigate('/admin/batches?batch=<new-id>')`.
- `BatchesView.tsx` already reads `?batch=` from the URL and auto-opens `BatchDetailsDialog` for that batch, so no changes needed there.
- Remove the now-unused form reset (or keep it — either way we leave the page).

## 2. Admin-triggered SMS blast via Twilio

Add a **"Send SMS to all students"** button inside `BatchDetailsDialog` (visible per batch). Clicking it:

1. Opens a confirmation showing: recipient count, message preview (from the existing `getSmsTemplate(batch)` in `BatchesView.tsx`), and estimated cost.
2. On confirm, calls a new edge function `send-batch-sms` which:
   - Verifies caller is an `admin` (JWT + `has_role`).
   - Loads the batch + its students (phones).
   - Normalizes each phone to E.164 `+976XXXXXXXX` using the existing `normalize_mn_phone` DB function.
   - Sends via Twilio using **Messaging Service SID** (`TWILIO_MESSAGING_SERVICE_SID` already set) — this is Twilio's routing service that picks the best sender/route across all Mongolian carriers (Mobicom, Unitel, Skytel, G-Mobile).
   - Logs each send into `sms_logs` (already exists) with status, error, message SID.
   - Returns per-student results (sent / failed / skipped-invalid-phone).
3. UI shows a per-student result list and a summary toast. Button is disabled while sending; guarded against double-sends with a `sending` state.

The template used is the same one already defined in `getSmsTemplate` — we'll extract it into `src/lib/smsTemplates.ts` so both the copy button and the edge function share the same source (edge function re-implements it in Deno since it can't import from `src/`, but text stays identical).

## 3. Cost check — 300 messages on $7.65 is NOT enough

Twilio pricing to Mongolia (as of 2026):
- Outbound SMS to Mongolia: **~$0.0808 per segment**.
- Mongolian Cyrillic text is sent as **UCS-2**, so each segment is only **67 characters** (not 160).
- The SAT/IELTS templates in `getSmsTemplate` are ~450–700 Cyrillic chars → **7–10 segments per message**.

Rough estimate for 300 recipients:
- Average ~8 segments × 300 msgs × $0.0808 ≈ **$194**.
- Even a short 1-segment ASCII message: 300 × $0.0808 ≈ **$24**.

**$7.65 covers at most ~30–95 short messages, or ~10 full-template messages.** Recommend either:
- Top up Twilio balance to ~$200+ before sending all 12 batches, or
- Send a much shorter message (link only), or
- Send in smaller waves and top up as needed.

The UI will show the estimated segment count + cost before the admin confirms, so no surprise charges.

## Technical section

**Files to edit**
- `src/components/admin/CreateBatchForm.tsx` — add `useNavigate`, replace `onSuccess()` with `navigate('/admin/batches?batch=' + batch.id)`. Return the batch id to caller too.
- `src/components/admin/BatchDetailsDialog.tsx` — add "Send SMS to all students" button + confirm dialog + results panel.
- `src/lib/smsTemplates.ts` — new file, exports `getBatchSmsTemplate(batch)` (moved from `BatchesView.tsx`). `BatchesView` imports from here.

**New edge function** `supabase/functions/send-batch-sms/index.ts`
- CORS, JWT verify, `has_role(uid, 'admin')` check.
- Input: `{ batch_id: string, dry_run?: boolean }` (Zod validated).
- Loads batch + students, normalizes phones.
- If `dry_run`: returns segment count + recipient count only.
- Otherwise: for each valid phone, POST `x-www-form-urlencoded` to `https://connector-gateway.lovable.dev/twilio/Messages.json` with `To`, `MessagingServiceSid=$TWILIO_MESSAGING_SERVICE_SID`, `Body`. Uses `Authorization: Bearer $LOVABLE_API_KEY` + `X-Connection-Api-Key: $TWILIO_API_KEY`.
- Writes result to `public.sms_logs`.
- Returns `{ sent, failed, skipped, results: [...] }`.

**Segment estimator (client + server)**
- If body contains any non-GSM-7 char → UCS-2, 70 chars/segment (67 when concatenated).
- Else GSM-7, 160 chars/segment (153 when concatenated).

**No DB migration needed** — `sms_logs`, `normalize_mn_phone`, and Twilio secrets already exist.
