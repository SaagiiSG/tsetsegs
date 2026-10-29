# Center student portal — part 2: concept videos by topic, practice tests, badge colours

Date: 28 Oct 2026. Owner: Saagii. Status: approved by Saagii 29 Oct ("that looks about right"). Part 1 (top bar, rail, profile, onboarding) is live on main as of fc23c8b1.

Supporting files in `docs/superpowers/specs/2026-10-28-center-student-portal-part2/`:
- `videos-mockup.html` — the three directions shown; Saagii picked **A. Topic units**. (A body fragment; the brainstorm server wrapped it in a page.)
- `topic-sorting.html` — the topic sorting Saagii approved ("looks aight").
- `topics.json` — the same sorting as data: 26 topics `{topic, name, area, videos: [{id, order_index, title}]}`. All 129 published videos, each placed once. Topics 7 and 23 are empty.

## Why

International SAT centers are about to pay for FlowersOS, and the pitch is retention through gamification. Misheel shows the product at Web Summit (9–12 Nov). Part 2 finishes the center student side from Saagii's `flowersos/idea/ideas.md`:

- **Concept videos:** "divided by the 26 topic from the collegepanda book and collapsable … add in more design elements … scrolling down to it felt like I am walking through desert." Today the center videos page is one long grey path with no topics.
- **Practice tests:** "add in the practice tests into the center student portal without the videos + and my test history." Center students can't take a full practice test today.
- **Colour:** "add in much more colors into the customer student side portal UI (the badge pop dialogue)." Today center badges are grey cards with one icon, and nothing happens when a student earns one.

Success: a center student opens Concept videos and sees the book's topics as colourful units. They know where they are, and can jump to the topic their teacher is on. They take a Tsetsegs practice test and find it in their test history. When they earn a badge, the colourful pop-up celebrates it.

## Goals

### 1. Concept videos by topic (look: mockup option A)

- **Units.** One unit per College Panda topic, in book order, with the book number kept: "Topic 12 · Quadratic Equations". Topics 7 (Interpreting Linear Equations & Models) and 23 (Reading Data) have no videos and are not shown. Saagii: "they are easy, they don't need a separate video". So 24 units, and the numbering skips 7 and 23.
- **Banner.** Each unit has a coloured banner showing the topic number, name and "x / y watched". The colour comes from the topic's SAT area (`area` in topics.json):

  | Area | Colour |
  |---|---|
  | Advanced Math | violet `#7B6CF6` |
  | Algebra | blue `#3B8DF5` |
  | Problem Solving & Data | orange `#FB8A4C` |
  | Geometry & Trig | pink `#E07CC8` |

  These are my call, as in the mockup. They need dark-mode versions that still read well.
- **Path.** Under each banner is a winding path of chunky round buttons, Duolingo-style, like today's `VideoRoadmap` nodes but in the unit's colour. Each button shows done, open or locked. Each unit also has a flat picture beside the path and a chest at the end. "More design and graphic elements", so the page stops feeling like a desert.
- **Tapping a button** opens the existing video dialog, with the title and the same "mark as watched" that writes `tenant_video_progress`. Progress already saved stays saved.
- **Collapsible.** Every unit folds. Use the shadcn Collapsible from the house set.
- **Search and the label filter stay as they are.** While filtering, show today's flat results list.
- The dashboard's `RoadmapPreview` follows the same "Up next".

### 2. Topic data (database change, applied by Lovable)

- Put each video's topic into the existing `concept_videos.module` field, from `topics.json`. The admin Concept Videos page already edits Module, so Saagii can move a video later without code.
- Fix two mislabels:
  - order_index 117 "Probability- Introduction, Examples": `domain` changes from 'Geometry & Trig' to 'Problem Solving & Data'.
  - order_index 16: "Factoring Quadractic Equations 1" becomes "Factoring Quadratic Equations 1".
