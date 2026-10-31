# Live demo: the real portals, in a sample center

Date: 30 Oct 2026. Branch: `feat/live-demo`. Mockup: `2026-10-30-live-demo/picker-mockup.html` (open it in a browser; the three pictures sit next to it).

## Why

Today `/demo` is its own copy of the three center portals, hand-built with fake data (`src/demo/InvestorDemo.tsx`, 223 lines, plus `demoData.ts` and `useDemoSession.ts`). Every time someone improves a real portal, the demo falls further behind. Saagii finds it clunky.

He wants the demo and the real center portals (admin, teacher, student) to **share the same code**, so that when anyone improves a portal, the demo improves on its own. The landing pages already do the selling; the demo's only job is to be the real product.

Who opens it:
- People who press "I am an educator" on flowersos.co, then one of the three demo buttons on `/educators`. Misheel will show `/demo` at Web Summit (Lisbon, 9–12 Nov 2026), often on her phone.
- People who press "Try the demo" on the homepage (`src/pages/Index.tsx:32`), and the two demo links on `SoloWelcome.tsx:45,53`.

## Goals

1. **The demo runs the real portal code.** It mounts `CenterPortalApp` and everything under `src/portal/` unchanged, signed in as sample people in a sample center. The only demo-only code is: the picker dialog, the floating bar, starting and ending a demo, and making the sample data.
2. **All three sides, truly.** Every page a real center admin, teacher and student sees is there. Nothing is removed. (Saagii: "all the three stage of the platform should be reflected truly".)
3. **A private copy per visitor.** Each visitor gets their own copy of the sample center, deleted after 15 minutes. All three sides share that copy, so an answer saved as the student shows up in the teacher's and admin's numbers.
4. **Only a small slice of the question bank.** Demo visitors can read about 55 questions and a few concept videos, never the full International bank, through any route.
5. **Realistic sample data.** The center looks like a busy real one: weeks of practice, streaks, ranks, a sprint, attendance, weak topics.
6. **The homepage dialog with live mini portals** (below).

## What the visitor sees

### The picker dialog (decided by Saagii)

- "Try the demo" on the homepage opens a dialog **80% of the screen wide and 55% tall**, on top of the homepage.
- Inside are **three cards side by side**: Student, Teacher, Center admin. Each card has a picture area, a title, one line of text and an arrow button.
- The picture area shows the **whole portal screen**, shrunk to fit. Nothing is cropped.
- **Each card shows a live mini version of its portal**, not a screenshot. When the dialog opens, the visitor's sample center starts, and each card shows **that portal's own loading animation** while it loads. Then the live portal appears in the card. The point is to catch the visitor's eye.
- The mini portals render at a normal desktop size (about 1440×900) and are scaled down to the card. The visitor can't click inside a mini portal; clicking anywhere on a card picks it.
- **Picking a card grows that live portal to full screen.** It's already loaded, so there's no second wait. The sample center and the logins carry over.
- The approved look is in the mockup. Its wording ("Try FlowersOS", "Pick a side…", the card lines, "Made-up students, nothing real. Your changes are deleted after 15 minutes.") is my placeholder, not Saagii's.

### Inside the demo

- The **floating bar** stays as it is today (`InvestorDemo.tsx:99-103`): Student / Teacher / Admin switch, time left, "End demo". Switching sides shows that role's portal for the same copy.
- When time runs out, or after "End demo", show the ending screen that exists today (`InvestorDemo.tsx:93`): "Start a new demo" and "Book a call" (to `/educators#book`, keeping the `ref` lead source).

### My calls (Saagii can change these)

- **`/educators` buttons skip the dialog** and go straight to the side that was picked (`/demo?role=…&preview=educator&lang=…&ref=…`), with the floating bar to switch. The other two sides load the first time the visitor switches.
- **Links that point at `/demo` with no role** (the `SoloWelcome` links, old bookmarks of `?signup=practice`) open the same dialog on `/demo`.
- **Phones:** three cards side by side don't fit. On narrow screens the cards stack in one column, each mini portal renders at phone size, and each one starts loading only when it scrolls into view, so a phone never runs three at once.
- **Language:** the dialog follows the homepage language (`lang`, Mongolian or English) the way `Index.tsx` does with `text(mn, en)`. The portals already handle language themselves.
- **Sample names:** center "Northside Academy". The visitor plays student **Maya Chen**, teacher **Ms. Rivera** (Elena Rivera) and admin **Daniel Brooks**. Classmates: Ethan Park, Sofia Alvarez, Liam Patel, Zara Ahmed, Lucas Silva, Noah Kim, Ava Johnson and others. All made up.
- **If the sample center fails to start** (limit hit, server error), the cards show still pictures of the three portals and the visitor can try again. The dialog is never empty. The pictures are taken from the sample center by a script, so refreshing them is one command.

