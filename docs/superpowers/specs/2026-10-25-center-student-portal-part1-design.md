# Center student portal — part 1: top bar, sidebar, profile, onboarding

Date: 25 Oct 2026. Owner: Saagii. Status: approved in conversation (top bar, sidebar, onboarding); profile page as written in `flowersos/idea/ideas.md`.

## Why

International SAT centers are about to start paying for FlowersOS. Their students use the **center portal** (`src/portal/`, `tenant_*` tables, real Supabase auth, center subdomain). The pitch to centers is *retention through gamification* — the same thing that makes Tsetsegs' own students say "teacher this is addicting". Today the center student portal has the data (points, streaks, ring, ranks, badges) but not the moments that make it feel alive: the student never sees their points tick up as they work, there is no profile to be proud of, and a brand-new student is dropped on a home page with a goal pop-up and no sense of where to start. Saagii's hand test: "a student at a real center would notice this first".

Success: a new center student finishes a 2-minute onboarding with a daily ring set, is told "Let's close your ring today", practises, and watches their points, streak, rank and ring move at the top of every screen. Later they open a profile that shows what they have built.

## Goals

1. **Top bar on practice screens** (and the other student pages that already have a header).
   - Desktop and tablet: four chips **centered** in the top bar — today's points, streak, rank + league, mini daily ring (e.g. "2/3").
   - Mobile: today's points and streak only.
   - Same meaning and behaviour as the main Tsetsegs student app's `StreakAndRankBar` / `TodayPointsChip`, fed by center data.
2. **Points animation**: when an answer pays points, "+N" flies into the points chip, like the main app's `src/components/student/PointsFlyer.tsx`. Speed runs too.
3. **Sidebar (desktop)**: slim icon rail that opens on hover; navigation items as today, then a separated block: **Profile**, **Settings**, **Dark mode** switch, **Log out in red**. Lucide line icons only — **no emoji anywhere in the sidebar** (Saagii's explicit rule). Tablet/mobile keep the existing movable dock; Profile/Settings/Dark mode/Log out must still be reachable there.
4. **Profile page** for center students, mirroring the main app's `src/pages/student/StudentProfile.tsx` (`ProfileHeader`, `ActivityHeatmap`, `FeaturedBadges`, `PerformanceStatsGrid`, `RankHistoryGraph` …): current badges, activity map, rank history, and basic stats — points collected, questions solved, speed sessions completed. Center data only.
5. **Onboarding** (approved mockup `onboarding-flow.html`), shown once after the student creates their password and before they first see home:
   1. Welcome — "[Center name] set you up on FlowersOS. 5 quick steps, about 2 minutes." Center logo/colour.
   2. When is your SAT? — real upcoming official SAT dates (2026–27: Aug 22, Sep 12, Oct 3, Nov 7, Dec 5 2026; Mar 6, May 1, Jun 5 2027 — only future ones shown) + "Not sure yet".
   3. Taken a practice SAT? — "Not yet" or "Yes, about ___".
   4. Target score — slider 1000–1600, step 50, + "Help me pick" (uses the step 3 answer, so it comes after it).
   5. Which part feels harder? — Math / Reading and Writing / About the same.
   6. One real SAT question from that section (easy, untimed, not seen before) → explanation, points, ring starts filling. Counts like any practice answer.
   7. Set your daily ring — the existing Intense / Gradual / With the flow choices from `CenterGoalDialog`, defaulted from the SAT date, with honest maths ("About 20 questions a day. Your Math score prediction unlocks in about 3 weeks." — the prediction is Math-only, so the copy says so) → "I'm in".
   - Then home opens with a pop-up: **"Let's close your ring today"** — ring with today's progress, "You're 30% there. 14 more questions.", button **Start practicing**.
   - Layout: desktop 50/50 split (left: center colours/logo + a picture that reacts to answers; right: question + big buttons); phone: picture becomes a short band on top, button at the bottom by the thumb. Thin progress bar on top. Steps 2–5 skippable; step 7 has a default so one tap works. Answers save as they go; a closed tab resumes where it stopped. Reminders are not asked here.
   - The onboarding **replaces** today's first-visit "Set your daily ring" pop-up for new students. Existing students who already set a ring never see onboarding.

## Non-goals (this part)

- Concept videos by topic, practice tests + history, colour pass / badge pop-up redesign (part 2).
- Study planner, swipe-up practice, social features (part 3, separate conversation).
- Any change to the main Tsetsegs app, scoring rules, or the solo-student product.
- Push/browser notifications.

## Anti-goals (would be a failure even if it "works")

- Emoji in the sidebar; generic AI-looking illustrations.
- Onboarding that feels like a quiz-funnel: no fake urgency, scare screens or streak-loss threats (research: `flowersos/research_notes/onboarding-research.md`, "what not to copy").
- Showing numbers that aren't real (no placeholder ranks/points; today's rank chart had fake data once — never again).
- Breaking an existing center student's flow (they must not be forced through onboarding).