- **Book order.** Renumber `order_index` so the videos run in book order: topic 1 first, and inside each topic the current relative order. Saagii: "put the concept videos topics in book order". Today's order doesn't follow the book: topics 3 and 4 interleave, topic 16 (69–81) sits before topics 13–15, and video 117 sits between 116 and 118. After renumbering, the admin "roadmap order" dialog shows each topic as one run.
- **The main app has no concept videos.** Saagii, 28 Oct: they are reserved for international centers and solo students, and the main app keeps only the practice-test explanation videos. The removal ships in the separate lock fix (see Related), so this part doesn't touch the main app's videos.

### 3. Practice tests

- **Placement.** A new "Practice tests" item in the rail, right under Concept videos, and in the mobile dock. *(my call)*
- **Tests tab.**
  - One card per published Tsetsegs test (`bluebook_tests.is_published`). All six today are Math. A test published later shows up on its own.
  - Each card shows the test name, the month and year, the module count, the question count and the time.
  - If the student has taken the test, the card also shows their last score.
  - Start becomes Resume while an attempt is unfinished.
  - No year or month filters. *(my call)*
- **Taking a test.**
  - Same experience as the main app's Bluebook test (`StudentBluebookTest.tsx`): the test's modules in order, each timed from `bluebook_modules.time_limit_minutes`.
  - The Desmos calculator, flag-for-review, and the standard SAT reference sheet the main app shows (`ReferenceSheet.tsx`, `sat-reference-sheet.jpg`). Never a module's `reference_pdf_path`: that's the source exam paper, in an admin-only bucket.
  - No break, because the main app only breaks between Reading and Writing and Math.
- **Questions come from the International bank only.** Saagii: a center reads only the International bank.
  - Each test is a list of Tsetsegs-bank rows (`bluebook_module_questions` → `questions`). The engine builds the center paper from the International-bank row with the same `question_id`. Checked 28 Oct: all 263 questions in the 6 tests have an International copy.
  - About 30 International copies differ from the Tsetsegs row (they are variants). The center paper uses the International text, answer and explanation, so what a student sees and how it's graded always match.
  - If a test has a question with no International copy, that test doesn't show for centers. *(my call)*
  - Only 34 of the 263 have an International explanation today. Review shows "No explanation yet" for the rest, and reads explanations live, so new ones (teachers, the SAT parser) appear on old attempts too. *(my call)*
- **Math only.** No English or Full tabs, because there are no English tests yet.
- **No videos anywhere:** no walkthrough-videos tab, and none in review.
- **Score.**
  - Math 200–800, worked out exactly as the main app's `scaleSectionScore` does: 200 + correct ÷ total × 600, rounded to 10.
  - Labelled as a practice score, not an official one.
- **Review after finishing.** Every question in order: your answer, the correct answer, the explanation and figures. Skipped questions show as "Omitted".
- **My test history tab.** Every attempt, newest first, with the test name, the date and the Math score, or "In progress · Module N". Finished attempts open Review; unfinished ones open Resume.
- **Retakes.** Allowed any time. Each attempt is its own history row, and there is at most one unfinished attempt per test. *(my call)*
- **What tests don't count toward.** Tests give no points, the same as the main app. They don't count toward the ring, the streak, the heatmap, badges or "questions solved". *(my call)*
- **Security.** The same rules as the center's existing secure test engine (`drizzle/migrations/0014_center_sat_secure_engine.sql`, `0015_…`):
  - Attempts live in a center-scoped table, never in `bluebook_attempts`, and students read only their own.
  - When a test starts, a server function copies the test's questions into the attempt. Later edits to the test don't change a half-done attempt.
  - Answer keys and explanations are never sent before the attempt is finished.
  - Answers are only accepted inside the module's time, plus a short grace period.
  - Grading happens on the server. *(my call: the main app grades in the browser, but center work is graded on the server everywhere else)*
- **The old hidden test stays off.** The old center "SAT simulation" test (`CenterSAT.tsx`, `tenant_sat_*`, built on the International bank) was switched off by Lovable on 14 Oct as a "mistaken" entry. The 6 Tsetsegs tests replace it as the way center students take a test.

### 4. Badges in colour, plus the pop-up

