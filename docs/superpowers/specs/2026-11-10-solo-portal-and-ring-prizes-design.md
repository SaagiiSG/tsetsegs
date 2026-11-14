# Solo portal and daily ring prizes: design

Date: 10 Nov 2026. Owner: Saagii. Related notes: `flowersos/research_notes/tax-and-payments-2026-11-10.md` (payments, tax), `.lovable/plan/solo-sign-up-google-apple-microsoft-email-google-connect-for-2026-10-19.md` (the older solo plan this replaces in part).

## Why

Solo (international) students sign up on their own and have no teacher or class pushing them. The app has to bring them back every day. Saagii's answer has two parts:

1. **Daily rings that pay.** Every student already has three daily rings (Speed, Hard, Medium). Closing one should pay a points prize, with an animation worth chasing.
2. **A solo portal.** It is the same student portal centers already have, opened to students who sign up themselves, with a global solo leaderboard and a free tier.

Payments come later (Part 3 below). They wait on the payment provider choice, A or B in the tax note.

## Decided by Saagii

- Rings pay a points prize when they close, and **a harder ring pays more**.
- The prize is visible in **the ring card on the home page** and in **the ring pill at the top**.
- Closing a ring plays a **cool animation**.
- All of this applies to **all three portals**: the main student portal, the center portal and the solo portal.
- Solo students sign up for free with **no card**. Free gets:
  - **30 Math questions and all 900 English questions** (Saagii, 12 Nov: English is free for every student and no longer part of Premium; it replaces the earlier 100 English)
  - **never the 68 or 150 sets**: no tab, card or lock for them (Saagii, 12 Nov)
  - **10 speed sessions a day**
  - **1 of the 6 practice tests**
  - **the first lesson of each video topic**
  - full badges, streak, analytics and review
  - **no step-by-step explanations**: these are Premium, and only Math questions have them
- Premium costs US$19/month or US$39/year, with a card-upfront 7-day trial and a reminder 2 days before it ends. If the trial ends unpaid, the student drops back to Free. Prices are fixed; don't relitigate them.
- Refunds (Saagii, 12 Nov): monthly and yearly both refundable. A refund drops the account to Free at once (`plan` free, `premium_until` now). 14-day window and one refund per account are my calls, written in /terms#refunds.
- Solo students get a **global leaderboard** with **automatic 3-week seasons, back to back**.
- No pricing goes on the educator page.
- The 68 set and the practice-test questions are our own originals and stay as they are; no variants needed (Saagii, 12 Nov).

## Part 1: ring prizes (main, center, solo)

### How much a ring pays (my call)

A ring pays its goal times a rate per unit:

| Ring | Rate per unit |
|------|---------------|
| Speed | 10 points per run |
| Hard | 5 points per question |
| Medium | 2 points per question |

- With the default goals (2 / 5 / 10), that's 20 / 25 / 20.
- Closing all three rings on the same day adds **+25**.
- A bigger goal pays more, and Hard pays the most per unit. That's how "harder ring pays higher" works.
- A tiny goal pays a tiny prize, so setting goals to 1/1/1 doesn't farm anything.
- The goal counted toward the prize is capped at speed 5, hard 15 and medium 30. Goals above that still work; they just don't pay more.

### Rules (my calls)

- **Once per ring per day.**
  - The day is the center's day for the center and solo portals (the `portal_settings.timezone` the sprints already use).
  - It's Ulaanbaatar's day for the main portal, whose students are in Mongolia.
- **The server decides.**
  - It recounts today's progress from the database and reads the goal from the database before paying.
  - The browser only asks.
  - Paying twice is impossible: a unique (student, day, ring) row.
  - This matches every other point in the app (AGENTS.md: points are decided by the database).
- **Main portal:**
  - A new point category, `ring_prize`, goes through the existing `point_transactions` + `guard_point_transaction` path.
  - `student_points_allowed` (last defined in drizzle 0051) gains a branch that checks the ring is really closed today and not yet paid.
  - It counts toward sprints and leagues, unlike `streak_daily`.
- **Center and solo portals:**
  - A new table holds paid prizes.
  - `tenant_student_board` adds them to each student's points, so they count on the sprint board and the all-time board.
- **Goal changes:** a student who closes a ring and then raises the goal doesn't get paid again that day.

### What the student sees (Saagii's ask; layout is my call)

- **Ring card on the home page (the shared `DailyRing`):**
  - Each ring's row shows its prize, e.g. "+25".
  - Once paid, it shows a check and "+25 earned".
  - The all-three bonus shows under the rings.
- **Ring pill at the top:**
  - The pill shows `1/3` plus the points still to win today, e.g. `1/3 · +45`.
  - When all three are closed, it shows `3/3 · +90 ✓`.
  - The main portal's top bar gets the same pill if it doesn't have one.
  - The pill still hides on phones like today, where the ring card on home carries it.
- **Closing a ring:**
  - The ring pops and glows.
  - Confetti bursts in that ring's colour (`react-confetti` is already installed).
  - A "+N" flies into the today-points chip (the existing `emitPointsEarned` / `PointsFlyer`).
- **Closing all three:** a bigger full-screen moment, "All rings closed, +25 bonus".
  - In the center and solo portals, it waits its turn in the existing pop-up queue (`usePopupTurn`) so it never stacks on a badge or rank pop-up.
- Students who prefer reduced motion get the points and a still version, with no confetti.

## Part 2: solo portal

### Shape (my call)

