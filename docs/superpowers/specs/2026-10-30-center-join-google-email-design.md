# Center join sign-up: step by step, verified email, Google

Date: 30 Oct 2026. Branch: `feat/center-admin-batches` (center admin session). Piece 2 of Saagii's center admin list.

## Why

International centers start paying soon (Web Summit 9–12 Nov). A student who scans a batch's QR code or opens its join link fills one long form today. Saagii wants:

- that sign-up to be a sequence, one question per screen, like the student onboarding;
- a real email for every student, so piece 3 (announcement emails) can reach them;
- Google on every student account: students sign in with Google rather than remembering a password, and Google gives us a checked email.

His words: "the step by step registration is for the student who signed up with batch's join link/qr"; Google is for both sign-in and a real email; existing students "can do connect later but it is required"; a typed email needs "some kind of verification like 6 digit code".

## What exists today (read before building)

- `src/portal/CenterJoin.tsx`: one form (name, phone, optional email, school, grade, password) → `tenant-accounts` action `register` → creates `tenant_students` + an auth user with the hidden login email `s-<student id>@students.flowersos.co` and the chosen password, enrolls in the batch, signs in, goes to `/student`. Email/school/grade are only written to `tenant_registrations` (an old log).
- `src/portal/CenterSignIn.tsx`: student tab = phone → `student_lookup` → password (or "create a password" for admin-added students who never signed up, `student_activate`).
- `src/portal/CenterPortalApp.tsx`: role = the `tenant_students` row whose `user_id` is the signed-in user. Many RLS policies and `tenant_my_student_id()` also map a student by `user_id = auth.uid()` (0002, 0003, 0088's bank lock). **Design rule: a student keeps exactly one auth user in `user_id`; nothing else changes how a student is found.**
- After `/student`, the student side's 7-step onboarding (`CenterOnboarding.tsx`) runs for new students.
- Google sign-in: `lovable.auth.signInWithOAuth('google', { redirect_uri })` (`src/integrations/lovable/index.ts`). Outside an iframe it does a full-page redirect through `/~oauth/initiate` on the same origin, so it only works on the published site (each center subdomain is a Lovable-connected domain). Main students' pattern for finishing after the redirect: `src/lib/studentEmailLinking.ts` + `LinkEmailModal.tsx`.
- Email sending: `supabase/functions/_shared/transactional-email-templates/send-email.ts` (`sendTemplateEmail(name, to, { templateData })`) + `registry.ts`; sender `notify.flowersos.co`.
- Supabase sign-ups must stay ON (a Google first sign-in creates the auth user).

## What gets built

### 1. Join sequence (`/join/:code`), one question per screen

Visual style follows `CenterOnboarding` (same type scale, one title per screen, Continue/Back, progress). Center logo and batch name on the first screen.

1. **Join *batch*** — "Continue with Google" (primary) or "Use my email instead".
2. Google path (after the redirect back to `/join/:code`, signed in as the Google user):
   name (pre-filled from Google) → phone → school and grade (optional, Skip) → done.
   Finishes with RPC `tenant_join_with_google` (below). Email = the Google email (verified).
3. Email path: name → phone → email → **6-digit code** sent to that email, typed in → create a password → school and grade (optional) → done.
   Finishes with `tenant-accounts` `register`, which now requires a valid code for that email.
4. Done → `/student` → the existing onboarding.

Errors stay friendly and specific (phone already registered → "sign in instead" with a link; bad code; code expired; too many tries).

### 2. Google on the sign-in page

Student tab gets **Continue with Google** above the phone field. After Google returns, `CenterPortalApp` finds the student by `user_id` as today. A Google account not tied to a student here shows the existing "signed in without access" screen with: "This Google account isn't connected to a student at *center*. Sign in with your phone number, then connect Google."

`student_lookup` returns `google: true` when the student's account is a Google account; the phone flow then shows "This account signs in with Google" + the Google button instead of a password box.

Admin-added students who never signed up (`user_id` null): after the phone step offers "Continue with Google" next to "Create a password". After the redirect, RPC `tenant_claim_with_google(_slug, _phone)` ties the Google user to that student if `user_id` is still null — the same trust as today's phone activation.

### 3. Connecting Google later (existing students), required

A student whose row has no `google_email` and no `email_verified_at` (Google OR a verified email turns the gate off) sees a **Connect Google** screen before the portal (wrapper around the `/student/*` route in `CenterPortalApp`, not inside `CenterStudentPortal`, which is the student session's file).

- Until `google_due_on`: "Connect Google" or "Later (N days left)". Later hides it for this browser session.
- From `google_due_on` on: only "Connect Google" and "Sign out".
- `google_due_on` defaults to 7 days after the migration for existing students and 7 days after joining for email-path students; Google-path students are connected from the start.

Connect flow (the student is signed in with phone + password):

1. RPC `tenant_google_link_start(_institution)` (as that user) → returns a one-time token (stored hashed with student id, the caller's uid, 10-minute expiry). Token kept in `sessionStorage`.
2. Google redirect, back to `/student?google_link=1`, now signed in as the Google user.
3. RPC `tenant_google_link_finish(_token)` (as the Google user): checks the token, that it isn't expired, that the student's `user_id` is still the uid that started it, and that this Google user isn't already a student or staff member in this center → sets `user_id` = `google_user_id` = Google user, `google_email` = Google email, `email` = the Google email if `email` is empty, deletes the token.
4. From then on the student signs in with Google; the old password user is left unused (phone lookup now says "signs in with Google").

### 4. Admin (Student Management)

- Email column; Google column ("Connected" / "Due *date*").
- Stat tile "Not connected to Google" (replaces "Not signed up yet" in the 4-tile row, matching the main page).
- Reset password hidden for Google accounts.
- **Give more time** (student page): `google_due_on` = later of today and the current date, plus 7 days.
- **Switch to phone sign-in** (student page, Google accounts only): for a student who can't use Google (wrong account, lost account, school account blocks outside apps, Google blocked in their country). Sets `user_id` to null so the student creates a new password with their phone (the existing "create a password" step). **Keeps `email` and `google_email`** (Saagii, 30 Oct: "no disconnect google cuz center might want to send notif via email"), so the gate stays off and announcement emails still reach them. They can connect a Google account again later from the gate's connect flow, which replaces `google_email`.
- To tell "signs in with Google" from "connected but signs in with phone", the row also stores `google_user_id` (the Google auth user that was connected). Signs in with Google = `user_id = google_user_id`. `student_lookup`'s `google` flag uses that, not `google_email`.

## Data (migration 0107)

- `tenant_students`: `email text`, `google_email text`, `google_user_id uuid`, `google_due_on date DEFAULT (current_date + 7)`.
- `tenant_email_codes`: email, center, code hash, expires_at (10 min), attempts, created_at. Service role only (written by the `tenant-accounts` function).
- `tenant_google_links`: token hash, student id, started_by uid, expires_at. No direct grants; only the two RPCs touch it.
- RPCs, all `SECURITY DEFINER`, `search_path = public`, granted to `authenticated` only:
  - `tenant_join_with_google(_slug, _code, _name, _phone, _school, _grade)`: center enabled and not blocked; class by code; name ≥ 2; phone 6–15 digits; caller has an email in the JWT; caller isn't already a student or staff member of the center; phone not used by a student with an account (a phone held by an admin-added student with `user_id` null is claimed instead); same 200-per-hour cap as `register`; inserts the student (`user_id` = `google_user_id` = caller, `email` = `google_email` = JWT email) and a `tenant_registrations` row (approved).
  - `tenant_claim_with_google(_slug, _phone)`, `tenant_google_link_start(_institution)`, `tenant_google_link_finish(_token)` as above.
- Migration number 0107: 0103 (teacher), 0104/0105 (this branch) and 0106 (teacher's proctored tests) come first. Bring the branch up to date with origin/main and keep `_journal.json` in idx order before pushing.

## Server (`tenant-accounts`, Lovable must deploy)

- New public action `send_email_code` (slug, join code, email): valid center and batch; email shape; at most 1 code per email per 60 s and 5 per hour; 6 random digits, stored hashed; sends template `center-email-code` (new, in `transactional-email-templates`, registered in `registry.ts`; center name in the subject/body).
- `register`: email now required and must come with a matching, unexpired code (5 wrong tries kills the code); saves `email` on `tenant_students`; `google_due_on` = default.
- `student_lookup`: also returns `google: user_id = google_user_id` (signs in with Google).
- `reset_student` (existing admin reset) stays for password accounts; new staff actions or RPCs for Give more time and Switch to phone sign-in (center admin only).

## Settled after review (builder's calls, marked as such)

- **Join link for someone the center already has** (call): a phone that belongs to an admin-added student with no account is taken over by either path (Google or email). That student **keeps their current batch**; only a student with no batch takes the link's batch. A phone or Google account that already has an account in this center is refused with "You already have an account here. Sign in instead." No join link ever moves a student between batches.
- **Release gap** (call): the email path uses a new action `register_verified` (requires the code). The old `register` stays as it is so live QR codes keep working until the new page is published; a follow-up removes it.
- **Google redirect back during "connect later"** (call): `CenterPortalApp` runs `tenant_google_link_finish` when it sees the stored token, before it looks up the role, so `/student?google_link=1` doesn't bounce to `/`. Same for the join page and `tenant_claim_with_google`.

## Email instead of Google (Saagii, 31 Oct)

Saagii: "ask them if they are able to connect their google account if they are not then we will do email verification."

- New column `tenant_students.email_verified_at` (migration 0107, edited in place). `register_verified` sets it on insert and on takeover, so students who joined by email never see the connect screen.
- The connect screen first asks "Can you sign in with a Google account?". Yes runs the connect-Google flow above. No asks for an email, sends a 6-digit code, and takes the code. A match saves the email and `email_verified_at` on the student's row and the screen never comes back.
- Two `tenant-accounts` actions for a signed-in active student of the center (no staff role needed): `student_email_code` and `student_email_verify`. Same code rules as the join page: 6 digits, 10 minutes, 5 tries (the try is charged before the verdict), 1 send per 60 s and 5 per hour per email, 300 per center per hour, suppressed address gives a 400. Template `center-email-code`.
- "Later (N days left)" still lasts 7 days, then it is required. Google or a verified email both count as done.
- Student Management Google column: Connected, Phone sign-in, Email verified, "Due {Mon d}" (neither, due today or later), Not connected (fallback). Tile: "No Google or verified email". Give more time only shows when the student has neither.

## Non-goals

- No change to how `CenterStudentPortal` or RLS find a student.
- Main-site (Tsetsegs) auth, emails and students are untouched.
- No email verification for staff.
- Deleting the unused password user after a Google connect (harmless, can come later).

## Constraints

- Google can only be tested on the published site; Saagii will test it on `zz-signin-test.flowersos.co`. Everything else is tested locally (PGlite for the SQL, browser checks for the screens, the function logic by reading + a local Deno run if available).
- Order on release: Lovable applies 0104, 0105 and 0107 and deploys `tenant-accounts` **before** the new join page is published, or the join page's email path fails. Until then the old one-form join keeps working.
- shadcn components only; plain sixth-grade copy; no emoji; `Array.prototype.at` is not allowed (Lovable's preview).

## Left to the builder

Exact screen copy, the hashing scheme for codes and tokens (pgcrypto/sha256), rate-limit bookkeeping, how the join page remembers the steps across the Google redirect, and the email template's look (match `support-request.tsx`).

## Release steps

1. The teacher session pushes 0103 first. Then this branch is brought up to date with origin/main: `_journal.json` stays in `idx` order (0103, 0104, 0105, 0106, 0107) and the snapshot `prevId`s are re-pointed into one chain: 0104 → 0103, 0105 → 0104, 0106 → 0105, 0107 → 0106.

Steps 2–4 run right after the push, in one sitting. Until step 3 is done, nobody publishes (tell the teacher and live-demo sessions): the new join page, Google buttons and Start sprints need 0104/0105/0107 and the new function.

2. Before step 3, Saagii runs this on the live database (Lovable SQL editor or Supabase). It must return no rows, or the new unique index will fail:
   `SELECT institution_id, user_id, count(*) FROM tenant_students WHERE user_id IS NOT NULL GROUP BY 1,2 HAVING count(*) > 1;`
3. Lovable applies 0104, 0105 and 0107 and deploys the tenant-accounts function. Message to paste: "Apply these migration files exactly as written: drizzle/migrations/0104_center_schedule_templates.sql, drizzle/migrations/0105_center_sprint_seasons.sql, drizzle/migrations/0107_center_join_google_email.sql. Deploy supabase/functions/tenant-accounts. Do not touch 0103 or 0106. Don't change or apply anything else. Apply them in this order. Only if all three applied without errors, deploy supabase/functions/tenant-accounts. If any fails, stop and tell me. Do not create or apply any other migration file." If Lovable writes its own "apply_pending" copy, it must use a number after 0109 (0108 and 0109 belong to the live-demo session).
4. Publish.
5. Saagii tests Google on zz-signin-test.flowersos.co:
   - Join with Google from a ZZ Batch link.
   - Sign out, then sign in with Google.
   - With student 99000003, sign in by phone, see the connect screen, and connect Google.
   - In the admin, press "Switch to phone sign-in" on that student, then sign in by phone again.
6. After the new join page is live, a follow-up removes the old `register` action.
