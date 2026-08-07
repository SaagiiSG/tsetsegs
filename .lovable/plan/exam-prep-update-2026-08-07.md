# Exam Prep Update

Four connected builds for the week-before-SAT push: prep classes with QR registration, a farewell badge, teacher-proctored Bluebook sessions, and the Flowers Challenge.

## 0. Plans folder

Create `docs/plans/` in the codebase for keeping plans long-term, with a subfolder `docs/plans/exam-prep-update/` holding this plan plus per-feature notes as each piece ships.

## 1. Intense prep classes (extends the existing Intense Prep system)

The current `intense_prep_groups / members / tracking` tables stay and get extended rather than replaced.

**Teacher side**
- New "Intense" button in the teacher dock opening `/teacher/intense-prep`.
- Create a prep class: name + start/end date. Registration auto-closes after the end date.
- Every prep class gets a join code and a QR poster screen (full-screen, projector friendly) plus a live "who just joined" list.
- Prep classes are shared: any teacher can open and edit any prep class roster.

**Student registration by QR**
- QR points at a public route. Student enters their phone number.
- Phone already in the database → name is pulled and they're added to the prep class immediately, and they receive the farewell badge (see part 2).
- Phone not found → they run the existing student onboarding/registration flow, and on completion are attached only to this prep class.
- Prep-class membership never fires the "switched student" duplicate-phone alert.

**Roster tracking table** (one row per student, mixed auto and manual data)
- 68 / 150 / CB: compact progress bars pulled live from their practice account; tap a bar for solved count, accuracy and last activity.
- Official Bluebook practice tests: hand-entered, math score only, multiple entries per student.
- Review session notes: free-text per student, editable inline, records who last edited.
- Platform results: proctored Bluebook sessions and Flowers Challenge attempts they've completed, read-only.

## 2. "One last dance with Tsetsegs family" badge

- New badge, awarded only when an existing account holder scans a prep class QR and joins.
- Appears in the `/practice` badge collection with a nostalgic sunset look (purple/pink gradient, confetti feel).
- "Share to story" generates a 1080x1920 image with the badge art, the student's name and their tier, downloadable and shareable from mobile.

## 3. Teacher-proctored Bluebook sessions

Real-exam feel, run live during a review session.

- Teacher starts a session and picks which finished Bluebook test to run.
- Students scan the session QR to land in a lobby. The teacher reads out a fresh 6-character code; students type it to unlock the start.
- Before starting, each student types out the oath word-for-word.
- The test runs as real Bluebook: timed modules with a break between them.
- Focus-lock warnings are counted per student and surfaced to the teacher.
- Teacher live roster: who's in the lobby, who's started, who's submitted, plus force-end.
- Results land on the existing Bluebook attempt records so student and teacher views both pick them up, and feed the prep roster's platform-results column.

## 4. Flowers Challenge (student side, in /practice)

Two fixed challenges, open to every student:
1. 22 hardest questions from the 68 set — goal 20/22 in under 20 minutes.
2. 22 hardest questions from the Hard 150 set — same goal.

- Both modes: solo timed attempt anytime, and optional live rooms to race friends using the existing challenge lobby.
- Unlimited attempts; the best result (score first, then time) is what counts.
- Public leaderboard per challenge with score and time.
- Hitting the goal awards a badge. Points are awarded for attempts.
- Challenge attempts stay isolated from regular practice stats and streaks.

## Technical notes

- Database: add `join_code`, `start_date`, `end_date` to `intense_prep_groups`; add bluebook math score entries and note metadata to `intense_prep_tracking`; new tables for proctored Bluebook sessions (session, roster, oath/code state, focus violations) and Flowers Challenge attempts. New badge rows for the farewell badge and the two challenge badges. Grants + RLS on every new table, with an anon-readable path for the public QR join and a security-definer RPC for phone lookup so no roster data leaks.
- Prep QR join reuses the phone-normalization and `is_enrolled_phone` logic already used by exam join, and explicitly skips the switched-student alert path.
- Hardest-22 selection reuses `pick_hardest_questions`, parameterized per question set.
- Proctored sessions reuse the 68-exam architecture: offline-first paper download, periodic server drafts, server-side grading on submit, and `finalize`-style grading for students who never hit submit.
- Story-card image is generated client-side on canvas so there's no egress cost.
