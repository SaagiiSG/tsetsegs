# Partner Program Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Team-picked tutors and creators get an invite link and code; a solo student who signs up with it earns
the partner $10 on their first yearly payment, 14 days after it, shown on the partner's own dashboard and paid by
hand from an admin Payouts list.

**Architecture:** One migration adds four tables reached only through SECURITY DEFINER functions (no direct client
access). `whop-webhook` gains payment/refund/dispute handling that writes earnings. Three small edge functions send
emails (application alert, partner welcome, morning payouts-due). Public `/partner` apply page and
`/partner/dashboard` live in the main app; the invite box sits on the solo sign-up form; admin gets one Partners page.

**Tech Stack:** React 18 + Vite + shadcn (`src/components/ui`), Supabase Postgres (PGlite for local checks),
Deno edge functions, `@whop/sdk` helpers already in `whop-webhook`, vitest.

**Spec:** `docs/superpowers/specs/2026-11-20-partner-program-design.md`

## Global Constraints

- Work in `~/Developer/tsetsegs-partners` on `feat/partner-program`. Commit per task. **Never push**; pushing needs
  Saagii's OK, a fresh `origin/main` check and migration renumbering (Task 9).
- `node_modules`: `ln -s ~/Developer/tsetsegs-whop/node_modules node_modules` once (don't commit it). Mac has 8 GB:
  one build/test command at a time.
- No new dependencies. UI from existing shadcn components in `src/components/ui` only.
- Partner-facing screens: English only, sixth-grade words.
- Partners never see a student's name, email or id. Only dates, statuses and amounts.
- Earning = $10 = `1000` cents, on the student's **first-ever** yearly payment (plan id = `yearly` or `yearly_early`
  from `WHOP_PLAN_IDS`, `_LIVE` twin in production), amount above 0. Monthly and renewals never earn.
- `due_at` = 00:00 UTC on (UTC date of `paid_at`) + 14 days. Paid 10 Dec → due 24 Dec 00:00 UTC.
- A refund or dispute before Mark paid voids the earning; after Mark paid nothing changes.
- A code attaches only to a solo student created in the last hour with no Whop membership yet. Codes: trimmed,
  upper case, `^[A-Z0-9]{3,20}$`, unique, never reused.
