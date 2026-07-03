# Ambient Challenge Tracking

Shift challenges from a dedicated play page to a background goal that fills up as the student practices normally.

## Behavior

- When a challenge is `active` and its format is `first_to_points`, `first_to_correct`, or `time_sprint`, the student stays on `/practice` (or `/english-practice`). Every regular question they answer also counts toward the challenge.
- The existing `ActiveChallengeHUD` at the top of the screen remains the live scoreboard — progress bar, opponent status, and a "View" button that opens the lobby/leaderboard sheet instead of `ChallengePlay`.
- `fixed_set` keeps using `ChallengePlay` (it needs a fixed shared pool — can't be tracked from ambient practice).
- Subject gate: math challenges only count math practice attempts; english challenges only count english practice attempts.

## Implementation

### 1. Shared helper `src/lib/challengeAmbient.ts`
`recordAmbientChallengeAttempt({ studentId, subject, questionId, isCorrect, timeMs, difficulty })`
- Look up the student's single `active` challenge whose `subject` matches and whose `format ∈ {first_to_points, first_to_correct, time_sprint}`.
- Compute points with existing `calculatePoints`.
- Insert into `challenge_attempts`. The DB trigger `process_challenge_attempt` already updates participant score/correct_count and finishes the challenge when the target is hit.
- No-op if no eligible challenge, or if this `(challenge_id, question_id, student_account_id)` already has an attempt (avoid double-count on retries).

### 2. Hook the practice attempt sites
Call the helper right after every existing `student_attempts` insert on these paths:
- `src/pages/StudentQuestion.tsx` (math practice question)
- `src/pages/student/StudentEnglishQuestion.tsx` (english practice question)
- `src/pages/student/StudentReadingModule.tsx` (english passage set)
- `src/pages/student/StudentSpeedSession.tsx` — skip (speed mode has its own rules)

Fire-and-forget so it never blocks the UI.

### 3. Route change on challenge start
- `ChallengeLobby.tsx`: when host starts a `first_to_points | first_to_correct | time_sprint` challenge, navigate participants to `/practice` (math) or `/english-practice` (english) instead of `/practice/challenges/:id`.
- `ChallengePlay.tsx`: for those three formats, immediately redirect to the matching practice page (keeps deep links working). `fixed_set` still renders `ChallengePlay` as today.

### 4. HUD "View" behavior
`ActiveChallengeHUD`: change the Resume button to open a `Sheet` with the live leaderboard (reuse the leaderboard block from `ChallengePlay`) instead of navigating to `/practice/challenges/:id`. Existing time-sprint countdown stays visible in the HUD.

### 5. Results
When the trigger flips `status='finished'`, the HUD's realtime subscription already fires. Auto-navigate to `/practice/challenges/:id/results` on that transition (one-time, guarded by a ref).

## Out of scope
- No schema/RLS changes — `challenge_attempts` already accepts these inserts.
- No changes to `fixed_set` gameplay, scoring formula, or lobby flow.
- No changes to English/Reading scoring rules.