## How it works underneath

### 1. The sample center and the visitor's copy

- Each new demo gets **its own sample center, built fresh by one database function** (changed in planning, 30 Oct: generating is simpler than copying a stored template, and every date is relative to now, so the streak is current and the heatmap shows this week). It has its own slug and three hidden sign-ins (student, teacher, admin). The function seeds a fixed random number so every visitor sees the same center.
- About **25 students in 2–3 classes** (e.g. "Fall Cohort A", "Fall Cohort B", "Spring Intensive"), weeks of practice history, a running sprint with a leaderboard, ranks, attendance, homework, a few test scores, a couple of students flagged as needing attention. Maya Chen should look like a keen student: a long streak, Gold rank, most of her daily rings closed.
- **The sample history must look like real use** (hundreds of solved questions, topic mastery, an SAT simulation close to or past unlocking), while the visitor can only open the slice's questions. That's a real tension: the student's analytics read question details (topic, difficulty) through `questionMeta.ts:11` and friends. If history points at questions the visitor can't read, analytics break. The builder decides how. Planned: a details-only function, `intl_question_meta`, returns id, subject, skill, category and difficulty (never text, answers or explanations) for any active International question, and `loadQuestionMeta` in `src/portal/questionMeta.ts` calls it. So SAT simulation, topic mastery and the daily rings use the full history. The 68 / 150 / CB set cards still count only the questions the visitor can open, so in the demo they show slice totals.
- The portals pick the center from the subdomain on `*.flowersos.co` and from `?center=` elsewhere (`src/lib/tenant.ts:7-22`). On `flowersos.co/demo` neither works, so mount `CenterPortalApp` with the copy's slug as a prop (it already takes `slug`).
- The portals route to `/admin`, `/teacher` and `/student`. In the demo they must live under `/demo` so a reload stays in the demo. A router basename is one way.
- Things a demo center needs so the real checks let it in: `portal_enabled`, not churned, not blocked, and **no `educator_demo_requests` rows** (`tenant_has_role` in `0033_educator_demo_requests.sql:45-47` refuses centers with an unpaid or unapproved request).
- Seed `onboarding_eligible` so the sample student does not hit first-run onboarding on every visit, unless Saagii wants onboarding shown.

### 2. Logins: three at once, and never touching the visitor's real login

- The Supabase client keeps a single login per browser, under one storage key (`src/integrations/supabase/client.ts:12-18`, no `storageKey`). That file and `previewAuthStorage.ts` are Lovable-generated ("do not edit").
- The demo needs **three logins open together** (student, teacher and admin minis on one page), and must **never sign out or replace a real login** on the same browser. Misheel may be signed in to the real Tsetsegs admin on the same phone.
- So each demo role keeps its login in **its own separate storage key**, apart from the real one.
- A storage wrapper is not enough. Supabase auth also broadcasts sign-in and sign-out between pages on a channel named after the storage key (auth-js 2.81.1, `GoTrueClient.js:166-175`). With the default key, a demo sign-in would reach the real app's listener (`AuthContext.tsx:27`) and the other demo frames (`CenterPortalApp.tsx:37`). **Saagii approved (30 Oct) editing `client.ts`** so each demo role gets its own `storageKey` on `/demo` pages, with real pages keeping the default key. Add a test that fails if that logic is missing, in case Lovable regenerates the file.
- The visitor never sees a sign-in screen or types anything. The sign-ins are invisible plumbing so the real portal code can run unchanged.
- The server creates the three made-up accounts and hands their passwords to the page. **The visitor's own browser signs in, one side at a time** (changed in planning, 30 Oct). If the server signed everyone in, every visitor in the world would share the server's sign-in limit; this way each network has its own. Supabase's default limit is about 30 sign-ins per 5 minutes per network, so before Web Summit ask Lovable whether it can be raised.
- Demo logins use made-up emails on a domain nobody receives mail at (e.g. `…@demo.flowersos.co`) with `email_confirm: true`, so no email is ever sent. They are created by the server (service role), never by the visitor.

