# Plan: Calibration Tier Grading + Google OAuth Email + Announcements

## 1. Calibration tier mapping (update existing logic)

Update `ensureSprintEnrollment.ts` so that when a student crosses the 44-question threshold and gets their first sprint enrollment, their starting tier is graded by calibration accuracy:

- Accuracy ≥ 70% → **silver**
- Accuracy ≥ 60% → **bronze**
- Accuracy < 60% → **bronze** (floor — we don't drop students into Iron at unlock)

Accuracy = correct attempts / total attempts across the first 44 distinct questions (using `student_attempts.is_correct`).

Add a small helper `getCalibrationAccuracy(studentAccountId)` next to `useCalibrationProgress`. Surface the resulting tier on the unlock celebration toast: "Calibration complete — you've been placed in Silver".

## 2. Google OAuth email capture (prompted at first login)

Goal: capture a real email for each student so we can send announcements, without changing the phone/password login.

### Backend
- Call `configure_social_auth(["google"])` to enable Google as a managed provider (keep email/password disabled — students still log in by phone).
- New migration:
  - `student_email_links` table: `student_account_id` (unique FK), `email` (citext, unique), `google_sub` text, `linked_at`, `unsubscribed_at` nullable.
  - GRANTs for authenticated + service_role; RLS so a student only sees their own link; admin/teacher can read all via `has_role`.
  - Add `email_link_prompted_at` on `student_accounts` so we only auto-prompt once.
- New edge function `link-google-email` (verify_jwt = false, called from client with the student session token): verifies the Google ID token returned by `lovable.auth.signInWithOAuth`, upserts into `student_email_links`, returns the linked email.

### Frontend
- `LinkEmailModal` component shown once after a student logs in via phone/password when `email_link_prompted_at IS NULL` AND no row in `student_email_links`. Two actions:
  - **Connect with Google** → `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/practice?link_email=1" })`. On return, call `link-google-email`, then stamp `email_link_prompted_at`.
  - **Skip for now** → just stamp `email_link_prompted_at` (so we don't nag every session — they can still link from Settings).
- Student **Settings** page: new "Connected email" row showing the linked email, with "Connect with Google" if not linked and "Disconnect" if linked.

## 3. Announcements (in-app inbox + email blast)

### Backend
- New migration:
  - `announcements` table: `title`, `body` (markdown), `audience` enum (`all` | `batch` | `tier`), `audience_batch_id` nullable FK, `audience_tier` text nullable (bronze/silver/…), `published_at` nullable, `created_by` uuid, `send_email` boolean default true.
  - `announcement_reads` table: `(announcement_id, student_account_id)` composite PK, `read_at`.
  - GRANTs + RLS:
    - Students: SELECT announcements where `published_at IS NOT NULL` and audience matches them; INSERT/SELECT own `announcement_reads`.
    - Admin/teacher: full CRUD via `has_role`.
- New edge function `send-announcement-emails`: takes `announcement_id`, resolves recipients (join `student_email_links` ↔ audience filter, exclude `unsubscribed_at`), enqueues via the existing email queue using `send-transactional-email`. Triggered when an admin publishes with `send_email = true`.

### Email infrastructure prerequisite
Email blast requires a sender domain. `flowersos.co` is the project's custom domain — we'll check `email_domain--check_email_domain_status` first. If none is configured, we'll surface the email-setup dialog before the announcement send path is wired live; the in-app inbox works without it.

### Frontend
- **Admin**: new page `/admin/announcements`:
  - List of past announcements (draft + published).
  - Composer: title, markdown body, audience selector (All / Specific batch / Specific tier), "Also send email" toggle, "Publish" button. Shows resolved recipient count before publish.
- **Student sidebar**: new "Announcements" item with unread badge (count of published-and-visible-to-me announcements where no `announcement_reads` row exists).
- **Student page** `/practice/announcements`: inbox list (newest first) + detail view that marks the announcement as read on open.

## Order of execution

1. Migration: calibration tier grading helper, `student_email_links`, `email_link_prompted_at`, `announcements`, `announcement_reads`.
2. Update `ensureSprintEnrollment` + unlock toast for tier grading.
3. Enable Google OAuth, build `link-google-email` function, `LinkEmailModal`, Settings row.
4. Build admin announcements page, student sidebar item + inbox page.
5. Check email domain status; if active, wire `send-announcement-emails`. If not, prompt the email-setup dialog and ship in-app inbox first.

## Open question

For announcements audience targeting, do you want **both** batch-level and tier-level filters on day one, or is "All students" enough for v1 (we can add batch/tier in a follow-up)?