## Constraints

- Center portal rules: data from `tenant_*` tables and existing functions (`tenant_student_board`, `tenant_student_profile`, `tenant_student_goals`, `tenant_attempts.points`, `tenant_speed_runs`); students only see their own center.
- Use existing shadcn (base-nova) components and the portal's "sky" design language; reuse main-app components where they work with injected center data rather than copying them.
- Every database change is a migration in `drizzle/migrations/` applied via Lovable; RLS like the rest of the portal (students read/write only their own rows).
- Mobile-first: students open links on phones (often from Instagram/Messenger).
- English copy for international centers; plain, short.

## Decided by Saagii

- Chips centered on desktop/tablet; points + streak only on mobile.
- Hover sidebar with Profile, Settings, Dark mode, red Log out; no emoji.
- Onboarding steps 1–7 as above, ending with the ring set and the "Let's close your ring today" pop-up.
- Profile contents: badges, activity map, rank history, basic stats (points, questions solved, speed sessions).

- **SAT date (step 2):** if the center admin already set the student's SAT month (`tenant_students.sat_month`, SAT Schedule page), pre-fill step 2 with that month's real SAT date; the student can change it. Their choice saves to their own ring (`tenant_student_goals.sat_date`) only — the admin's `sat_month` is not changed, so the two can differ.
- **Profile visibility:** tapping a classmate on the center leaderboard opens their **full** profile (badges, activity map, rank history, basic stats), like the main Tsetsegs app — replacing today's small `CenterStudentProfileDialog`. Same center only; never phone numbers. This needs a narrow SECURITY DEFINER read for classmates' profile data (students may still only *write* their own rows).

## My calls (Claude) — open to change

- Onboarding answers are stored on `tenant_student_goals` (it already holds `sat_date` and the ring) plus new nullable columns: `target_score`, `prior_score`, `weak_section`, `onboarding_done_at`.
- **Who sees onboarding:** only students whose `tenant_students` row was created after this ships (cutoff = release timestamp, stored in the migration). Everyone created before skips it entirely; if such a student has no goals row, they keep today's one-time "Set your daily ring" pop-up. Nobody existing is ever forced through it.
- **Step 6 question:** medium difficulty (the ring counts only correct medium/hard questions and speed sessions, so an easy question couldn't move it — no scoring rule changes). Correct → "+10 points, your ring moved". Wrong → explanation, one retry allowed (normal rule: a correct 2nd try pays 5). If still wrong: "Good try — here's how it works", continue; copy never promises ring progress it didn't make.
- The "Let's close your ring today" pop-up shows once per day on first home visit until the ring is closed that day, not only after onboarding (so it keeps working as a daily habit). Dismissible.
- Rank chip shows the student's place in the current center sprint and their league; if there is no active sprint it shows all-time place.
- "Help me pick" on the target score suggests prior score + 150 (capped 1600), or 1300 if unknown.

## Left to the builder

- Component structure, file names, how to share main-app profile components with center data.
- Exact illustration style for onboarding (must match the sky look; no emoji).
- Which question to pick for step 6 (rule: chosen section, easy/medium, not attempted before).
- Analytics of onboarding steps (nice to have: log which step students quit).
