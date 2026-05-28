## Email announcements for SAT students

Use **Lovable Emails** on `flowersos.co`. Announcements are opt-in (linked Google email only) and per-post (admin checks "Send by email").

---

### 1. Email infrastructure setup

- Configure email sender domain on `flowersos.co` (subdomain like `notify.flowersos.co`)
- Set up shared email queue infrastructure (queues, retry, suppression, unsubscribe tokens)
- Scaffold the transactional email Edge Functions
- Build a branded unsubscribe page at `/email-unsubscribe` matching the coral/indigo theme

### 2. Announcement email template

- New React Email template `announcement-notification.tsx`
- Coral/indigo branding, Chillax-style heading, white body background
- Dynamic data: student first name, announcement title, announcement body, link back to in-app `/practice/announcements`
- CTA button: "Read in app"
- System-managed unsubscribe footer (no manual unsub link in template)

### 3. Database changes

- Add `send_by_email` (boolean, default false) to `announcements` table
- Add `email_sent_at` (timestamp, nullable) to `announcements` table to prevent double-sends
- Add `announcement_email_sends` table to track per-recipient send status (announcement_id, student_account_id, email, status, sent_at) — for admin visibility and idempotency
- RLS: admin-only insert/select on `announcement_email_sends`; admin-only update on the new announcement columns

### 4. Admin UI changes (`AdminAnnouncements` page)

- "Send to students by email" checkbox in the announcement composer
- Audience preview: "X students will receive this email" (count of SAT students with linked, non-unsubscribed emails)
- After publish, if checkbox was on:
  - Confirm dialog: "Email N students. This cannot be undone."
  - Server-side fan-out queues one transactional send per recipient (per-student trigger, not a loop on the client) — keeps the queue's retry/rate-limit safety per recipient
- Status display on each announcement card: "Emailed X of Y students" once sent

### 5. Server-side fan-out (Edge Function)

- New Edge Function `dispatch-announcement-email`
- Admin-only (requires admin role check, same pattern as the other admin functions)
- Inputs: `announcement_id`
- Logic:
  - Verify announcement exists, has `send_by_email = true`, has not already been sent
  - Query: SAT students with linked Google email, not unsubscribed
  - For each recipient, call `send-transactional-email` with `idempotencyKey = announcement-{id}-{student_account_id}` (idempotent retries; one email per student even if dispatcher reruns)
  - Insert one `announcement_email_sends` row per recipient
  - Stamp `email_sent_at` on the announcement when done

### 6. Audience filter (SAT only)

- Join `student_email_links` → `student_accounts` → `students` → `batches` and filter `batches.course_type = 'SAT'`
- Exclude students with `unsubscribed_at` set on `student_email_links`

### 7. Student-facing

- No new UI needed — the existing announcements page and the Settings "Connect with Google" flow are already in place
- Each email links back to the in-app announcement (canonical content stays in-app)

---

### Technical notes

- One transactional send per recipient (correct queue pattern — not a bulk blast). Each send is independently retried/rate-limited.
- Provider: Lovable Emails (no Resend account needed; no API key to manage).
- Sender: `notify@notify.flowersos.co` (or chosen subdomain).
- Idempotency key per (announcement, student) prevents duplicate emails on retries.
- Unsubscribe tokens are per-email-address (system-managed); when a student unsubscribes, all future announcement emails to them are blocked automatically.
- Existing `student_email_links.unsubscribed_at` will be set by the unsubscribe handler so the audience query naturally excludes them next time.

### Out of scope (suggested but optional)

- Re-send to failed recipients (manual retry button) — can add later
- Scheduled send (publish now, email later) — can add later
- Per-batch targeting (e.g. only Batch 12) — currently "all SAT students with linked email"
