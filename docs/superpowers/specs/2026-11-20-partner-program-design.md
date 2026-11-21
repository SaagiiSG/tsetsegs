# Partner program: invite links and codes (design)

20 Nov 2026. Talked through with Saagii in chat. Everything marked **(Saagii)** is his call. Everything marked
**(my call)** is mine and he can change it. Status: builder check done, waiting for his approval. No code yet.

## Why

flowersos is launching solo Premium ($19/month, $39/year, 7-day trial with the card first). To bring in paying
students outside Mongolia, the team hand-picks a few **tutors and creators** and gives each one an invite link and
code. When a student they brought in pays for a year, the partner earns **$10 (Saagii)**. Partners see their own
dashboard. Saagii wants them told straight that they're only paid if the student doesn't cancel, and when the money
comes.

## Who it's for

- **Partners (Saagii):** individual tutors and creators. Same offer, same dashboard, same rules for both. The team
  picks them. Saagii creates every code. Creators won't be in Mongolia (Saagii); tutors might be.
- **Centers are separate and unchanged (Saagii).** They keep the current setup (`flowersos/onboarding-a-center.md`).
  A tutor who wants the teacher tools becomes a center the normal way. No free center month inside this program.
- **Invited students:** solo students only. They get **nothing extra (Saagii)**: same 7-day trial, same prices.

## Goals

1. Anyone can apply from a "Become a partner" link in the landing footer **(Saagii)**.
2. Admin approves an application, types the code text, and the partner gets a sign-in email.
3. A student who signs up through a partner's link or code is tied to that partner for good.
4. The partner earns $10 on that student's first-ever yearly payment, once the refund window has passed.
5. The partner's dashboard shows counts and dates only, and says plainly how and when they get paid **(Saagii)**.
6. Admin sees what's due and marks it paid. Saagii pays partners himself, outside the app **(Saagii: approach B)**.
7. Partners get paid **14 days after the student's yearly payment**. For a student who pays when the 7-day trial
   ends, that's 21 days after sign-up, which is Saagii's "at longest 21 days". Reworded after the builder check
   so it stays true for students who switch to yearly later (my pick; Saagii said "continue").

## Non-goals

- No discount, no longer trial, no gift for the invited student (Saagii).
- No Whop affiliate program and no automatic payouts (Saagii picked B).
- No commission on monthly payments or on renewals.
- No codes for ordinary students, and no self-serve codes.
- No bank or payout details stored in our database (my call: agreed with each partner outside the app).
- No center or teacher-side access for partners.
- No change to centers, the main (Mongolian) portal, or the Mongolia sign-up block.

## Anti-goals (would count as failure even if it works)

- A partner surprised about whether or when they get paid.
- A partner learning who their invited students are (many are under 18).
- Money owed that we can't trace to one real yearly payment that wasn't refunded.
- The existing solo sign-up, paywall, Premium sync or Billing page breaking.

## Approaches (chosen in chat)

