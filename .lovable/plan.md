# Solo sign-up (Google, Apple, Microsoft, email) + Google connect for existing students

## What students will see
1. **Sign-up / sign-in buttons**: "Continue with Google", "Continue with Apple", "Continue with Microsoft", and email + password. Shown in the Start free pop-up and on the sign-in page (Mongolian/English).
2. **New solo students** land straight in the solo student portal (same look as the customer student portal). Free: practice sets, speed mode, review mistakes, analytics, leaderboard, badges, SAT simulation.
   Locked with a "Premium" badge: concept videos and (later) study planner. Pressing them shows an upgrade card; payment itself is not wired yet.
3. **Existing students** (added by admin with phone number): after they sign in as usual, a banner + one-time pop-up asks them to **Connect Google**. Connecting only links the account; they keep signing in the same way.
4. **Forgot password** on the sign-in page: student enters phone, then confirms with their connected Google account, then sets a new password. Students without a connected Google keep the current "ask admin" flow.
5. **Admin**: student list shows "Google connected" status and a count of who still hasn't connected.

## Order
1. Sign-in methods on, sign-up screens, solo account records with free/premium plan.
2. Solo portal shell reusing the customer student pages, with premium locks.
3. Google connect for existing students + banner/pop-up + admin status.
4. Forgot password through Google.
5. Checks in both languages, phone and desktop.

## Open questions (can be answered later)
- Price and payment method for premium (Stripe/Paddle, or QPay/bank transfer recorded by admin?). Until then, premium is switched on by an admin.
- Solo students are kept separate from class leaderboards (their own solo league) unless you say otherwise.

## Technical details
- Enable email auth + managed Google/Apple/Microsoft via `lovable.auth.signInWithOAuth`; redirect to `window.location.origin` and route after session.
- New `solo_students` table (user_id, name, plan free|premium, premium_until), RLS own-row; premium only settable by admins/server.
- Solo practice data in its own tables (mirrors tenant attempt model, intl bank), so main/center data never mixes.
- Existing students: `student_identity_links` (student_id, auth user_id, provider, email) written by a server function that verifies both the `x-student-token` and the Google session.
- Password reset server function: requires Google session whose user_id is linked to the phone's student, then updates `student_credentials` hash; rate-limited.
- AGENTS.md rule for the separation; tests for plan gating and reset eligibility.
