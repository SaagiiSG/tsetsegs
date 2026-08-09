# Password reset via admin request (replace SMS)

Twilio SMS isn't delivering, so the student "Send SMS code" button becomes "Request reset from admin". Admins see the request in the Accounts page and approve it with one tap.

## Student side (`/portal` login → Reset Password)

- Keep the phone input, replace the button with **Request password reset**.
- On submit: if the phone belongs to an enrolled student account, create a pending reset request (silently succeed either way, so phone numbers can't be probed).
- Show a confirmation screen: "Request sent. An admin will unlock your account shortly — then sign in and set a new password." with a Back to sign-in button.
- The 6-digit OTP step is removed from this flow.
- Duplicate requests within the pending window just refresh the existing one instead of piling up.

## Admin side (Admin → Student Accounts)

- New **Reset requests** section at the top of the page, only visible when requests are pending, showing student name, phone, batch, and time requested.
- Each row gets **Approve reset** (clears the stored password so the student sets a new one at next login, same as today's Reset Password action) and **Dismiss**.
- A count badge appears next to the section header so it's noticeable when opening the page.
- Approving/dismissing marks who handled it and when.

## Technical notes

- New table `public.password_reset_requests`: `id`, `student_account_id`, `phone_number`, `status` (`pending` / `approved` / `dismissed`), `created_at`, `resolved_at`, `resolved_by`. GRANTs for `authenticated` + `service_role`, RLS enabled, admin/teacher-only read/update policies; no anon access.
- Request creation goes through the existing `request-password-reset` edge function (service role): it stops calling Twilio and instead upserts the pending request, keeping the generic-success response and the existing per-phone hourly rate limit.
- `verify-password-reset` and `password_reset_codes` stay in place, unused, so SMS can be re-enabled later without rework.
- Admin UI added to `src/components/admin/StudentAccountsManagement.tsx`, reusing its existing reset-password mutation for approval.
- Student UI changes stay inside `src/components/student/ForgotPasswordCard.tsx`.
