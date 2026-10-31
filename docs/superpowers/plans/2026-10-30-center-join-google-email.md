# Center Join: Steps, Verified Email, Google — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Students who open a batch's join link sign up one question per screen, with Google or a code-verified email; every student ends up with a saved email and, within 7 days, a Google login; center admins get "Give more time" and "Switch to phone sign-in".

**Architecture:** One migration (0107) adds email/Google columns, two private tables and six `SECURITY DEFINER` RPCs; the `tenant-accounts` edge function gains the 6-digit email code (new transactional template) and a verified register action; the React side adds a Google helper, a step-by-step join page, Google on sign-in, a gate before `/student`, and admin controls. A student always has exactly one auth user in `tenant_students.user_id` — nothing else changes how a student is found.

**Tech Stack:** React 18 + Vite + shadcn, Supabase (Postgres RLS, edge functions on Deno), `@lovable.dev/cloud-auth-js` for Google, `@lovable.dev/email-js` via `sendTemplateEmail`, Vitest, PGlite for SQL checks, headless Chrome over CDP for browser checks.

**Spec:** `docs/superpowers/specs/2026-10-30-center-join-google-email-design.md`

## Global Constraints

- Migration file `drizzle/migrations/0107_center_join_google_email.sql` + journal entry idx 107 + `meta/0107_snapshot.json` (copy 0102's empty snapshot, new uuid, `prevId` = 0105's id; 0106 belongs to the teacher session — re-point `prevId` when rebasing if 0106 has landed).
- All new RPCs: `LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'`, `REVOKE ALL … FROM PUBLIC, anon; GRANT EXECUTE … TO authenticated`.
- `user_id` stays the only way a student is found. "Signs in with Google" = `user_id IS NOT NULL AND user_id = google_user_id`. "Connected" (gate off) = `google_email IS NOT NULL`.
- Google sign-in = `lovable.auth.signInWithOAuth('google', { redirect_uri })`; it only works on the published site.
- Codes: 6 digits, 10-minute expiry, 5 wrong tries kill a code, at most 1 send per email per 60 s and 5 per hour. Link tokens: 10-minute expiry, single use.
- Old `register` action stays untouched (live QR codes keep working); the new page uses `register_verified`.
- shadcn only; plain sixth-grade copy; no emoji; never `Array.prototype.at`.
- Do not edit `src/portal/CenterStudentPortal.tsx` or `src/portal/centerContext.tsx` (other sessions' files).

## Review Focus

1. A student opens the join link inside Instagram/Messenger (Google blocked there): the email path must still work end to end — Task 4 tests the email path without Google.
2. The same phone joins twice (double tap, or second batch's QR): second attempt says "You already have an account here. Sign in instead." and creates nothing — Task 1 PGlite + Task 2 register_verified test.
3. A Google account that is already a student, teacher or admin in this center tries to join or connect: refused, nothing moves — Task 1 PGlite.
4. Code typed after 10 minutes, or 6th wrong try: clear message, new code needed — Task 2 unit tests.
5. Student returns from Google with no pending step (cancelled, back button): portal behaves as before, no error loop — Task 3 helper test.

---

### Task 1: Migration 0107 (columns, private tables, RPCs) with PGlite checks

**Files:**
- Create: `drizzle/migrations/0107_center_join_google_email.sql`, `drizzle/migrations/meta/0107_snapshot.json`
- Modify: `drizzle/migrations/meta/_journal.json` (append idx 107)
- Test: `flowersos/tools/portal-e2e/pg-0107.mjs` (outside the repo, Saagii21 workspace; run with the scratchpad PGlite install, stubs as in `pg/sprints.mjs`)

**Interfaces:**
- Produces columns on `tenant_students`: `email text`, `google_email text`, `google_user_id uuid`, `password_user_id uuid`, `google_due_on date NOT NULL DEFAULT (current_date + 7)`. Backfill `password_user_id = user_id` where `user_id IS NOT NULL`.
- Produces tables `tenant_email_codes(id, institution_id, email, code_hash text, expires_at timestamptz, attempts int default 0, created_at)` and `tenant_google_links(token_hash text primary key, student_id uuid, started_by uuid, expires_at timestamptz)`; RLS on, no grants to anon/authenticated.
- Produces RPCs (return `jsonb` `{ ok: true, ... }` or raise with the user-facing message):
  - `tenant_join_with_google(_slug text, _code text, _name text, _phone text, _school text, _grade text) → jsonb` (`{ok, student_id}`)
  - `tenant_claim_with_google(_slug text, _phone text) → jsonb`
  - `tenant_google_link_start(_institution uuid) → text` (raw token; only its sha256 hex is stored)
  - `tenant_google_link_finish(_token text) → jsonb`
  - `tenant_give_google_time(_student uuid) → date` (center admin only; `greatest(google_due_on, current_date) + 7`)
  - `tenant_switch_to_phone(_student uuid) → jsonb` (center admin only; only when signs in with Google; `user_id := password_user_id`, keeps `email`, `google_email`, `google_user_id`)

- [ ] **Step 1: Write `pg-0107.mjs` with these assertions** (each prints `true`/`FALSE`):
  - join_with_google: a signed-in user with JWT email `a@gmail.com` joins class code `JOIN1` → row with `user_id = google_user_id = caller`, `email = google_email = 'a@gmail.com'`, `class_id` = that class, `tenant_registrations` row status `approved`.
  - same caller joins again → raises `You already have an account here. Sign in instead.`
  - a staff member of the center calls it → raises the same message, no row.
  - phone used by a student who has an account → raises the same message.
  - phone of an admin-added student (`user_id` null, class B) via class A's code → that row now has `user_id` = caller, **class stays B**; no second row.
  - admin-added student with no class → takes the link's class.
  - name of 1 char → raises `Enter your full name.`; phone `12345` → raises `Enter a valid phone number.`; JWT without email → raises.
  - claim_with_google: unclaimed phone → `user_id` = caller, `google_user_id` = caller, `google_email` set; claimed phone → raises `This account already has a login. Sign in instead.`
  - link start as password user → token returned, row hashed (stored ≠ raw); link finish as another user G with the token → `user_id = google_user_id = G`, `google_email` set, `email` filled only if empty, token row gone; reuse token → raises `This link expired. Try again.`; expired token (expires_at in the past) → same; G already a student in the center → raises `That Google account is already used here.`
  - give_google_time as center admin → due date moves 7 days past the later of today and the old date; as teacher → raises `Not allowed`.
  - switch_to_phone on a Google-login student with `password_user_id` P → `user_id = P`, emails unchanged; on a phone-login student → raises `This student already signs in with their phone.`; Google-first student (no P) → `user_id` null.
  - anon cannot execute any of the six; authenticated cannot `SELECT` the two private tables.

- [ ] **Step 2: Run it against a stub-only schema to watch it fail**

Run: `node pg-0107.mjs` from the scratchpad `pg` folder. Expected: fails at the migration read (file missing).

- [ ] **Step 3: Write the migration** per the Interfaces block. `auth.jwt()->>'email'` gives the Google email (stub `auth.jwt()` in PGlite from a setting). Hash with `encode(sha256(convert_to(_token,'utf8')),'hex')`. Rate cap in `tenant_join_with_google`: same as `register` (more than 200 `tenant_registrations` for the center in the last hour → `Too many sign-ups right now. Please try again later.`). Center must be `portal_enabled` and `access_blocked_at IS NULL` (message as in `register`).

- [ ] **Step 4: Run the checks**

Run: `node pg-0107.mjs`. Expected: every line `true`.

- [ ] **Step 5: Commit** migration, snapshot, journal.

---

### Task 2: Email code + verified register in `tenant-accounts`, new email template

**Files:**
- Create: `supabase/functions/tenant-accounts/emailCode.ts`, `supabase/functions/_shared/transactional-email-templates/center-email-code.tsx`
- Modify: `supabase/functions/_shared/transactional-email-templates/registry.ts`, `supabase/functions/tenant-accounts/index.ts`
- Test: `src/lib/centerEmailCode.test.ts` (imports `../../supabase/functions/tenant-accounts/emailCode`, like `supportRequestEmail.test.ts`)

**Interfaces:**
- `emailCode.ts` (no Deno APIs; Web Crypto only):
  - `newCode(): string` — 6 digits, `crypto.getRandomValues`, zero-padded.
  - `hashCode(email: string, code: string): Promise<string>` — sha256 hex of `${email.toLowerCase()}:${code}`.
  - `canSend(sent: string[] /* ISO times, this email, last hour */, now: Date): { ok: true } | { ok: false; error: string }` — `Wait a minute before asking for another code.` / `Too many codes. Try again in an hour.`
  - `checkCode(row: { code_hash: string; expires_at: string; attempts: number } | null, typedHash: string, now: Date): 'ok' | 'expired' | 'wrong' | 'locked'`
  - `CODE_ERRORS: Record<'expired' | 'wrong' | 'locked', string>` — `That code expired. Ask for a new one.` / `That code is not right. Check the email and try again.` / `Too many wrong tries. Ask for a new code.`
- Template `center-email-code`: data `{ code: string; center_name: string }`, subject `` `${code} is your ${center_name} code` `` (center name stripped of line breaks), body: the code large, "It works for 10 minutes. If you didn't ask for it, ignore this email."
- `tenant-accounts` actions:
  - `send_email_code` `{ slug, code /* join code */, email }` → `{ ok: true }`; validates center + join code + email shape, `canSend` from `tenant_email_codes` rows, inserts hashed row, `sendTemplateEmail('center-email-code', email, { templateData })`.
  - `register_verified` `{ slug, code, name, phone, email, email_code, password, school, grade }` → `{ email: loginEmail }`; same rules as `register` plus `checkCode` on the newest code row for that email+center (wrong → `attempts + 1`), then the Task 1 takeover rule for admin-added phones (keep their class), sets `tenant_students.email` and `password_user_id`, deletes the used code.
  - `student_lookup` also returns `google: boolean` (`user_id IS NOT NULL AND user_id = google_user_id`).
  - `student_activate` and old `register` also set `password_user_id`.
  - `reset_student` also clears `password_user_id` when it deletes that user.

- [ ] **Step 1: Write failing tests** in `src/lib/centerEmailCode.test.ts`: `newCode` matches `/^\d{6}$/` over 200 draws; `hashCode('A@x.com','123456') === hashCode('a@x.com','123456')` and differs for another code; `canSend([], now).ok`; one send 30 s ago → wait error; five sends in the last hour → hour error; `checkCode(null, …) === 'expired'`; past `expires_at` → `'expired'`; `attempts: 5` → `'locked'`; wrong hash → `'wrong'`; match → `'ok'`.
- [ ] **Step 2: Run** `npx vitest run src/lib/centerEmailCode.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement `emailCode.ts`**, the template + registry entry, and the four action changes in `index.ts`.
- [ ] **Step 4: Run** the test → PASS; `npx tsc --noEmit -p tsconfig.app.json` shows nothing new. (No Deno locally: re-read `index.ts` changes against the action list above line by line.)
- [ ] **Step 5: Commit.**

---

### Task 3: Google helper and pending-step handling

**Files:**
- Create: `src/portal/centerGoogle.ts`, `src/portal/centerGoogle.test.ts`
- Modify: `src/portal/CenterPortalApp.tsx` (run `finishPendingGoogle` before the role lookup)

**Interfaces:**
- `type PendingGoogle = { kind: 'join'; code: string } | { kind: 'claim'; phone: string } | { kind: 'link'; token: string }`
- `savePending(p: PendingGoogle): void`, `takePending(): PendingGoogle | null` (sessionStorage key `center-google-pending`, removed on read, try/catch around storage).
- `startGoogle(p: PendingGoogle | null, returnPath: string): Promise<string | null>` — saves `p`, calls `lovable.auth.signInWithOAuth('google', { redirect_uri: origin + returnPath })`, returns an error message or null.
- `finishPendingGoogle(center: { id: string; slug: string }): Promise<string | null>` — if a `claim` or `link` is pending and a session exists, calls `tenant_claim_with_google` / `tenant_google_link_finish`; returns an error message or null. (`join` is finished by the join page itself, Task 4.)
- `CenterPortalApp`: when the session changes and `takePending()` returned claim/link, await `finishPendingGoogle` before querying the role; show the error on the sign-in page (existing `error` channel or a toast).

- [ ] **Step 1: Failing tests**: `savePending` then `takePending` returns it once and then `null`; broken storage (getItem throws) → `takePending()` is `null`, no throw; `finishPendingGoogle` with nothing pending → `null` and no RPC call (mock `supabase.rpc`).
- [ ] **Step 2: Run** `npx vitest run src/portal/centerGoogle.test.ts` → FAIL.
- [ ] **Step 3: Implement** helper + the `CenterPortalApp` hook-up.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit.**

---

### Task 4: Join page as a sequence

**Files:**
- Modify: `src/portal/CenterJoin.tsx` (rewrite body; keep `tenant_join_lookup`, `AuthSplitLayout`, center logo)
- Create: `src/portal/joinSteps.ts`, `src/portal/joinSteps.test.ts`

**Interfaces:**
- `joinSteps(path: 'google' | 'email'): JoinStep[]` with `JoinStep = 'start' | 'name' | 'phone' | 'email' | 'code' | 'password' | 'school' | 'done'`. Google: `start, name, phone, school, done`. Email: `start, name, phone, email, code, password, school, done`.
- `canContinue(step: JoinStep, form: JoinForm): boolean` where `JoinForm = { name: string; phone: string; email: string; emailCode: string; password: string; school: string; grade: string }` — name ≥ 2, phone 6–15 digits, email shape, code `/^\d{6}$/`, password ≥ 8 with a letter and a digit, school always true.
- Screens: one title per screen in the onboarding's type scale; Back on every step but `start`; `school` has Skip. `start`: "Continue with Google" (calls `startGoogle({ kind: 'join', code }, '/join/' + code)`) and "Use my email instead". After the Google return (session present + pending `join`): start at `name`, prefilled from `session.user.user_metadata.full_name`. `email` → Continue calls `send_email_code`, then `code` screen with "Send a new code". `school` → finish: Google path `tenant_join_with_google`, email path `register_verified` then `signInWithPassword`; both `navigate('/student', { replace: true })`. Errors show under the field; "already have an account" shows a "Sign in" link to `/`.

- [ ] **Step 1: Failing tests**: the two step lists exactly as above; `canContinue('phone', {…phone:'12345'})` false, `'99112233'` true; `canContinue('code', {emailCode:'12a456'})` false; `canContinue('password', {password:'abcdefgh'})` false, `'abcdefg1'` true; `canContinue('school', emptyForm)` true.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement** `joinSteps.ts` and the page. **Step 4: Run** → PASS; tsc clean.
- [ ] **Step 5: Commit.**

---

### Task 5: Google on the sign-in page

**Files:** Modify `src/portal/CenterSignIn.tsx`.

**Interfaces:** consumes `startGoogle`, `student_lookup`'s `google` flag.
- Student tab: "Continue with Google" above the phone field → `startGoogle(null, '/')`.
- After phone lookup: `google: true` → new stage `'google'` with "This account signs in with Google." and the Google button. Not activated → the existing create-password stage also shows "Or continue with Google" → `startGoogle({ kind: 'claim', phone }, '/')`.
- `signedInWithoutAccess`: copy becomes "This Google account isn't connected to a student at {center}. Sign in with your phone number, then connect Google." with Sign out.

- [ ] **Step 1:** Browser-check script `flowersos/tools/portal-e2e/join.mjs` (Task 8) covers this page; no unit test.
- [ ] **Step 2: Implement.** **Step 3:** tsc clean, `npx vitest run` all green. **Step 4: Commit.**

---

### Task 6: Connect-Google gate before the student portal

**Files:**
- Create: `src/portal/CenterGoogleGate.tsx`, `src/portal/googleGate.ts`, `src/portal/googleGate.test.ts`
- Modify: `src/portal/CenterPortalApp.tsx` (`/student/*` element becomes `<CenterGoogleGate><CenterStudentPortal /></CenterGoogleGate>`)

**Interfaces:**
- `gateState(row: { google_email: string | null; google_due_on: string } | null, today: string, laterThisSession: boolean): 'off' | 'ask' | 'required'` — no row or `google_email` → `'off'`; `today >= google_due_on` → `'required'`; `laterThisSession` → `'off'`; else `'ask'`.
- `daysLeft(dueOn: string, today: string): number`.
- Gate reads `google_email, google_due_on` for the signed-in student (`tenant_students` by `user_id`, RLS "Students view themselves"). `'ask'`: "Connect your Google account" + "Connect Google" + "Later ({n} days left)" (sets sessionStorage `center-google-later`). `'required'`: "Connect Google" + "Sign out". Connect: `tenant_google_link_start(center.id)` → `startGoogle({ kind: 'link', token }, '/student')`.

- [ ] **Step 1: Failing tests** for `gateState` (all four outcomes, including due today = required) and `daysLeft('2026-11-06','2026-10-30') === 7`.
- [ ] **Step 2: Run** → FAIL. **Step 3: Implement.** **Step 4: Run** → PASS.
- [ ] **Step 5: Commit.**

---

### Task 7: Admin — emails, Google status, two buttons

**Files:** Modify `src/portal/admin/StudentPages.tsx`.

**Interfaces:** consumes `tenant_give_google_time`, `tenant_switch_to_phone`; reads the new columns through `useCenterAdminData` (`select('*')` already returns them; type them locally as optional).
- Table: add Email column; Google column: "Connected" / "Due {Mon d}" / "Phone sign-in" (connected but `user_id ≠ google_user_id`).
- Tiles: Total students, Signed up, Not connected to Google (active, `google_email` null), Access removed.
- Reset-password icon disabled when the student signs in with Google (tooltip "Signs in with Google").
- Student page actions: "Give more time" (shown when `google_email` null) → toast "Google is now due {date}"; "Switch to phone sign-in" (shown when signs in with Google) → AlertDialog "They will sign in with their phone and password. Their email stays saved." → toast.

- [ ] **Step 1:** covered by `students.mjs` additions (Task 8). **Step 2: Implement.** **Step 3:** tsc clean, vitest green. **Step 4: Commit.**

---

### Task 8: Browser checks and release notes

**Files:**
- Create: `flowersos/tools/portal-e2e/join.mjs`; Modify: `flowersos/tools/portal-e2e/students.mjs`
- Modify: `docs/superpowers/specs/2026-10-30-center-join-google-email-design.md` (append "Release steps")

- [ ] **Step 1: `join.mjs`** (Vite 8098, Chrome 9342): open `/join/<ZZ Batch code>?center=zz-signin-test`; start screen shows both choices; email path walks name → phone → email screens with Back working and Continue disabled on bad input; stops before sending a code unless `0107` is live (then: code screen appears, wrong code shows `That code is not right…`). Sign-in page shows "Continue with Google". Student test login 99000005 reaches `/student` with no gate before 0107 (columns missing → `'off'`).
- [ ] **Step 2: `students.mjs`**: Email and Google columns present; tile "Not connected to Google".
- [ ] **Step 3: Run both** → all `true`. Full `npx vitest run`, `npx vite build`.
- [ ] **Step 4: Release steps** in the spec: (1) push after the teacher's 0103/0106 order, (2) Lovable applies 0107 and deploys `tenant-accounts`, (3) publish, (4) Saagii tests Google on `zz-signin-test.flowersos.co`: join with Google, sign in with Google, connect Google from the gate with student 99000003, Switch to phone sign-in on that student.
- [ ] **Step 5: Commit.**
