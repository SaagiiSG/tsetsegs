# Security Fix Plan

## Context

Almost every finding traces back to one root cause: students authenticate via a localStorage session, not Supabase Auth. RLS can't read localStorage, so policies that try to scope by `x-student-phone` header silently evaluate to NULL and the permissive `USING(true)` fallback takes over. The platform is admin-gated (students only exist if an admin adds their phone), so some "public" access is intentional — but several tables truly leak data or accept forged writes.

I propose three phases. Phase 1 is safe and I'll do it as soon as you approve. Phase 2 is the real architectural fix. Phase 3 is cleanup.

---

## Phase 1 — Safe fixes (low risk, no app code changes)

1. **`teachers.password_hash` leak** — current policy lets any authenticated user read it. Replace the broad SELECT policy with: admins read all columns; teachers read only their own row's non-sensitive columns; nobody else reads `password_hash`.
2. **`booking_bans` public INSERT** — restrict INSERT to admin/teacher roles only (matches actual usage — bans are staff actions).
3. **`student_accounts` public INSERT** — add `WITH CHECK` requiring the phone to exist in `public.students` (already the intended enrollment rule, just not enforced).
4. **Function `search_path` mutable** — set `SET search_path = public` on the handful of functions flagged by the linter.
5. **`SECURITY DEFINER` view** — identify the offending view and convert to `SECURITY INVOKER` (or drop if unused).
6. **`SECURITY DEFINER` functions executable by anon/authenticated** — `REVOKE EXECUTE ... FROM anon, authenticated` on functions that should only run from triggers/edge functions (e.g. `hash_student_password`, `verify_student_password`, `_post_edge_function`, `move_to_dlq`, `enqueue_email`, `delete_email`, `read_email_batch`).
7. **`password_reset_codes`** — add an explicit "no public INSERT/SELECT" policy (deny-all to anon/authenticated; service_role only).
8. **`students` in Realtime publication** — remove from `supabase_realtime` publication so phone/parent_phone don't broadcast. Confirm with you first that no UI subscribes to it (I'll grep before running).
9. **`realtime.messages`** — add a baseline policy: only authenticated admin/teacher roles can subscribe; students get blocked at the realtime layer (their channel subscriptions today go through anon and would break — see note in Phase 2).

## Phase 2 — Student session-header architecture (the real fix)

This is the change the scanner is really asking for. It's risky because it touches every student-side query.

**DB side**
- Create `public.current_student_account_id()` SECURITY DEFINER function that reads `request.headers ->> 'x-session-id'`, validates against `student_sessions` (active + not expired), returns the `student_account_id`.
- Rewrite ownership policies on: `student_accounts`, `student_sessions`, `student_attempts`, `student_badges`, `student_sprint_rankings`, `seat_bookings`, `bluebook_attempts`, `bluebook_answers`, `point_transactions`, `featured_badges`, `student_activity_logs`, `student_question_notes`, `practice_tests`, `students`.
- Pattern: `USING (student_account_id = public.current_student_account_id())` for SELECT/UPDATE/DELETE; same in `WITH CHECK` for INSERT. Keep separate admin/teacher policies via `has_role`.

**Client side**
- Modify `src/integrations/supabase/client.ts` to inject `x-session-id` header from `localStorage.getItem('student_session_id')` on every request. (You marked this file off-limits — I'd need your OK to touch it, or we add a second client wrapper for student calls.)
- Audit every student page to make sure the session id is set before the first query.

**Rollout safety**
- Stage in three batches: writes-only tables first (point_transactions, student_badges, sprint_rankings), then read-restricted (attempts, activity_logs, practice_tests), then identity tables (student_accounts, students) last.
- Keep the permissive policy alongside the new one for 24h with logging, then drop.

## Phase 3 — Accepted-risk documentation

- Update `mem://security/...` to record:
  - `ngee_bookings` public INSERT is intentional (public QR booking).
  - `feature_flags` public read is intentional.
  - No rate limiting on student-login per project directive (`no-backend-rate-limiting`).
- Mark the corresponding scanner findings as ignored with explanations.

---

## What I need from you

1. **Approve Phase 1** — I'll write a single migration with items 1–7, plus a second migration for items 8–9 after I grep the codebase for realtime usage of `students` / student channels.
2. **Decide on Phase 2 timing** — do it now (I'll need permission to touch `client.ts`), schedule it for a dedicated session, or defer.
3. **Confirm Phase 3 intentional items** — anything on that list you want enforced instead of accepted?

Reply with which phases to proceed with and I'll start.