The solo portal **is the center portal**, running for one built-in center called "flowersos" (slug `solo`). It lives at `flowersos.co/solo`, mounted the way `/demo` mounts `CenterPortalApp` under a base path.

- Every improvement to the center student portal reaches solo students automatically: rings, speed, tests, review, analytics, badges, streak and leaderboard.
- This replaces the 19 Oct plan's separate solo tables.

### Joining

- `/solo` becomes the solo sign-in page, replacing "Solo accounts are closed for now".
- Sign-in methods:
  - **Google** uses the existing `lovable.auth.signInWithOAuth`.
  - **Email** uses a one-time code.
  - Apple and Microsoft come later, once we confirm Lovable Cloud supports them.
- After sign-in, a `solo_join()` database function joins the student to the solo center.
  - It's SECURITY DEFINER, uses only `auth.uid()` and the token's email, and is safe to call twice.
  - It creates the `tenant_students` row with:
    - no class
    - a placeholder phone
    - `email_verified_at` set, so the center Google nag never shows
  - It also creates the `solo_students` row, and never touches staff tables.
- **No solo accounts from Mongolia (Saagii, 10 Nov).** Mongolian students get the platform by paying for the Flowers SAT course, so solo account creation is blocked for them. We can only see location, not nationality, so "Mongolian" means (my call):
  - **On the device:** the existing `deviceLanguage()` (`src/lib/publicLanguage.ts`) returns `'mon'`, meaning the device is on Mongolia time or set to Mongolian. `/solo` then shows a block screen in Mongolian and English instead of the sign-in buttons: "Solo accounts are for students outside Mongolia. In Mongolia, flowersos comes with the Flowers SAT course." It links to `/?lang=mon`.
  - **On the server:** `solo_join()` refuses to create a solo student when the request's Cloudflare country header (`current_setting('request.headers', true)::json->>'cf-ipcountry'`) is `MN`. A missing header lets the join through, so a header change can't lock everyone out. A VPN gets past both checks; that's accepted.
  - Only creating a solo account is blocked. An existing solo student who travels to Mongolia keeps their account.
- **Names on the board:**
  - Solo students are strangers to each other, so the board shows **first name + last initial**, e.g. "Saran S.".
  - The full name stays in `solo_students`.
  - Doing this at join time means the board and profile functions need no change.

### Leaderboard and seasons

- One board for all solo students.
- The solo center gets one 21-day sprint row with `auto_next = true`. The existing `tenant_sprints_current` then rolls 3-week sprints back to back, in seasons, with no admin needed.
- Splitting the board into groups of ~55, the way the main app's leagues do, is later work, once there are enough students.

### Center bits

- Live game already hides with no class.
- Announcements stay; they're a way to message solo students.
- The portal shows the flowersos name and logo.
- The billing block function refuses the solo center, because a mistaken block would lock out every solo student.

### Free tier, enforced by the database (my calls)

This copies the demo-slice pattern (drizzle 0108): read rules already say "demo users only see the demo slice".

- **Free slice table:** a `solo_free_slice` table lists the free question ids (30 Math + 100 English), the one free practice test and the free video lessons (the first lesson of each topic).
- **Read rules:** the rules for questions, tests and videos get the same kind of branch. A solo student without premium (`solo_has_premium`, drizzle 0034) reads only the free slice. Premium reads everything centers read.
- **Speed limit:** the 10-a-day speed limit is checked in the speed-run guard trigger for free solo students. The speed lobby shows "x of 10 left today".
- **Which questions (my call):**
  - The free Math questions are spread across the four Math topics, from the CB set.
  - The free English questions are spread across the four English topics. Since 12 Nov (drizzle 0131) every English question is free: the read rule lets a free solo user read any active English row, and the 100 English slice rows no longer matter.
  - Saagii can swap any of them by editing the table.
- **Locked items:**
  - Locked tests and videos show a small lock and "Try Premium free for 7 days". The 68 and 150 sets are hidden from free users instead (12 Nov).
  - Until checkout exists, that button goes to the pricing section.
- **Finishing the free questions (Saagii, 11 Nov):**
  - A free solo student never earns the CB master badge. Solving the 30 free questions isn't the whole set.
  - When they finish the free Math questions, they see a congratulations page for completing the free section, with the "Try Premium free for 7 days" button. English has no free section to finish (12 Nov).
- **Explanations:**
  - Hidden on screen for free solo students.
  - **Known gap:** the explanation text sits in the same question row the free student can read, so a determined student could fetch it. Closing this needs a server-only explanation read, which is follow-up work before launch.

## Part 3: payments (not in this round)

These wait on provider A or B: checkout, trial, the 2-day reminder (pg_cron + `sendTemplateEmail`), and webhooks that set `solo_students.plan` / `premium_until`. A refund webhook sets the student to Free immediately. The app keeps its own record of who's premium, so the provider only reports paid, cancelled or failed.

## Going live

1. Push to main with Saagii's OK.
2. Ask Lovable to apply the new migrations. Check the next free number and the journal `when` on origin/main first.
3. Run live checks.
4. Publish.

**Sign-up opens only when Saagii says so.** It reverses the 28 Oct "solo closed" rule. AGENTS.md's line "Solo sign-up is closed until there's a paywall" must be updated in the same change: the free tier is gated by the database, and paid parts stay locked until the paywall.

## Not doing now

- Checkout, trial and webhooks
- Apple / Microsoft sign-in
- Board groups
- Server-only explanations
- Pricing on the educator page