- Don't change `solo_join`, `guard_solo_student`, `whop_sync_membership` or the membership branch of `whop-webhook`.
- Migration file: `drizzle/migrations/0163_partner_program.sql` + `meta/0163_snapshot.json` (empty snapshot like
  `0153_snapshot.json`, new `id`, `prevId` = `0162_snapshot.json`'s `id`) + a `_journal.json` entry whose `when`
  is larger than every `when` in the journal. Number and `when` get re-checked at push time.
- Comments: one line, the why only, house style (Saagii's calls carry "(Saagii, 20 Nov)").
- The "How you get paid" text is exact copy, kept once in `supabase/functions/_shared/partner-rules.ts`:

```ts
// Saagii, 20 Nov 2026: tell partners straight when and whether they get paid.
export const PARTNER_RULES = [
  'You earn $10 when a student you invited pays for the yearly plan.',
  "Your $10 is due 14 days after they pay, as long as they don't get a refund in those 14 days. For most students that's 21 days after they sign up.",
  "Monthly plans and yearly renewals don't earn.",
] as const
export const PARTNER_EARNING_CENTS = 1000
export const partnerLink = (code: string) => `https://flowersos.co/solo?ref=${code}`
```

## Review Focus

1. **The same Whop event twice, or a refund that lands before its payment event** (Whop retries a failed delivery
   later): one earning at most, and a payment already refunded must never become payable. Tested in Task 2 (tombstone).
2. **Sign-up through Google/Apple/Microsoft with a code from the link**: the page reloads on the way back, and the
   code must still attach. Tested in Task 6 (the stored code survives a reload) and Task 1 (a student created in
   the last hour can still be tied).
3. **A code typed as `brody ` or ` Bro dy`**: works the same as `BRODY`. Tested in Task 6 (`normalizeCode`) and
   Task 1 (SQL normalizes too).
4. **A partner reading anything about a student but dates and statuses**: the dashboard JSON has no name, email or
   id keys. Tested in Task 2.
5. **The $0 payment Whop may record when a trial starts, and a monthly payment**: neither earns; a later yearly
   payment from the same student does. Tested in Task 2 and Task 3.

---

### Task 1: Tables, applications, codes and invites (SQL)

**Files:**
- Create: `drizzle/migrations/0163_partner_program.sql`, `drizzle/migrations/meta/0163_snapshot.json`
- Modify: `drizzle/migrations/meta/_journal.json`
- Test: `<scratchpad>/partner-sql/check.mjs` (scratchpad = `/private/tmp/claude-501/-Users-saranochirsereglen-Developer-Saagii21/e26adcae-0ee3-4556-9eb0-21909a14522e/scratchpad`; house convention: PGlite checks are not committed)

**Interfaces:**
- Produces tables (RLS on, no policies, `GRANT ALL ... TO service_role` only):
  - `partner_applications(id uuid pk default gen_random_uuid(), name text, email text, kind text check in ('tutor','creator'), link text default '', country text default '', message text default '', status text default 'new' check in ('new','approved','declined'), notified_at timestamptz, partner_id uuid, created_at timestamptz default now())`
  - `partners(id uuid pk, name text, email text, kind text, code text unique, user_id uuid unique, paused_at timestamptz, welcomed_at timestamptz, application_id uuid references partner_applications, created_at)`; unique index on `lower(email)`
  - `partner_invites(student_user_id uuid pk references solo_students(user_id) on delete cascade, partner_id uuid not null references partners, created_at)`
- Produces functions (all `SECURITY DEFINER SET search_path = public`, `REVOKE ALL ... FROM PUBLIC` first):
  - `submit_partner_application(_name text, _email text, _kind text, _link text, _country text, _message text, _website text DEFAULT '') RETURNS uuid` → anon, authenticated
  - `partner_code_ok(_code text) RETURNS boolean` → anon, authenticated
  - `solo_use_invite(_code text) RETURNS text` → authenticated; returns one of `'added' | 'bad_code' | 'too_late' | 'own_code' | 'already'`
  - `approve_partner_application(_id uuid, _code text) RETURNS uuid` (the partner id) → authenticated, admin only
  - `decline_partner_application(_id uuid) RETURNS void` → authenticated, admin only
  - `set_partner_paused(_partner uuid, _paused boolean) RETURNS void` → authenticated, admin only

- [ ] **Step 1: Set up the PGlite check.** `mkdir -p <scratchpad>/partner-sql && cd` there, `npm i @electric-sql/pglite`. Write `check.mjs` on the pattern of `.../856c108b-81b8-4fd8-8241-6b297266d5af/scratchpad/whop-sql/remind.mjs`: same role/`auth.uid()`/`auth.role()`/`cron` stubs, plus `CREATE TABLE auth.users(id uuid primary key, email text, email_confirmed_at timestamptz)`, `auth.jwt()` returning `json_build_object('email', current_setting('test.email', true))::jsonb`, `public.has_role(_u uuid, _r text)` true when `_u` = a fixed admin id, and a `public._post_edge_function(text, jsonb)` stub. Load `0034_solo_students.sql`, `0145_whop_premium.sql`, `0149_solo_billing_details.sql`, `0153_trial_reminders.sql`, then `0163_partner_program.sql` **twice** (must be safe to re-run).

- [ ] **Step 2: Write the failing checks** (asserts in `check.mjs`):

```js
// applications
const app = await call('submit_partner_application', ['Brody', ' Brody@X.test ', 'tutor', 'https://y.t/b', 'Canada', 'hi'])
await rejects(call('submit_partner_application', ['B', 'b@x.test', 'tutor', '', '', '']))           // name too short
await rejects(call('submit_partner_application', ['Ann', 'a@x.test', 'teacher', '', '', '']))       // bad kind
await rejects(call('submit_partner_application', ['Ann', 'a@x.test', 'tutor', '', '', '', 'bot'])) // honeypot
await rejects(call('submit_partner_application', ['Brody', 'brody@x.test', 'tutor', '', '', '']))  // same email within 24 h
// approve (admin only), code rules
await asUser(STUDENT); await rejects(call('approve_partner_application', [app, 'BRODY']))
await asAdmin()
const p = await call('approve_partner_application', [app, ' brody '])
assert.equal(code(p), 'BRODY'); assert.equal(appStatus(app), 'approved')
await rejects(call('approve_partner_application', [app2, 'BRODY']), /taken/)
await rejects(call('approve_partner_application', [app2, 'AB']), /3–20 letters or numbers/)
await rejects(call('approve_partner_application', [app2, 'BR-ODY']), /3–20 letters or numbers/)
// code check (anon)
assert.equal(await call('partner_code_ok', ['brody']), true)
await call('set_partner_paused', [p, true]); assert.equal(await call('partner_code_ok', ['BRODY']), false)
await call('set_partner_paused', [p, false])
// invites
await newSoloStudent(S1)                                   // solo_students row created now, no membership
assert.equal(await useInvite(S1, ' brody'), 'added')
assert.equal(await useInvite(S1, 'BRODY'), 'already')
await newSoloStudent(S2, { createdHoursAgo: 2 }); assert.equal(await useInvite(S2, 'BRODY'), 'too_late')
await newSoloStudent(S3, { membership: 'mem_x' }); assert.equal(await useInvite(S3, 'BRODY'), 'too_late')
await newSoloStudent(S4); assert.equal(await useInvite(S4, 'NOPE'), 'bad_code')
await newSoloStudent(S5, { email: 'brody@x.test' }); assert.equal(await useInvite(S5, 'BRODY'), 'own_code')
await call('set_partner_paused', [p, true]); await newSoloStudent(S6); assert.equal(await useInvite(S6, 'BRODY'), 'bad_code')
// no direct table access for students or visitors
await asUser(S1); await rejects(db.query('SELECT * FROM public.partners'))
await rejects(db.query('SELECT * FROM public.partner_invites'))
```

- [ ] **Step 3: Run it and see it fail.** `node check.mjs` → FAIL (`0163_partner_program.sql` missing).

- [ ] **Step 4: Write the tables and the six functions in `0163_partner_program.sql`.** Header comment says what the program is and "(Saagii, 20 Nov 2026)". `SET lock_timeout = '3s';` like 0151. Copy `submit_educator_demo_request`'s checks from 0033 (honeypot, lengths, email regex, `pg_advisory_xact_lock` on the email, 1 per email per 24 h, at most 50 per hour overall), with limits name 2–100, link ≤ 300, country ≤ 100, message ≤ 2000. `solo_use_invite` reads the student from `solo_students` by `auth.uid()`; "own code" = the partner's `user_id` is the caller or the partner's email equals the student's email (case-insensitive). Admin checks raise `'Admin access required'` via `public.has_role(auth.uid(), 'admin')`. A taken code raises `'That code is taken'`; an email that's already a partner raises `'That email is already a partner'`. Snapshot + journal entry as in Global Constraints.

- [ ] **Step 5: Run it and see it pass.** `node check.mjs` → prints `0163 part 1 checks passed`.

- [ ] **Step 6: Commit.** `git add drizzle/migrations && git commit -m "feat(partners): applications, codes and invites (0163)"`

### Task 2: Earnings, payouts and the two read functions (SQL)

**Files:**
- Modify: `drizzle/migrations/0163_partner_program.sql` (append)
- Test: `<scratchpad>/partner-sql/check.mjs` (append)

**Interfaces:**
- Consumes: Task 1 tables.
- Produces tables: `partner_earnings(id uuid pk, partner_id uuid references partners, student_user_id uuid unique, payment_id text unique, paid_at timestamptz, due_at timestamptz, amount_cents int default 1000, status text default 'pending' check in ('pending','void','paid'), voided_at, paid_marked_at, alerted_at, created_at)`; `partner_voided_payments(payment_id text pk, created_at)`. Same RLS/grant rule as Task 1.
- Produces functions:
  - `partner_record_payment(_user uuid, _membership text, _payment text, _yearly boolean, _amount numeric, _paid_at timestamptz) RETURNS text` → service_role only; one of `'earned' | 'no_student' | 'no_partner' | 'not_counted' | 'already' | 'voided'`. `_user` null or not a solo student → look up `solo_students.whop_membership_id = _membership`.
  - `partner_void_payment(_payment text) RETURNS text` → service_role only; always inserts the tombstone; returns `'voided' | 'paid_already' | 'none'`.
  - `partner_mark_paid(_earning uuid) RETURNS void` → admin only; only `pending` with `due_at <= now()`, else raises `'Only a $10 that is due can be marked paid'`.
  - `claim_partner_payouts_due() RETURNS TABLE(id uuid, partner_name text, code text, amount_cents int, due_at timestamptz)` → service_role; one UPDATE setting `alerted_at` on `pending`, due, not yet alerted.
  - `unclaim_partner_payouts_due(_ids uuid[]) RETURNS void` → service_role.
  - `partner_dashboard() RETURNS jsonb` → authenticated. Finds the partner by `user_id = auth.uid()`, else by email = the caller's `auth.users.email` **with `email_confirmed_at` set**, and then saves `user_id`. Not a partner → `null`. Shape:
    `{ "name", "code", "paused": bool, "invites": [{ "signed_up", "whop_status", "billing_days", "period_end", "earning_status", "paid_at", "due_at", "paid_marked_at" }] }`, newest first.
  - `partner_admin_data() RETURNS jsonb` → admin only. Shape:
    `{ "applications": [{id,name,email,kind,link,country,message,status,created_at}], "partners": [{id,name,email,kind,code,paused,created_at,signed_up,paid_yearly,owed_cents,paid_cents}], "earnings": [{id,partner_name,code,paid_at,due_at,status,amount_cents,paid_marked_at}], "missing": [{partner_name,code,signed_up}] }`. `missing` = invited students with `whop_billing_period_days = 365` and `whop_status IN ('active','canceling')` but no earning.
  - Cron: `SELECT cron.schedule('partner-payouts-due-daily', '0 15 * * *', $$select public._post_edge_function('partner-payouts-due', '{}'::jsonb);$$);` with the comment `-- shortcut: 15:00 UTC is 8:00 in Calgary in winter, 9:00 in summer; move it if the hour matters.`

- [ ] **Step 1: Write the failing checks** (append to `check.mjs`; S1 is tied to BRODY from Task 1):

```js
await asAdmin(); await call('set_partner_paused', [p, false])           // Task 1 left BRODY paused
await svcExec(`UPDATE public.solo_students SET whop_membership_id = 'mem_S1' WHERE user_id = '${S1}'`)
const pay = (u, payId, yearly, amount, paidAt, mem = 'mem_' + u) =>
  svc('partner_record_payment', [u, mem, payId, yearly, amount, paidAt])
assert.equal(await pay(S1, 'pay_0', true, 0, '2026-12-03T10:00:00Z'), 'not_counted')     // $0 trial payment
assert.equal(await pay(S1, 'pay_m', false, 19, '2026-12-03T10:00:00Z'), 'not_counted')   // monthly
assert.equal(await pay(S1, 'pay_y', true, 39, '2026-12-10T23:30:00Z'), 'earned')
assert.equal(dueAt('pay_y'), '2026-12-24T00:00:00.000Z')
assert.equal(await pay(S1, 'pay_y', true, 39, '2026-12-10T23:30:00Z'), 'already')        // same event twice
assert.equal(await pay(S1, 'pay_y2', true, 39, '2027-12-10T00:00:00Z'), 'already')       // renewal
assert.equal(await pay(S4, 'pay_s4', true, 39, '2026-12-10T00:00:00Z'), 'no_partner')
assert.equal(await svc('partner_record_payment', [null, 'mem_S1', 'pay_z', true, 39, '2026-12-10T00:00:00Z']), 'already') // membership fallback finds S1
// refund before its payment event (retry order): tombstone wins
await newSoloStudent(S7); assert.equal(await useInvite(S7, 'BRODY'), 'added')
assert.equal(await svc('partner_void_payment', ['pay_s7']), 'none')
assert.equal(await pay(S7, 'pay_s7', true, 39, '2026-12-10T00:00:00Z'), 'voided')
// mark paid only when due, never when void
await asAdmin(); await rejects(call('partner_mark_paid', [earning('pay_y')]), /due/)   // due 24 Dec, still in the future
await rejects(call('partner_mark_paid', [earning('pay_s7')]), /due/)                   // void
// S8: tied to BRODY, paid yearly 20 days ago → due now
await newSoloStudent(S8); await useInvite(S8, 'BRODY')
const duePayment = 'pay_s8'; await pay(S8, duePayment, true, 39, new Date(Date.now() - 20 * 864e5).toISOString())
const dueEarning = earning(duePayment)
assert.deepEqual(ids(await svc('claim_partner_payouts_due')), [dueEarning]); assert.deepEqual(await svc('claim_partner_payouts_due'), [])
await call('partner_mark_paid', [dueEarning]); assert.equal(await svc('partner_void_payment', [duePayment]), 'paid_already')
// dashboard: own data only, no student identity
await asUser(BRODY_USER, 'brody@x.test')    // auth.users row with email_confirmed_at set
const d = await call('partner_dashboard', [])
assert.equal(d.code, 'BRODY')
for (const row of d.invites) assert.deepEqual(Object.keys(row).sort(), ['billing_days','due_at','earning_status','paid_at','paid_marked_at','period_end','signed_up','whop_status'])
assert.ok(!/@|[0-9a-f]{8}-[0-9a-f]{4}-/.test(JSON.stringify(d.invites)), 'no emails or ids in invites')
await asUser(UNCONFIRMED, 'brody@x.test'); assert.equal(await call('partner_dashboard', []), null)  // email not confirmed
await asUser(S1, 's1@x.test'); assert.equal(await call('partner_dashboard', []), null)
// admin data: admin only; missing list catches a yearly student with no earning
await asUser(S1); await rejects(call('partner_admin_data', []))
// grants: record/void/claim/unclaim are service_role only
```

- [ ] **Step 2: Run it and see it fail.** `node check.mjs` → FAIL at the first `partner_record_payment` call.

- [ ] **Step 3: Append the tables, functions and cron to `0163_partner_program.sql`.** `partner_record_payment` order: find student → find invite → if `_payment` is in `partner_voided_payments` return `'voided'` → if not `_yearly` or `_amount <= 0` return `'not_counted'` → `INSERT ... ON CONFLICT DO NOTHING` on both unique keys → `'earned'` or `'already'`. `due_at` = `((_paid_at AT TIME ZONE 'UTC')::date + 14)::timestamp AT TIME ZONE 'UTC'`.

- [ ] **Step 4: Run it and see it pass.** `node check.mjs` → `0163 checks passed`.

- [ ] **Step 5: Commit.** `git commit -am "feat(partners): earnings, payouts, dashboard and admin reads (0163)"`

### Task 3: Whop payment, refund and dispute events

**Files:**
- Create: `supabase/functions/_shared/partner-payment.ts`, `supabase/functions/_shared/partner-rules.ts` (exact copy in Global Constraints)
- Modify: `supabase/functions/whop-webhook/index.ts`
- Test: `src/lib/partnerPayment.test.ts`

**Interfaces:**
- Consumes: `partner_record_payment`, `partner_void_payment` (Task 2).
- Produces:
  - `paymentFields(data: unknown): { payment: string; membership: string | null; user: string | null; plan: string | null; amount: number; paidAt: string } | null` — `null` when there's no `id` or no `paid_at`.
  - `refundPaymentId(data: unknown): string | null` — `data.payment.id`, else `data.payment_id`.
  - `yearlyPlans(plans: Record<string, string>): Set<string>` — `yearly` and `yearly_early` ids that are set.

- [ ] **Step 1: Confirm the real payload shape (read-only).** With `WHOP_API_KEY_LIVE` from `~/Developer/Saagii21/flowersos/.env` (lines are `NAME = value`; never print the key), `GET https://api.whop.com/api/v1/payments?company_id=biz_0dnLeAOBYKUeqz&first=5`. Note where `id`, `membership`/`membership_id`, `plan`/`plan_id`, `total` (object `{amount: "39.00"}` or a number), `paid_at` and `metadata.customer_id` sit. If it lists nothing, read the sandbox business `biz_NB1mXve5N2ZaI4` with `WHOP_API_KEY` against `sandbox-api.whop.com`. Write what you found as one comment line at the top of `partner-payment.ts`. Changes nothing on Whop.

- [ ] **Step 2: Write the failing test** `src/lib/partnerPayment.test.ts` (imports from `../../supabase/functions/_shared/partner-payment` like `educatorDemoRequestEmail.test.ts` does):

```ts
const docShape = { id: 'pay_1', membership_id: 'mem_1', plan_id: 'plan_y', total: { amount: '39.00' }, paid_at: '2026-12-10T10:00:00Z', metadata: { customer_id: UUID } }
expect(paymentFields(docShape)).toEqual({ payment: 'pay_1', membership: 'mem_1', user: UUID, plan: 'plan_y', amount: 39, paidAt: '2026-12-10T10:00:00Z' })
expect(paymentFields({ ...docShape, total: 39, membership_id: undefined, membership: { id: 'mem_1' }, plan_id: undefined, plan: { id: 'plan_y' } })?.membership).toBe('mem_1')
expect(paymentFields({ ...docShape, metadata: { customer_id: 'not-a-uuid' } })?.user).toBeNull()
expect(paymentFields({ ...docShape, total: { amount: '0.00' } })?.amount).toBe(0)
expect(paymentFields({ id: 'pay_1' })).toBeNull()
expect(refundPaymentId({ payment: { id: 'pay_1' } })).toBe('pay_1')
expect(refundPaymentId({ payment_id: 'pay_2' })).toBe('pay_2')
expect([...yearlyPlans({ monthly: 'a', yearly: 'b', yearly_early: 'c' })]).toEqual(['b', 'c'])
```

- [ ] **Step 3: Run it and see it fail.** `npx vitest run src/lib/partnerPayment.test.ts` → FAIL (module missing).

- [ ] **Step 4: Implement `partner-payment.ts`, then the webhook branch.** In `whop-webhook/index.ts`, before the existing `membership.*` check: `payment.succeeded` → `paymentFields` → `rpc('partner_record_payment', {_user, _membership, _payment, _yearly: yearlyPlans(plans).has(plan), _amount, _paid_at})`; `refund.created` and `dispute.created` → `rpc('partner_void_payment', { _payment })`. Plans come from `WHOP_PLAN_IDS` with the `_LIVE` twin in production, read exactly as `whop-checkout` does. RPC error → 500 (Whop retries); unparseable data → 200 `'ignored'`. Update the file's top comment to name the new events. The membership branch stays byte-for-byte.

- [ ] **Step 5: Run the test and type check.** `npx vitest run src/lib/partnerPayment.test.ts` → PASS; `npx deno check --node-modules-dir=none supabase/functions/whop-webhook/index.ts` → no errors (delete any `deno.lock` it writes).

- [ ] **Step 6: Commit.** `git add supabase/functions src/lib/partnerPayment.test.ts && git commit -m "feat(partners): earn and void from Whop payment, refund and dispute events"`

### Task 4: Emails and their edge functions

**Files:**
- Create: `supabase/functions/notify-partner-application/index.ts`, `supabase/functions/partner-welcome/index.ts`, `supabase/functions/partner-payouts-due/index.ts`
- Create: `supabase/functions/_shared/transactional-email-templates/partner-application.tsx`, `partner-welcome.tsx`, `partner-payouts-due.tsx`
- Modify: `supabase/functions/_shared/transactional-email-templates/registry.ts`, `supabase/config.toml`

**Interfaces:**
- Consumes: Task 1/2 tables and `claim_partner_payouts_due` / `unclaim_partner_payouts_due`; `PARTNER_RULES`, `partnerLink` (Task 3).
- Produces:
  - `notify-partner-application` (public, `verify_jwt = false` in config.toml): body `{ id }`; claims `partner_applications.notified_at` like `notify-demo-request` does; sends `partner-application` to its fixed `to: 'saranochir.s@gmail.com'` with `replyTo` = the applicant; releases the claim on failure.
  - `partner-welcome` (JWT on): body `{ partner_id }`; admin check copied from `create-teacher-account` (claims + `user_roles` admin); `auth.admin.createUser({ email, email_confirm: true })`, where "already registered" is fine; claims `partners.welcomed_at`; sends `partner-welcome` to the partner with `{ name, code, link: partnerLink(code), rules: PARTNER_RULES, signIn: 'https://flowersos.co/partner/dashboard' }`; releases the claim on failure. Returns `{ sent: true }` or `{ alreadySent: true }`.
  - `partner-payouts-due` (JWT on; cron calls with the anon key like `trial-reminders`): claims → nothing due returns `{ due: 0 }` → else one `partner-payouts-due` email to `saranochir.s@gmail.com` listing `partner_name`, `code`, `$10` and the due date, with a button to `https://flowersos.co/admin/partners`, `idempotencyKey` `partner-payouts-due:<UTC date>` → on failure `unclaim_partner_payouts_due(ids)`. Every send writes `email_send_log` like `trial-reminders`.
  - Templates: `partner-welcome` uses `_shared/email-layout.tsx` like `trial-reminder.tsx` (subject `Welcome to flowersos partners`); the two admin alerts copy `educator-demo-request.tsx`'s plain style (subjects `New partner application: <name>` (one line, like `demoRequestSubject`) and `Partner payouts due today`).

- [ ] **Step 1: Write the three templates and register them** in `registry.ts` with `previewData` each.
- [ ] **Step 2: Write the three functions and the config.toml entry** for `notify-partner-application`.
- [ ] **Step 3: Type check.** `npx deno check --node-modules-dir=none supabase/functions/notify-partner-application/index.ts supabase/functions/partner-welcome/index.ts supabase/functions/partner-payouts-due/index.ts` → no errors (no `deno.lock` committed).
- [ ] **Step 4: Commit.** `git commit -m "feat(partners): application alert, welcome and payouts-due emails"`

### Task 5: /terms and /privacy

**Files:**
- Modify: `src/pages/public/Legal.tsx`, `src/lib/terms.ts`

- [ ] **Step 1: Edit the copy.** Refunds bullet 1 becomes: "You can get a full refund on both the monthly and the yearly plan. The day you're charged counts as day 1, and you can ask until the end of day 14. This includes the first payment after a free trial." Bullet "After 14 days…" stays. Privacy "What we collect" gets: "If you apply to be a partner: your name, email, country, the link you gave us and your message." Privacy "Who can see it" gets: "If you signed up with a partner's invite code, that partner sees the date you signed up and whether you're on a trial or a plan. Never your name or email." `TERMS_VERSION` = the commit day, `YYYY-MM-DD`.
- [ ] **Step 2: Check.** `npx vitest run` (whole suite) → PASS; `/terms#refunds` text matches.
- [ ] **Step 3: Commit.** `git commit -am "docs(legal): refund day count; partner data in the privacy policy"`

### Task 6: Invite codes at solo sign-up

**Files:**
- Create: `src/partner/invite.ts`, `src/partner/InviteCodeField.tsx`
- Modify: `src/solo/SoloSignIn.tsx` (sign-up mode only), `src/solo/SoloPortal.tsx`
- Test: `src/partner/invite.test.ts`

**Interfaces:**
- Consumes: `partner_code_ok`, `solo_use_invite` (Task 1).
- Produces:
  - `normalizeCode(raw: string): string` — removes all whitespace, upper case.
  - `rememberInvite(code: string | null): void`, `storedInvite(): string | null` — localStorage key `'partner-invite'`, every access in try/catch (blocked storage = no code, never a crash).
  - `captureRefParam(search: string): void` — `?ref=` present → `rememberInvite(normalizeCode(ref))`.
  - `<InviteCodeField />` — no props.

- [ ] **Step 1: Write the failing test** `src/partner/invite.test.ts`:

```ts
expect(normalizeCode(' bro dy ')).toBe('BRODY')
captureRefParam('?ref=brody'); expect(storedInvite()).toBe('BRODY')
captureRefParam('?utm=x'); expect(storedInvite()).toBe('BRODY')   // other params keep the code
rememberInvite(null); expect(storedInvite()).toBeNull()
vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
expect(storedInvite()).toBeNull()
```

- [ ] **Step 2: Run it and see it fail.** `npx vitest run src/partner/invite.test.ts` → FAIL.
- [ ] **Step 3: Implement `invite.ts` and `InviteCodeField`.** The field shows only in `mode === 'signup'`, placed under the heading so it's seen before the Google/Apple/Microsoft buttons. Collapsed as a "Have an invite code?" link; a stored code shows as "Invite code BRODY added" with a Change link. On blur it calls `partner_code_ok` and either remembers the code or shows "That code doesn't work. You can still sign up without one." Uses `Input`/`Button` from `src/components/ui` and `authInputClasses`.
- [ ] **Step 4: Wire `SoloPortal`.** On first render `captureRefParam(window.location.search)`. When `joined` becomes `'ok'` and `storedInvite()` is set, call `rpc('solo_use_invite', { _code })` once, then `rememberInvite(null)` on any answer (keep it only if the call threw). The answer is never shown; sign-up never waits on it.
- [ ] **Step 5: Run.** `npx vitest run src/partner src/solo` → PASS.
- [ ] **Step 6: Commit.** `git commit -m "feat(partners): invite code on solo sign-up"`

### Task 7: Apply page, footer link and partner dashboard

**Files:**
- Create: `src/partner/PartnerShell.tsx`, `src/partner/PartnerApply.tsx`, `src/partner/PartnerDashboard.tsx`, `src/partner/status.ts`
- Modify: `src/App.tsx` (two `MainApp` routes), `src/components/landing/LegalFooter.tsx`
- Test: `src/partner/status.test.ts`

**Interfaces:**
- Consumes: `submit_partner_application`, `partner_dashboard` (Tasks 1–2); `notify-partner-application` (Task 4); `PARTNER_RULES`, `PARTNER_EARNING_CENTS`, `partnerLink` (Task 3).
- Produces:
  - `type Invite = { signed_up: string; whop_status: string | null; billing_days: number | null; period_end: string | null; earning_status: 'pending' | 'void' | 'paid' | null; paid_at: string | null; due_at: string | null; paid_marked_at: string | null }`
  - `inviteRow(i: Invite): { date: string; status: string; payout: string }`
  - `totals(invites: Invite[]): { signedUp: number; inTrial: number; paidYearly: number; onItsWayCents: number; paidCents: number }`
  - `fmtDate(iso: string): string` — `en-GB`, `{ day: 'numeric', month: 'short', timeZone: 'UTC' }` like `trial-reminders`.
  - `PartnerShell({ children, wide }: { children: ReactNode; wide?: boolean })` — the single-column cloud sky of `origin/main`'s `SoloShell` (not the split one from `feat/solo-signup-flow`), `max-w-lg`, or `max-w-3xl` when `wide`.

- [ ] **Step 1: Write the failing test** `src/partner/status.test.ts`:

```ts
const base = { signed_up: '2026-12-03T00:00:00Z', whop_status: null, billing_days: null, period_end: null, earning_status: null, paid_at: null, due_at: null, paid_marked_at: null }
expect(inviteRow(base)).toEqual({ date: '3 Dec', status: 'Free', payout: '—' })
expect(inviteRow({ ...base, whop_status: 'trialing', period_end: '2026-12-10T00:00:00Z' }).status).toBe('In trial, ends 10 Dec')
expect(inviteRow({ ...base, whop_status: 'active', billing_days: 30 })).toMatchObject({ status: 'Monthly', payout: 'No payout (monthly)' })
expect(inviteRow({ ...base, whop_status: 'canceled' })).toMatchObject({ status: 'Canceled', payout: 'No payout' })
expect(inviteRow({ ...base, earning_status: 'pending', paid_at: '2026-12-10T10:00:00Z', due_at: '2026-12-24T00:00:00Z' })).toMatchObject({ status: 'Yearly, paid 10 Dec', payout: '$10 due 24 Dec' })
expect(inviteRow({ ...base, earning_status: 'paid', paid_at: '2026-12-10T10:00:00Z', paid_marked_at: '2026-12-24T09:00:00Z' }).payout).toBe('$10 paid 24 Dec')
expect(inviteRow({ ...base, earning_status: 'void', whop_status: 'canceled' })).toMatchObject({ status: 'Refunded', payout: 'No payout' })
expect(totals([base, { ...base, whop_status: 'trialing' }, { ...base, earning_status: 'pending' }, { ...base, earning_status: 'paid' }, { ...base, earning_status: 'void' }]))
  .toEqual({ signedUp: 5, inTrial: 1, paidYearly: 2, onItsWayCents: 1000, paidCents: 1000 })
```

- [ ] **Step 2: Run it and see it fail.** `npx vitest run src/partner/status.test.ts` → FAIL.
- [ ] **Step 3: Implement `status.ts`.** The earning status wins over the Whop status.
- [ ] **Step 4: Build the three components and wire the routes.**
  - `/partner` → `PartnerApply`: the spec's top text, then `PARTNER_RULES` as a "How you get paid" list, then the form (shadcn `Input`, `Textarea`, `RadioGroup` for Tutor/Creator, a hidden honeypot `website` input) → `submit_partner_application` → fire-and-forget `functions.invoke('notify-partner-application', { body: { id } })` → thank-you state "Thanks! We read every application and email you if it's a fit." RPC errors show their message.
  - `/partner/dashboard` → `PartnerDashboard`: no session → email box → `signInWithOtp({ email, options: { shouldCreateUser: false } })` → 8-digit `InputOTP` (`CODE_LENGTH = 8`, the same as solo) → `verifyOtp({ email, token, type: 'email' })`. A "signups not allowed" error reads "That email isn't a partner yet. Apply first." Session → `rpc('partner_dashboard')`: `null` → "This account isn't a partner" + Sign out; a partner → the spec's sketch: code and link with Copy buttons (`navigator.clipboard`, toast), five count cards from `totals`, a "How you get paid" card from `PARTNER_RULES`, a "Paused" badge if paused, and the invites list from `inviteRow`, plus an empty state ("No sign-ups yet. Share your link to get started."). Phone first; the list is stacked rows, not a wide table.
  - `App.tsx` `MainApp`: `<Route path="/partner" …>` and `<Route path="/partner/dashboard" …>` next to `/terms`.
  - `LegalFooter`: `<a href="/partner" className="hover:text-foreground">{text("Түнш болох", "Become a partner")}</a>` after Terms of Use.
- [ ] **Step 5: Run.** `npx vitest run src/partner` → PASS; `npx tsc --noEmit -p tsconfig.app.json` → no new errors.
- [ ] **Step 6: Commit.** `git commit -m "feat(partners): apply page, footer link and partner dashboard"`

### Task 8: Admin Partners page

**Files:**
- Create: `src/pages/admin/Partners.tsx`
- Modify: `src/pages/Admin.tsx` (route `partners`), `src/components/admin/menuSections.ts` and `src/components/admin/mobile/MoreSheet.tsx` (`{ title: "Partners", url: "/admin/partners", icon: Handshake }` after Demo Requests)

**Interfaces:**
- Consumes: `partner_admin_data`, `approve_partner_application`, `decline_partner_application`, `set_partner_paused`, `partner_mark_paid` (Tasks 1–2); `partner-welcome` (Task 4); `fmtDate` (Task 7).

- [ ] **Step 1: Build the page** on `DemoRequests.tsx`'s pattern (react-query `['partners-admin']`, Skeleton loading, error + retry, `toast` from sonner). shadcn `Tabs`: **Applications** (cards; Approve opens a `Dialog` with a code `Input` → approve RPC → `functions.invoke('partner-welcome', { body: { partner_id } })` → toast "Approved. Welcome email sent." or "Approved, but the email failed. Try Resend." with a Resend button; No → decline RPC), **Partners** (name, kind badge, code, counts, owed/paid in dollars, a `Switch` for Pause), **Payouts** (the `missing` list on top in an `Alert` if not empty; then Due now with Mark paid behind an `AlertDialog` "Mark $10 to BRODY as paid?"; then Coming up; then Paid). Every action invalidates `['partners-admin']`.
- [ ] **Step 2: Check.** `npx tsc --noEmit -p tsconfig.app.json` → no new errors; `npx eslint src/pages/admin/Partners.tsx src/partner` → clean.
- [ ] **Step 3: Commit.** `git commit -m "feat(partners): admin Partners page"`

### Task 9: Whole-branch check and hand-over (no push)

- [ ] **Step 1: Run everything, one at a time.** `node <scratchpad>/partner-sql/check.mjs`; `npx vitest run`; `npx tsc --noEmit -p tsconfig.app.json`; `npx eslint` on every changed file; `npx vite build`; `deno check` on the four edge functions. All pass, with output saved for the report.
- [ ] **Step 2: Look at it.** Dev server on a spare port with its own `cacheDir` (shared `node_modules/.vite` clashes), Chrome over CDP (the browser skill is broken here), at 390×844 and 1280×900: `/partner`, `/partner/dashboard` (sign-in state), `/solo?ref=BRODY` (field shows "Invite code BRODY added"), the landing footer link. The dev server talks to the **live** database, where 0163 isn't applied: don't submit forms and don't sign in. Screenshots go in the scratchpad.
- [ ] **Step 3: Write the hand-over** in `~/Developer/Saagii21/flowersos/handoff-2026-11-20-partner-program.md`: what's built, what was checked and what wasn't, and Saagii's go-live steps in order: (1) his OK to push; (2) check `origin/main..HEAD`, renumber 0163 if taken (mainlogin uses 0163), fix the snapshot `prevId` and the journal `when`; (3) Lovable applies the migration and deploys `whop-webhook`, `notify-partner-application`, `partner-welcome` and `partner-payouts-due`, then he publishes; (4) with his OK, add `payment.succeeded`, `refund.created` and `dispute.created` to the live webhook `hook_6NokmKLAC6I5s` and the sandbox one `hook_c6YRzGIXDGnIO`; (5) approve one test application with his own second email and check the dashboard. Rebase note: `feat/solo-signup-flow` changes `SoloShell` only, so Task 6 touches different lines.
