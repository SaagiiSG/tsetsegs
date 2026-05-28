
## 1. Password reset SMS via Twilio Alphanumeric Sender ("name service")

The `request-password-reset` function already supports `MessagingServiceSid`. Changes:

- Force the Messaging Service path. Drop the `TWILIO_FROM_NUMBER` fallback so SMS always goes through the Messaging Service that carries the alphanumeric sender (e.g. "Tsetsegs"). If `TWILIO_MESSAGING_SERVICE_SID` is missing, return a clear error instead of silently using a phone number.
- Confirm the `TWILIO_MESSAGING_SERVICE_SID` secret points to a Messaging Service that has the Alphanumeric Sender ID "Tsetsegs" attached on Twilio's side. (Configured in Twilio Console — no code change needed there, but I'll surface a note in chat for you to verify once.)
- Same flow otherwise: 6-digit OTP, 10-min expiry, 3/hour rate limit.

> Note: Mongolia (+976) supports alphanumeric sender IDs without pre-registration, so this should "just work" once the Messaging Service SID is correct.

## 2. Google OAuth email capture (prompted at first login)

- Enable Google as a social provider via `configure_social_auth(["google"])`. Phone/password stays the primary student auth — Google is only used to **link an email address** to the student account, not as a sign-in method.
- New table `student_email_links` (student_account_id, email, google_sub, linked_at). RLS: student can read/insert their own; admins read all.
- New edge function `link-google-email` that takes the Google OAuth token (returned by `lovable.auth.signInWithOAuth("google")`), verifies it server-side, and upserts into `student_email_links` for the current student account.
- First-login UX: after a student logs in for the first time, show a one-time `LinkEmailModal` ("Connect your email so we can send class announcements"). Two buttons: "Connect with Google" / "Skip for now". Skipping sets a `dismissed_email_prompt_at` flag on `student_accounts` so we don't re-prompt every login (but it stays re-linkable from Settings).
- Settings page gets a new "Connected email" row so they can link/unlink later.

## 3. Announcements (sidebar inbox + email blast)

**Data**
- New table `announcements` (id, title, body, created_by, created_at, audience: 'all' | 'batch' | 'tier', audience_value, send_email bool).
- New table `announcement_reads` (announcement_id, student_account_id, read_at) for unread counts.

**Admin**
- New admin page `/admin/announcements` to compose, target (all / batch / tier), preview, and publish. Toggle "Also email students with connected emails".

**Student**
- New sidebar item `Announcements` (Megaphone icon) above Settings with an unread-count badge.
- New route `/practice/announcements` showing a list of cards (newest first) with read/unread state. Clicking marks read.

**Email blast**
- New edge function `send-announcement-emails` triggered when admin publishes with `send_email=true`. Pulls all students in the target audience who have `student_email_links.email`, then sends via Lovable Emails.
- Since the project doesn't have an email sender configured yet, first step is the **email domain setup dialog** so emails come from your own brand.

## 4. 44-question rank unlock ("calibration")

**Concept**: New students start in a "Calibration" state (not in any tier/group). They must answer **44 questions** before they get placed into a tier and appear on the leaderboard.

**Data**
- Add column `student_accounts.rank_unlocked_at timestamptz` (nullable). Set the first time `solved >= 44`.
- Helper `getCalibrationProgress(studentAccountId)` returning `{ solved, required: 44, unlocked: bool }`, counting distinct questions attempted post-onboarding (using existing attempt tables).

**Enrollment logic change** (`src/lib/sprintEnrollment.ts`)
- `ensureSprintEnrollment` only inserts a `student_sprint_rankings` row once `rank_unlocked_at IS NOT NULL`. Before that, the student practices freely but isn't on the leaderboard.
- After unlock: first sprint enrollment uses a calibration → tier assignment based on the 44-question accuracy. Default proposal (open to change): ≥85% → Silver, ≥70% → Bronze, else Iron/Unranked starting in Bronze.

**UI**
- Leaderboard page shows a "Calibration in progress: 27 / 44 problems" progress bar with framing like "Unlock your rank" instead of an empty rank row.
- Practice dashboard shows the same progress in a hero strip until unlocked.

## 5. Score prediction gated on rank unlock

- `useScorePrediction` / `ScorePredictionCard` / `AdminScorePrediction` / `InlineScorePrediction` early-return a "Locked" state when `rank_unlocked_at IS NULL`.
- Locked card UI: "🔒 Predicted SAT score unlocks after 44 calibration problems — currently 27/44" with a progress bar. Teacher/admin views show the same locked state for that student so they know why no prediction is showing.
- No change to the underlying algorithm itself — just the gate.

---

### Order of execution
After approval, build order (each independently shippable):
1. SMS alpha sender (smallest, biggest reliability win)
2. 44-question calibration + prediction gate
3. Google OAuth email link + first-login modal
4. Announcements (admin + student inbox + email blast — needs email domain setup first)

### Open questions
- **(a)** Calibration tier mapping: default everyone to Bronze on first enrollment, or grade them based on calibration accuracy?
- **(b)** Announcements audience: do you need batch-level and tier-level targeting on day one, or is "all students" enough for v1?