### 3. The question slice

- **Built around one whole real practice test** (Saagii's call, 30 Oct): all the math questions of one published practice test (about 44), so the Practice Tests page works with one real test and the sample test scores come from it. Add the math questions with teacher-written Desmos solutions and pictures (that's the edge Saagii sells) and about 5 English questions, for **about 55 questions**. Add **3–5 published concept videos**. The builder picks the test and the exact rows; prefer a test whose questions already have explanations.
- The English explanations in the International bank are College Board's official ones, not the teachers'. Never present them as the teachers' work.
- **Every route a center member can read questions by must respect the slice for demo centers.** From the code today:
  - `intl_questions` select policy "Staff and centers view active intl questions" (`0088_lock_banks_to_staff_and_centers.sql:28-29`, uses `is_staff_or_center_member()`, `0088:8-15`). Center users can read every column, including `answer` and `rationale`.
  - `concept_videos` policy (`0088:35-36`), the `concept-videos` storage bucket (`0088:42-43`), and the `concept-video-url` edge function (`supabase/functions/concept-video-url/index.ts:27-42`, which calls `is_staff_or_center_member` and signs a 3-hour link).
  - Center practice tests: `tenant_practice_tests`, `tenant_test_start`, `tenant_test_state` (`0091:20-57`). `tenant_test_start` copies full International papers.
  - SAT simulation functions `tenant_sat_start`, `tenant_sat_state` (`0014:1-47`). The feature is switched off, but the functions are still callable.
  - Direct reads in portal code: `CenterStudentPortal.tsx:63,528,533,611`, `CenterOnboarding.tsx:32,89`, `LiveSession.tsx:15,57,65,133`, `CenterTeacherPortal.tsx:281`, `CenterPracticeBrowser.tsx:28`, `CenterReviewPage.tsx:31`, `questionMeta.ts:11`, `admin/useCenterAdminData.ts:54`, `CenterPracticeTest.tsx:57`, `CenterStudentPortal.tsx:712`.
  - Enforce the slice on the server (policies and functions), not in the page. Hiding things in the page is not protection.

### 4. Gaps that only check "signed in"

The demo gives every visitor a real signed-in account. Anything in the app that only checks "is this person signed in?" becomes open to the public. Known cases (fix or block for demo users before going live):
- `search_questions` (`supabase/migrations/20260822143804_fe717145-*.sql:6-100`, SECURITY DEFINER, granted to anon and authenticated) reads the **Tsetsegs bank** for anyone signed in. The center admin's Search Questions page reaches it (`src/portal/admin/ToolPages.tsx:17-23` → `useQuestionSearch.ts:72`). This already breaks the bank-split rule for real centers. The admin session has "fix first" on its list (Saagii's center-admin plan, item 4). **It must be fixed before the demo is public.**
- `student-analytics-insights` edge function (`index.ts:13-16`): any signed-in user, no membership check, no rate limit, and it spends Lovable AI credits. Reached from `CenterAnalytics.tsx:85`.
- `question-images` storage bucket: readable by any signed-in user (`0053:11-12`). Check whether the bucket is public anyway; if not, decide whether demo users may read it.
- The builder should search for any other policy or function that trusts plain `authenticated` and check it.

Seen but out of scope (not made worse by the demo): `live_session_question_list` (`0058:22-33`) is open to anon with a join code; `student_lookup` and `student_activate` in `tenant-accounts` have no rate limit.

### 5. Turned off in the demo