- **Colours and icons.** The center has 8 badges today (`centerBadges` in `src/portal/centerProfile.ts`): First steps, Centurion, Marathon, Sharpshooter, Regular, and one "master" badge for each practice set. Each one gets:
  - a rarity, from main's `RARITY_COLORS` in `src/data/badgeDefinitions.ts`;
  - an icon, from the set `BadgeUnlockCelebration` already knows.

  Rule: harder badges get rarer colours. *(my call; the exact assignment is the builder's)*
- **Badges page and profile grid.** The badges page and the profile badge grid (`CenterBadgeGrid`, which is also used for a classmate's profile) show earned badges in their rarity colour and icon, in the style of the main app's `StudentBadges.tsx`. Unearned badges stay muted with their progress bar.
- **Pop-up.**
  - When a student earns a badge, they get the main app's pop-up (`src/components/student/badges/BadgeUnlockCelebration.tsx`), reused rather than copied, with Collect / Collect all.
  - No points line, because center badges pay no points. *(my call; no numbers that aren't real)*
  - Main's pop-up must look the same as before.
- **Seen once.** "Seen" is saved on the server per student per badge, so the pop-up never replays on another phone. This is how main's `BadgeCelebrationWatcher` works.
  - Students who already hold badges get those pop-ups once, after this ships. Collect all handles a pile. *(my call)*
  - A badge that is lost and earned again (Sharpshooter's accuracy can dip) doesn't pop again. *(my call)*
- **When it can show** (the same gate as the ring pop-up, see 5):
  - never during a live class game;
  - never over another open dialog;
  - never two pop-ups at once.

### 5. Part-1 leftovers (ledger: `.superpowers/sdd/2026-10-25-center-student-portal-part1/progress.md`, final-review M2/M4/M7/M8)

- **M7.** Onboarding gets a Back button.
- **M8.** A student who picks Reading and Writing in onboarding step 5 sees prediction copy written for Math. Make the copy honest for them, so nothing promises what the app can't do.
- **M4.** The "Let's close your ring today" pop-up can open over a live class game or another dialog. Give it the same gate as the badge pop-up.
- **M2.** A failed read of speed runs shows "0 runs". Show that it couldn't load, not a fake 0.

## Non-goals (this part)

- Teachers or center admins seeing students' test scores. Students only, for now. *(my call; easy to add later)*
- English or full-length tests, walkthrough videos, and turning the old International-bank test back on.
- New badges, or points for badges or tests.
- Study planner, swipe-up practice, social features (part 3).
- Privacy policy and terms pages (separate launch item).
- Main-app changes. The lock fix (see Related) handles the main app's videos and sign-up.

## Anti-goals (would be a failure even if it "works")

- Emoji anywhere, generic AI-looking pictures, or loud colour spilling onto every page. The colour lives in the videos page and the badges. Saagii's eye is quiet and calm, and rank art is flat, one colour family each.
- Numbers that aren't real: no placeholder scores, no fake progress, no "+0 points".
- Locking anything a student could open before, or losing anyone's watched videos.
- An answer key reachable before a test is finished.
- Center results mixed with main-app students' attempts, or readable outside the center.

## Constraints

- **Center portal rules.** Data comes from `tenant_*` tables and SECURITY DEFINER functions keyed by `tenant_my_student_id`. Students see only their own center, and write only their own rows.
- **UI.**
  - Use shadcn (base-nova) and the portal's "sky" look.
  - Reuse main-app components that take injected data; don't copy them.
  - Mobile first, dark mode, no sideways scroll at 375px.
- **Database changes.**
  - Every change is a file in `drizzle/migrations/` (with the journal and snapshot), applied by Lovable from a pasted prompt.
  - Lovable usually saves its own copy under the next number, so check the next free number on origin/main right before pushing. Today 0088 is next.
  - The migration must be live before this reaches main. Then Saagii publishes from Lovable.
- **AGENTS.md.** It currently says the center SAT simulation must never be "a student-taken test". Add a line saying center practice tests (the Tsetsegs tests, center-scoped attempts) are intended. Otherwise a later Lovable edit may remove them as "mistaken", like on 14 Oct.
- **Copy.** English, plain and short.

## Decided by Saagii

- **Videos look:** option A, topic units with chunky Duolingo-style path nodes ("A is nice"), and more design and graphic elements.
- **Topics:** the 26 College Panda topics in book order, collapsible, sorted as in `topic-sorting.html` ("looks aight"). Topics 7 and 23 get no videos.
- **Mislabels:** fix them.
- **Practice tests:** in the center portal without the videos, plus My test history. All 6 Tsetsegs tests are fine for international centers ("give them all 6").
- **Badges:** center students get main's colourful badge pop-up, and the badges page matches its colours ("yes proceed").
- **Question source:** centers read only the International bank, and the main app has no concept videos. Book order for the videos. See Related.

## My calls (Claude) — open to change

- **Unlocking.** Any topic can be started, because centers teach in their own order. Inside a topic, videos unlock one by one.
- **"Up next".** The first unwatched video in the lowest-numbered topic that isn't finished.
- **Folding.** Only the "Up next" topic starts open, and every other banner shows its progress. When everything is watched, all units start folded.
- **Topic storage.** `module` holds the topic name exactly as in topics.json. The code holds the 26-topic list (number, name, area). A video whose module doesn't match a known topic still shows, in a "More videos" unit at the end. It never disappears.
- The area colours, the rail placement, no filters, retakes, and tests not counting toward points, ring, streak, heatmap or badges.
- Server-side grading for tests, and students-only test scores.
- Badge rarity by difficulty, no points line, one-time pop-ups for badges already held, and no repeat pop-up after a badge is lost and regained.

## Left to the builder

- Component structure, file names, and whether the test engine extends `tenant_sat_*` or is a new set of functions. It must follow 0014's rules either way.
- Porting grading to SQL. Multiple choice and student-produced answers (`answer`, `alternate_answers`) must grade the way the main app grades them.
- The pictures beside each unit and the chest. They must be flat, in the unit's colour family, with no emoji. One picture per area reused across its topics is fine.
- The exact rarity and icon for each badge, within the rule.
- How the badge watcher learns a badge was just earned (it can reuse the data the badges page already loads).

## Done means (the "one full check" Saagii asked for)

- **Test setup.** Browser checks on phone (375), narrow (768) and desktop, light and dark, with the zz test center accounts.
- **Concept videos.** The 24 units in order, with banner colours. Folding works. Any topic can be started. A watched video stays watched. "Up next" is right, and the dashboard preview agrees.
- **Practice tests.**
  - One student takes a whole test: timer, calculator, reference sheet, flags.
  - Closing the tab mid-module and resuming works.
  - When time runs out, the test moves on.
  - The score matches the main formula.
  - Review shows answers only after finishing, and history lists the attempt.
  - Another student can't read it.
- **Badges.** A student earns a badge. The pop-up shows once, doesn't come back after a reload or on another browser, and doesn't open during a live game or over another dialog. The badges page is in colour.
- **The four part-1 leftovers** behave as described.
- **Part 1 re-check:** top bar, rail, profile, onboarding, the ring pop-up, and the main app's own profile heatmap (not yet seen in a browser after the 28 Oct fix).
- **Main app.** Its pages and badge pop-up look the same as before.

## Related: the lock fix (separate branch, ships before part 2)

Found during the builder check, 28 Oct. Checked live with zz student 99000001: a center student could read all 2,835 active Tsetsegs-bank questions, answers and explanations included. The cause is `0058_lock_mn_questions.sql` (`TO authenticated USING (is_active)`), which assumed only staff sign in through Supabase. Sign-up was open too (`disable_signup: false`), through the free solo box and a staff "sign up, wait for approval" form.

Saagii decided:
- A center reads only the International bank, with its explanations. That bank includes the 68 set, the SAT-parser questions and the English questions.
- Solo sign-up is turned off for now ("or a strict paywall").
- The main app has no concept videos, only the practice-test explanation videos.

Part 2 assumes this fix is live.
