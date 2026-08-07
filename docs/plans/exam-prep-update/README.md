# Exam Prep Update

Plans folder for the pre-SAT "intense prep week" update. One file per workstream.

## Workstreams

1. **Intense Prep Classes** (`01-intense-prep-classes.md`)
   Teachers create a prep class with a join code + QR. Students scan, enter their
   phone, get matched against the student database and added to the roster.
   Roster tracks 68 / Hard 150 / CollegeBoard progress pulled from `/practice`,
   hand-entered official Bluebook math scores, and review-session notes.
   Prep classes never trigger the switched-student alert.

2. **"One last dance with Tsetsegs family" badge** (`02-last-dance-badge.md`)
   Awarded automatically when an existing account joins a prep class by QR.
   Shareable as an Instagram-story-sized card.

3. **Proctored Bluebook sessions** (`03-proctor-sessions.md`)
   Teacher-launched, real-SAT-style run of an existing Bluebook test:
   6-character join code, separate unlock code read out loud, oath screen,
   timed modules with breaks, focus locking, teacher monitor.

4. **Flowers Challenge** (`04-flowers-challenge.md`)
   Student-side competition in `/practice`.
   - Challenge 1: 22 hardest questions from the 68 set — 20/22 in under 20 min.
   - Challenge 2: 22 hardest from the Hard 150 set — same goal.
   Server-side grading, per-challenge leaderboard, badge on goal met.

## Backend already in place

Tables: `proctor_sessions`, `proctor_participants`, `flowers_challenge_attempts`;
`intense_prep_groups.join_code/start_date/end_date`;
`intense_prep_members.student_account_id/joined_via_qr`;
`intense_prep_tracking.bluebook_math_scores/review_notes`.

RPCs: `prep_class_join`, `proctor_join`, `proctor_unlock`, `proctor_accept_oath`,
`proctor_save_progress`, `proctor_submit`, `flowers_challenge_submit`,
`flowers_challenge_leaderboard`.

Badges seeded: "One last dance with Tsetsegs family", "Flowers Challenge: 68",
"Flowers Challenge: Hard 150".
