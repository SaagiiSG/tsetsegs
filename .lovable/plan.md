## Goal

Move the 505 student accounts off the custom phone-password + localStorage session system onto **Supabase Auth (phone + password)**, keep the "must be enrolled" gate, and rewrite every student-scoped RLS policy to use `auth.uid()`. This is the single change that resolves ~15 of the open security findings (public reads/writes on student tables, broken `x-student-phone` policies, public session-token table, realtime PII broadcast, revoked password RPCs).

Admin & teacher logins are untouched.

---

## User-facing changes

- **Students keep logging in the same way** — phone number + their existing password. No password reset required for the 505 existing students; their current bcrypt hashes are imported into Supabase Auth.
- **New signup** is blocked unless their phone is already in the `students` table (admin-enrolled). Unknown phones get a clear "not enrolled" message.
- **Password reset** flow keeps working (Twilio SMS OTP), but on the backend it now updates the Supabase Auth password instead of the old `password_hash` column.
- **Single-active-session and 90-day device lock are preserved.** The `student_sessions` table stays, but only for device tracking — identity now comes from Supabase Auth.
- **Admins and teachers**: nothing changes. They still log in with email/username.

---

## Phases

### Phase 1 — Schema bridge (migration, reversible, no behavior change yet)
- Add `student_accounts.auth_user_id uuid unique` (nullable for now).
- Create `public.current_student_account_id()` — SECURITY DEFINER, returns the `student_accounts.id` whose `auth_user_id = auth.uid()`. This becomes the new RLS predicate.
- Add an `is_enrolled_phone(phone text)` helper that looks up `students.phone` (normalized) for the signup gate.

### Phase 2 — Backfill existing students into Supabase Auth
- One-shot admin-only edge function `migrate-students-to-auth`:
  - Loops over every `student_accounts` row.
  - Calls `supabase.auth.admin.createUser({ phone, password_hash: <existing bcrypt>, phone_confirm: true })` — Supabase Auth accepts raw bcrypt imports, so students keep their current password.
  - Writes the new `auth.users.id` back into `student_accounts.auth_user_id`.
  - Idempotent: skips rows already linked.
- Run it once, verify count = 505, then leave it deployed for future re-runs.

### Phase 3 — New auth surface
- **Login (`StudentAuthContext.loginWithPassword`)**: replace the `verify_student_password` RPC with `supabase.auth.signInWithPassword({ phone, password })`. Single-session enforcement runs after a successful Supabase signin (invalidate other rows in `student_sessions`).
- **Signup (registration page)**: replace the direct insert into `student_accounts` with a new edge function `student-signup`:
  1. Validate the phone is in `students` (the enrollment gate).
  2. Validate password strength (existing 8-char complex rule).
  3. Call `auth.admin.createUser({ phone, password, phone_confirm: true })`.
  4. Insert/link a `student_accounts` row with `auth_user_id` set.
- **Password change (`PasswordChangeCard`)**: replace `hash_student_password` RPC with `supabase.auth.updateUser({ password })`.
- **Password reset (`verify-password-reset` edge function)**: keep the Twilio OTP flow, but the final step calls `auth.admin.updateUserById(authUserId, { password })` instead of writing to `password_hash`.

### Phase 4 — RLS rewrite (the security fix)
Tables that get rewritten to `student_account_id = current_student_account_id()` (with `service_role`-only insert paths where appropriate):

| Table | New policy summary |
|---|---|
| `student_accounts` | SELECT: own row only. UPDATE: own row only. INSERT/DELETE: service_role only. |
| `student_sessions` | SELECT/UPDATE: own rows only. INSERT: own user only. |
| `students` | SELECT: own row OR teacher/admin. **Public phone-lookup policy dropped.** |
| `student_attempts`, `student_question_notes`, `student_badges`, `featured_badges`, `student_sprint_rankings`, `seat_bookings`, `bluebook_attempts`, `bluebook_answers`, `point_transactions`, `student_activity_logs`, `practice_tests` | SELECT/INSERT/UPDATE scoped to owner via `current_student_account_id()`. Teachers/admins keep read via `has_role`. |
| `realtime.messages` / publication | Remove `students` from realtime publication to stop broadcasting `phone` / `parent_phone`. |

All policies use the security-definer helper to avoid recursion.

### Phase 5 — Decommission
- Drop the `x-student-phone` / `x-unique-link-id` header-based policies (they were dead code).
- Revoke and drop unused `hash_student_password` / `verify_student_password` RPCs (already revoked; this just removes them).
- Mark the related security findings as fixed and rescan.

---

## Risks & mitigations

- **Bcrypt import** — Supabase Auth's admin API accepts pre-hashed bcrypt passwords, so existing students log in with no friction. Verified with a single test account before bulk run.
- **Phone normalization** — `students.phone` has mixed formats (`+976…`, `976…`, dashes). The migration normalizes everything to E.164 (`+976XXXXXXXX`) before calling Supabase Auth, matching what `normalizePhone()` already does in `request-password-reset`.
- **Cutover** — Phases 1–3 ship together behind a feature flag. The old login path stays available for one deploy as fallback. Once the 505 backfill is confirmed and a few real students log in successfully, Phase 4 (RLS rewrite) goes out.
- **Single-session enforcement** — Supabase Auth allows multiple sessions by default. We keep the existing `student_sessions` table + the existing "kick other devices" logic; it just now keys off `auth.uid()` instead of phone.
- **Teachers/admins viewing student data** — All new RLS policies include `OR has_role(auth.uid(), 'teacher')` / `'admin'` so the staff dashboards keep working.

---

## What this does NOT fix (separate follow-ups)

- **Supabase linter warnings**: `function_search_path_mutable`, `security_definer_function_executable`, `public_bucket_allows_listing`, `rls_enabled_no_policy`. These are unrelated to student auth and get a small cleanup migration after.
- **Realtime RLS on `realtime.messages`** — covered partially (we stop broadcasting `students`), but full per-topic auth on the realtime channel is a separate task.

---

## Technical notes

- New helper:
  ```sql
  create or replace function public.current_student_account_id()
  returns uuid language sql stable security definer set search_path = public as $$
    select id from public.student_accounts where auth_user_id = auth.uid() limit 1;
  $$;
  ```
- Bcrypt import call:
  ```ts
  await supabaseAdmin.auth.admin.createUser({
    phone: normalizePhone(row.phone_number),
    password_hash: row.password_hash, // raw $2a$/$2b$ bcrypt
    phone_confirm: true,
  });
  ```
- Client login change:
  ```ts
  const { data, error } = await supabase.auth.signInWithPassword({
    phone: normalizePhone(input),
    password,
  });
  ```
- No new secrets. Existing Twilio config is reused only for password reset; normal phone+password login does not send SMS.