- **A. Whop's built-in affiliates.** Pass the partner's code into our embedded checkout (`affiliateCode`); Whop
  counts a flat $10 on the yearly plans and pays after its 30-day hold. No payout work, but every partner needs a
  Whop account and Whop's ID check to withdraw, Mongolia's payout methods are unconfirmed, and the numbers would
  live in two places (Whop's page and ours). It also can't meet the 21-day promise (30-day hold).
- **B. Our own records; Saagii pays by hand. Picked (Saagii).** Our database decides when each $10 is due, admin
  shows a due list with Mark paid, and the partner's dashboard is the only place to look. Works for partners
  anywhere and needs nothing but our sign-in. Cost: paying a short list by hand. Can move to A later without
  changing what partners see.
- Dropped: A with our dashboard reading Whop's affiliate numbers. Same downsides as A, plus two sources to keep
  in step.

## The money rules

- **What earns $10 (my call, agreed in the playback):** the invited student's **first-ever yearly payment**
  (plans `yearly` or `yearly_early`) with an amount above $0. A student who starts monthly and switches to yearly
  later counts at that first yearly payment. Monthly payments never count. Renewals never count.
- **Refund window (Saagii):** the day of payment is day 1. Refunds are open through the end of day 14. The $10
  becomes **due on day 15**. With the 7-day trial that's day 21 after sign-up.
  - Days are counted in UTC (my call): due at 00:00 UTC on the 14th calendar day after the payment's UTC date.
- **Voided (my call):** a refund or a dispute (chargeback) on that payment before admin marks the $10 paid
  voids it. If one comes after it was paid, we take the loss; nothing is taken back from the partner.
- **Paused partner (my call):** pausing stops new sign-ups from using the code. Students already tied to the
  partner still earn them $10.
- **Paying on time:** so each $10 goes out on its due day, admin gets an email the morning something comes due. Saagii pays
  that day. 8:00 Edmonton is after day 14 has ended in every time zone, so a refund always lands before that
  morning's list.
- **No time limit (decided after the builder check):** a tied student's first yearly payment earns whenever it
  comes. The promise to partners is "due 14 days after they pay for the year; for most students that's 21 days
  after they sign up". A cut-off was the other option and was dropped: it would cost partners the students who
  switch to yearly later.
- **Early birds (my call):** an invited student who is also on the early bird list still gets the 14-day plans;
  their $10 comes due 14 days after their payment like everyone else. The list has 2 people (20 Nov), so this
  barely happens.

## /terms change (Saagii)

The refund rule already exists ("within 14 days of a payment"). Reword it so the count is exact: "The day you're
charged counts as day 1. You can ask for a refund until the end of day 14." Keep the other refund lines. Bump
`TERMS_VERSION` in `src/lib/terms.ts`. That only stamps new sign-ups; nobody is asked to agree again (checked:
nothing re-prompts on a version change).

## The pieces

### 1. Footer link and apply page

- "Become a partner" in `src/components/landing/LegalFooter.tsx`, which both landing footers share **(Saagii: the
  footer; both pages is my call)**.
- Public page, cloud look **(Saagii)**: the same sky as `SoloShell` / `AuthSplitLayout`. Works on phones.
- Top: "Become a flowersos partner. Tutors and creators: earn $10 for every student you bring who pays for a year
  of Premium." Below it, the "How you get paid" rules in plain words, the same text as on the dashboard.
- Form: name, email, I am a (Tutor / Creator), where you teach or post (a link), country, anything else. Send.
- After sending: a thank-you state ("We read every application and email you if it's a fit").
- Saved to an applications table. Admin gets an email for each new one, like the educator lead alerts (0062) and
  `notify-demo-request`.
- Spam guard: a hidden honeypot field and a per-email/per-IP limit (builder picks the limit).

### 2. Admin: one Partners page, three tabs

- **Applications:** newest first. Approve or No. Approve asks for the code text, then creates the partner and
  sends them the welcome email. "No" just closes it; no automatic email (my call; the team can reply personally).
- **Partners:** each partner's name, type, code, Signed up / Paid yearly / Owed / Paid counts, and a Pause switch.
- **Payouts:** what's due now (partner, amount, due date), with Mark paid; below it, what's coming (pending) and
  what's been paid.
- Platform admins only (the existing `has_role(…, 'admin')` check).

### 3. Codes and links

- One code per partner. The link and the code do the same thing: `flowersos.co/solo?ref=BRODY` = code `BRODY`.
- Code text (my call): 3–20 letters or digits, stored upper case, matched without caring about case, unique, and
  never handed to anyone else even after a pause.
- The link stores the code in the browser until sign-up finishes, so it survives the Google / Apple / Microsoft
  round trip (same idea as the terms tick in `src/lib/terms.ts`).
- The solo sign-up form gets a small "Have an invite code?" box, filled in from the link if there was one. A code
  that doesn't exist or is paused says so before sign-up; sign-up still works without one.
- The code attaches **only when the solo student is first created** (inside `solo_join`). An existing student can't
  be claimed later. A partner can't attach their own code to their own account.
- Mongolian visitors still see the normal "not available" screen. Center and main students never get codes.

### 4. Tracking payments

- Add Whop events to our webhook: `payment.succeeded`, `refund.created`, `dispute.created`, on both the sandbox
  (`hook_c6YRzGIXDGnIO`) and live (`hook_6NokmKLAC6I5s`) webhooks. Changing the live one needs Saagii's OK.
- `payment.succeeded` carries `membership_id`, `plan_id`, `paid_at`, the amount, and the checkout metadata (our
  `customer_id`). If the student is tied to a partner, the plan is yearly, the amount is above $0, and the student
  has no earning yet, write one earning: partner, student, payment id, paid_at, due_at, status `pending`.
- If the metadata is missing, match the student through `solo_students.whop_membership_id`.
- `whop-checkout` refuses a second checkout while Premium is active, so a monthly student moves to yearly only
  after the monthly ends. That's fine; no change.
- The same payment arriving twice must not make two earnings.
- `refund.created` / `dispute.created` for that payment, while not yet paid: status `void`.
- The membership events stay exactly as they are; this is added beside them.

### 5. Partner sign-in and dashboard

- Partners sign in with an email code, the same 8-digit Supabase email code solo uses. Solo's code sign-in only
  works for existing accounts (`shouldCreateUser: false`), so approval creates the sign-in account, or links the
  existing one if that email already has one. Signing in as a partner never creates a solo student.
- Cloud look **(Saagii)**, phone and laptop, built from the existing shadcn components in `src/components/ui`.
- What's on it (agreed in chat):

```
flowersos · Partner                                   BRODY
Your link   flowersos.co/solo?ref=BRODY            [Copy]
Your code   BRODY                                  [Copy]

  Signed up    In trial    Paid yearly    On its way    Paid to you
     24            5            6             $40            $20

How you get paid
You earn $10 when a student you invited pays for the yearly plan. Your $10 is
due 14 days after they pay, as long as they don't get a refund in those 14
days. For most students that's 21 days after they sign up.

Your invites
3 Dec    Yearly, paid 10 Dec       $10 due 24 Dec
1 Dec    In trial, ends 8 Dec      —
28 Nov   Monthly                   No payout (monthly)
25 Nov   Canceled during trial     No payout
20 Nov   Free                      —
```

- **Dates and counts only, no names or emails (Saagii).** The data comes from a function that returns only the
  sign-up date, a status, and dates/amounts, never a student id, name or email.
- Statuses: Free · In trial (ends date) · Canceled during trial · Monthly (no payout) · Yearly, $10 due date ·
  Yearly, $10 paid date · Refunded (no payout).

### 6. Emails

- **To the partner on approval:** welcome, their link and code, the "How you get paid" text, and how to sign in.
  Uses `supabase/functions/_shared/email-layout.tsx` like the other emails.
- **To admin when an application arrives.**
- **To admin the morning something comes due:** one email listing every partner and amount due that day.
  Scheduled with pg_cron like `trial-reminders` (0153). Morning in Calgary, where Saagii lives (my call: 8:00
  America/Edmonton). Same recipient as the existing lead alerts (saranochir.s@gmail.com).

### 7. Checking it works (my call)

- `WHOP_ENV=production` is on, so the webhook only trusts live-signed events. Sandbox events can't be sent to the
  live project, and the webhook must not be changed to accept them (sandbox payments must never become money owed).
- Before building on the payload: in the **sandbox**, make a no-trial yearly test plan, buy it with the 4242 test
  card, refund it, and read the payment and refund objects through Whop's API. That confirms `metadata`, amount,
  `paid_at`, `plan_id` and the refund's payment id look the way section 4 expects.
- Tests on the database function for every earning rule (see below).
- The admin Payouts tab flags any invited student whose membership (the 0149 billing columns, filled by the
  existing membership events) shows a paid yearly plan but who has no earning. If the payment event ever fails,
  it shows up there instead of going unnoticed.
- A real live purchase and refund stays optional and is Saagii's call (already in `flowersos/plan-2026-11-20.md`).

## Constraints

- Code lives in `~/Developer/tsetsegs` (GitHub `SaagiiSG/tsetsegs`). Lovable applies migrations and publishes;
  a push isn't live until Saagii publishes.
- Migrations go in `drizzle/migrations/` with the next free number. `origin/main` is at 0162, but the
  `tsetsegs-mainlogin` worktree already uses 0163, so check `origin/main` right before pushing and give the journal
  `when` a value above every one on `origin/main`.
- **The solo sign-up flow is being rebuilt** on `feat/solo-signup-flow` (c6801926, not pushed: split sign-up page,
  paywall after onboarding). The invite code box goes into that new sign-up page, so build this after it lands.
- Never push without checking `origin/main..HEAD`; sibling sessions share worktrees.
- Mac has 8 GB: one build or test run at a time.
- Plain sixth-grade English on every partner-facing screen.

## Left to the builder

- Table and column names, RLS, and the exact functions.
- Route names (suggested: `/partner` to apply, `/partner/sign-in`, `/partner/dashboard`, admin `/admin/partners`).
- Email wording beyond the rules above; spam limits; empty states.
- How the dashboard works out "Monthly" vs "Yearly" from the 0149 billing columns.
- Tests: the earning rules (yearly only, first only, $0 ignored, duplicates, refund/dispute void, due date on day
  15 UTC) are where real bugs hide, so they get tests.
