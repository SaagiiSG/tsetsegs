# Plan: SAT-only practice + dual-batch login fix + SMS password reset

## 1. Restrict `/practice/*` to SAT students

**Problem**: Right now every logged-in student can reach the practice section, including pure IELTS students. Practice is SAT-only content.

**How student → course is determined**
- A student account links to one or more `students` rows (via phone). Each `students` row has a `batch_id` → `batches.course_type` (`'SAT'` or `'IELTS'`).
- `StudentAuthContext` already loads both: `student.linked_student` (the singular primary) and `student.linked_students[]` (all matching phone records).

**Implementation**
1. Add a small helper hook `useStudentCourses()` that:
   - Reads `student.linked_students[]`.
   - Joins each to its `batches.course_type`.
   - Returns `{ hasSAT, hasIELTS, isSATOnly, isIELTSOnly, isBoth, loading }`.
2. In `StudentLayout.tsx` (the wrapper that mounts all `/practice/*` pages), after auth resolves:
   - If `!hasSAT` and viewer is not a teacher/admin → render a friendly "Practice section is SAT-only" screen with a link back to a safe landing route, or redirect to `/student/dashboard` (or wherever IELTS students belong).
3. Sidebar (`StudentDashboardSidebar`) and bottom nav (`StudentBottomNav`): hide "Practice", "Speed", "Smart Practice", "Vocabulary", "Bluebook", "Leaderboard", etc. — anything SAT-specific — when `!hasSAT`. Keep universal items (Profile, Booking, Bug report).
4. Optional defense in depth: gate the routes themselves in `App.tsx` so a direct URL hit also redirects.

## 2. Dual-enrolled student can't log in as SAT

**Root cause** (verified in DB and code):

- Many students appear twice in `students` — one SAT row, one IELTS row (sample: Gangamurun, Namuun, Gunjinlkham, Tugsbayar, Bulgantamir, Tuguldur, Tenuunjargal, all on Enguun's SAT class + a later IELTS bulk add on 2026-04-14).
- DB trigger `link_student_account_by_phone()` picks the **most recently created** record:
  ```sql
  ORDER BY created_at DESC LIMIT 1
  ```
  Because the IELTS bulk-add ran later, `student_accounts.linked_student_id` points at the **IELTS row** for all dual students. So when they log in:
  - `student.linked_student.batch_id` → IELTS batch
  - Practice / dashboard widgets that read from the singular `linked_student` think the user is IELTS
  - With the new SAT-only gate from §1, they'd be locked out of practice entirely
- Login itself works, but the wrong identity is being used.

**Fix**
1. **Update the trigger** `link_student_account_by_phone()` to prefer SAT over IELTS when a phone has multiple records:
   ```sql
   SELECT s.id INTO NEW.linked_student_id
   FROM public.students s
   JOIN public.batches b ON b.id = s.batch_id
   WHERE s.phone = NEW.phone_number
      OR s.phone = REPLACE(NEW.phone_number, '-', '')
      OR REPLACE(s.phone, '-', '') = NEW.phone_number
   ORDER BY
     CASE WHEN b.course_type = 'SAT' THEN 0 ELSE 1 END,
     s.created_at DESC
   LIMIT 1;
   ```
2. **One-time backfill** for already-linked accounts: for every `student_accounts` row whose current `linked_student_id` points to an IELTS batch but whose phone also has a SAT batch, re-point to the SAT row.
3. **Client safety net** in `StudentAuthContext.checkExistingSession` and `completeLogin`: when building `linked_student`, if `linked_students[]` contains a SAT row, prefer it over an IELTS row. This means the fix takes effect on next page load even before the backfill propagates.
4. **`checkPhone`** currently does `.limit(1)` with no ordering on the existence check — fine for "does this phone exist", no change needed there.

After this, dual-enrolled students log in, see SAT context, and reach `/practice/*` normally. IELTS-only students get the polite SAT-only message.

## 3. Forgot password via Twilio SMS

**Reconnect Twilio** first (user already asked). Twilio is still in the workspace as `Saran-Ochir's Twilio` — just needs re-linking.

**Flow**
1. On the login screen (`/login`, student tab), add a "Forgot password?" link visible on the password step.
2. Click → enter phone (pre-filled if already typed) → tap **Send SMS code**.
3. Edge function `request-password-reset`:
   - Validates phone exists in `students`.
   - Generates 6-digit numeric OTP.
   - Stores hash + expiry (10 min) + attempt counter in a new `password_reset_codes` table keyed by `student_account_id`.
   - Sends SMS via Twilio Messaging Service (Mongolia: alphanumeric sender `Tsetsegs` for Mobicom, long code falls back automatically) using the gateway pattern.
   - Rate-limit: max 3 requests / phone / hour to prevent SMS pumping.
4. UI shows OTP input + new password input.
5. Edge function `verify-password-reset`:
   - Looks up the code row, checks expiry + attempts (≤5).
   - Verifies OTP hash.
   - Calls `hash_student_password` and updates `student_accounts.password_hash`, clears `registered_device_id` + `device_registered_at` so the new password setup also resets device lock (matches existing first-login behavior).
   - Marks code row consumed.
6. User is bounced back to password step and logs in with the new password.

**Reused vs new**
- Reuses existing `hash_student_password` SQL function.
- New table: `password_reset_codes (id, student_account_id, code_hash, expires_at, attempts, consumed_at, created_at)` with RLS denying all client access (only edge functions touch it via service role).
- New edge functions: `request-password-reset`, `verify-password-reset`. Both `verify_jwt = false` since the user is not authenticated yet.
- New secret needed: none beyond Twilio (`TWILIO_API_KEY` from connector, `TWILIO_FROM_NUMBER` / `TWILIO_MESSAGING_SERVICE_SID` already present).

**SMS body (Mongolian)**: `Tsetsegs нууц үг сэргээх код: {code}. 10 минутын дотор ашиглана уу.`

## Technical notes

- All practice gating uses `course_type` from `batches`, never anything stored on `students` directly.
- Teacher/admin impersonation must bypass the SAT-only gate (already the existing pattern in `StudentLayout`: `isTeacherOrAdmin` short-circuits).
- The trigger update needs a migration; backfill is a one-shot UPDATE in the same migration.
- No changes to the `student_accounts.linked_students[]` semantics — it stays "all phone matches".
- Twilio reconnect is a single `standard_connectors--connect` call; user will pick the existing connection in the prompt.

## Open question

For IELTS-only students who currently land on `/practice` from the old default redirect, where should I send them — `/student/dashboard` (IELTS-friendly), `/student/booking`, or a dedicated "Coming soon for IELTS" page?