Anything that reaches outside the app does nothing for a demo center. **The server refuses it** (that's the real protection), and **the page shows a short "Turned off in the demo" note** where the button is. From the code today:
- **Adding a teacher or admin** (`tenant-accounts` `create_member`, `admin/CenterPages.tsx:46`). **This is the dangerous one:** if the email already has a login, it attaches that existing account to the center (`tenant-accounts/index.ts:146`). A visitor typing a real person's email would link that person's real account to the demo, and cleanup could then delete a real account.
- Resetting a team member's password (`:53`) and resetting a student login (`admin/StudentPages.tsx:229`).
- **Forgot password** on the staff sign-in (`CenterSignIn.tsx:81`) sends real email through `auth-email-hook`. The demo skips the sign-in screen, so make sure no demo screen leads there.
- **Contact support** (`ContactSupport.tsx:16,19`) emails the owner. Mounted at `CenterPortalApp.tsx:102,115`, `CenterHelp.tsx:72`, `admin/CenterPages.tsx:191`.
- **AI insights** (`CenterAnalytics.tsx:85`), because it costs credits.
- Changing your own password (`ChangePasswordForm.tsx:20`).
- Joining a class by QR code or join link from another device (`register` in `tenant-accounts`): turned off, so visitors can't create extra logins in a demo center.
- Anything the three portal sessions add later that sends email, links Google, sends SMS or takes payment must check the demo flag too. Nothing like that is in the portals today. Announcement emails and student email sign-up are planned on the admin side.

Adding students as rows, creating classes, marking attendance, answering questions, and changing goals and settings all work normally inside the visitor's copy.

### 6. Keeping demo data out of real views

Mark demo centers (a flag on the center). Leave them out of everything that counts real centers or real students: the main admin's center list and setup, billing and payment dues, Demo Requests, sprint autopilot (`0021`, `finalize-sprint`), public landing numbers (`landing_public_stats`), and any live count on `/educators` or the homepage.

### 7. Starting, limits, expiry, cleanup

- Opening the dialog (or a `/educators` link) asks the server to make a copy. Nothing starts on page load. The homepage stays as fast as it is.
- **Limits:** a few copies per visitor per hour, plus a cap on how many copies exist at once. Count "visitor" by browser more than by network address: at Web Summit many people share one Wi-Fi. Today's demo caps at 100 at once (`0016:8`) and has no per-visitor limit. The builder sets the numbers. When a limit is hit, show the still pictures and a short "try again in a bit".
- **Expiry: 15 minutes**, as today. The copy, its rows and its three logins are deleted by a scheduled job. Today's demo uses a pg_cron job every minute (`0016:6-8`); reuse that pattern. "End demo" deletes right away.
- **Cleanup only ever deletes logins the demo created** (made-up demo emails), never any other account.

### 8. Loading animations (built into the real portals)

- The student portal already has soft shimmer placeholders (`src/portal/SkySkeleton.tsx`, used at `CenterStudentPortal.tsx:202` and others).
- The shell shows plain "Loading…" text for every role (`CenterPortalApp.tsx:81-83`). The teacher portal shows two pulsing cards while classes load (`CenterTeacherPortal.tsx:569-570`) and "Loading…" text elsewhere. The admin portal shows "Loading…" text everywhere (`admin/ui.tsx:42-43`).
- Give the shell, the teacher portal and the admin portal **proper loading placeholders in their own style**, built into the real portal code, so real centers get them too. The demo cards then show those same loaders. Use the shadcn `Skeleton` component (Saagii's rule: shadcn, never hand-rolled UI).

### 9. Retire the old demo

Once the new demo is live and checked, remove `src/demo/InvestorDemo.tsx`, `demoData.ts`, `useDemoSession.ts` and the `investor_demo_*` functions and table (`0016`, `0017`). Not before: the old demo keeps working until the new one replaces it.

## Build order and file ownership (my calls)

**Timing (Saagii's call, 30 Oct):** the new demo should be live before Web Summit (9 Nov), **phone path first**: the safety work plus the `/educators` buttons (straight into one side, switch with the floating bar). The homepage dialog with live minis follows if there's time before 9 Nov. The old demo stays up until the new one passes a full check.

1. **Server side first.** The demo flag, the template and copying, cleanup, the slice rules, the "signed in only" gaps for demo users, and the "turned off" refusals in `tenant-accounts` and the other functions. This is new migrations and edge functions and touches no portal page.
2. **The demo shell.** The `/demo` route, the picker dialog, the floating bar, mounting `CenterPortalApp`, and the logins.
3. **Portal-page edits last:** the loading placeholders and the "Turned off" notes. Those files are being rewritten by the teacher session (`CenterTeacherPortal.tsx`, `centerContext.tsx`) and the admin session (`admin/CenterPages.tsx`, `StudentPages.tsx`, `ToolPages.tsx`). Do these after those sessions merge to main, on top of their work. Check with Saagii first.
- **`search_questions`** is fixed by the admin session for all centers (it's item 4 on its list). The demo does not go public until that fix is live.
- **Keeping the checks alive:** this work adds demo checks inside shared functions (`is_staff_or_center_member`, `tenant-accounts`, the slice rules). Any later `CREATE OR REPLACE` drops them silently. Add a line to `AGENTS.md` naming those functions, so every session that rewrites one keeps the demo check, and add a database check that fails when one is missing.

## Non-goals

- No rewrite of the portals and no fake-data layer inside them.
- No new sales copy beyond the dialog and the bar.
- Not the main Tsetsegs app. Only the center portals.
- No change to how real centers sign in or work, except the loading placeholders, the server-side demo checks, and the slice rules, which don't affect non-demo centers.

## Anti-goals (a failure even if everything else works)

- A demo visitor can read the full International bank, or any of the Tsetsegs bank, by any route.
- A real email, SMS or AI-credit spend happens because of a demo click.
- A real person's account gets linked to, or deleted by, the demo.
- Opening the demo signs someone out of their real account on the same browser.
- Demo centers or demo students show up in real admin views, billing, sprints or public numbers.
- Demo-only copies of portal pages creep back in. That is the drift this project exists to end.
- Real centers or main students break. Remember 0088 → 0093: a token policy must cover both `anon` and `authenticated`.
- The homepage gets slower for people who never open the demo.

## Constraints

- **Lovable applies migrations and deploys edge functions; Saagii publishes.** Git sync carries front-end code only. Never push a step that needs an earlier migration before that migration is live. Lovable adds its own `apply_pending` files and may renumber.
- **Migration numbers:** main is at `0102`. The teacher session holds `0103` and the admin session `0104`. Take the next free number at build time and re-check before pushing.
- **Three other sessions are editing the portals right now** (student redesign, teacher side, admin side). The teacher session owns `src/portal/centerContext.tsx`. This work touches portal files only where it must: the demo flag checks and "Turned off" notes, the loading placeholders, and mounting under `/demo`. Before changing a file another session owns, check with Saagii.
- Work on `feat/live-demo`; ask Saagii before pushing to main. Never rebase or force-push main.
- Supabase sign-up stays on.
- Lovable's preview build rejects `Array.prototype.at`; use `arr[arr.length - 1]`.
- Use shadcn components (the existing `src/components/ui/*`), e.g. `Dialog` for the picker.
- `AGENTS.md:6` currently says the investor demo stays outside the auth providers. **Saagii approved (30 Oct)** changing it when the build lands, to: the demo signs visitors in automatically as made-up sample people in a throwaway sample center, never real data.

## Decided by Saagii

- The demo and the three portals share the same code, so improving a portal improves the demo.
- All three sides are reflected truly.
- Only a small slice of the question bank, built around one real practice test.
- The new demo goes live before Web Summit, phone path first.
- Edit the Lovable-generated `client.ts` for separate demo logins, and update the `AGENTS.md` demo rule.
- "Try the demo" opens a dialog 80% wide × 55% tall with three cards side by side, each showing the whole portal, not part of it.
- Live mini versions of each portal in the cards, showing their loading animation first, to catch attention.
- Realistic-looking sample data.

## Left to the builder

- How to copy the template (one SQL function, an edge function, or both) and how to shift dates.
- How three logins live side by side (storage wrapper or another way), within the rules in section 2.
- How the mini portals are embedded (e.g. same-origin iframes scaled with CSS) and how a card grows to full screen.
- How history stays realistic while only the slice is readable (section 1).
- Limit numbers, the cleanup schedule, and exactly which rows the slice holds.
- How to generate the template's sample data.

## Open questions

None left. The reviewer's questions were answered on 30 Oct: timing (phone path before Web Summit), practice tests (one real test in the slice), `client.ts` (may be edited), and the `AGENTS.md` rule (update it). The rest became my calls under "Build order and file ownership".

## References

- Research notes behind the file:line facts above were gathered on 30 Oct 2026 from `origin/main` at `bf4aa8d9`, plus the admin branch at `2efce5c3`.
- Earlier decisions: `2026-10-21-educator-landing-page-design.md` (the demo rebuild was deferred there).
