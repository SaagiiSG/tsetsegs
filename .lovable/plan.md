
# SAT Mini Challenges

A new student-only feature where SAT students add friends by phone and race them live in 1v1 or up to 5-player matches. IELTS students are excluded for now (they don't have the practice engine).

## User flow

```text
Friends tab
  Add friend by phone  ──▶  request pending  ──▶  friend accepts
                                                       │
                                                       ▼
                                          friends list (online dot)

Challenge a friend (or group of up to 5)
  1. Host picks: format + subject + question set + target
  2. Invites go out (in-app + a small toast/badge)
  3. Lobby — everyone marks "ready"
  4. Host starts → live race screen with leaderboard
  5. First to hit goal wins → results screen, rematch button
```

## Formats (host picks one)

| Format            | Host configures                       | Win condition                          |
| ----------------- | ------------------------------------- | -------------------------------------- |
| First to N points | target = 100 / 500 / 1000             | First player to reach target           |
| First to N correct| target = 10 / 25 / 50 / 100           | First player to N correct answers      |
| Time sprint       | duration = 5 or 10 min                | Most correct when timer hits 0         |
| Fixed set race    | size = 10 or 20 questions             | Lowest total time (must finish all)    |

All formats use the existing question pool, filtered by subject (Math / English) and set (68, CollegeBoard, 150 Hard, English, All) — same options as Live Practice.

## Scoring (points format)

Reuse the same per-question point logic students already see in regular practice (difficulty + speed). Keeps it familiar and prevents grinding easy questions for cheap points.

## Friends model

- Mutual: send request → other accepts → both see each other.
- Search by phone only (no name search — privacy + matches how login works).
- Blocked-phone list so a student can stop receiving requests from someone.
- Friends list shows online status (last_seen within 2 min) so you know who you can challenge live.

## Where it lives in the app

- New sidebar item under Practice: **Challenges** (`/practice/challenges`)
- Sub-routes:
  - `/practice/challenges` — friends list + active/pending invites
  - `/practice/challenges/new` — format/subject/set/target picker + friend selector
  - `/practice/challenges/:id/lobby` — ready-up screen
  - `/practice/challenges/:id/play` — live race
  - `/practice/challenges/:id/results` — final standings + rematch
- A small notification badge on the sidebar item when an invite or friend request is waiting.

## Out of scope for v1

- Async / "play when you're free" challenges (live only this round)
- Cross-course challenges (SAT vs IELTS)
- Public matchmaking against strangers
- Tournament brackets, seasons, dedicated leaderboards
- Wagering points / tier-affecting outcomes — challenges are purely social, don't move the student's regular tier/points
- IELTS students (button hidden for IELTS-only accounts; dual-enrolled see it only inside the SAT section)

---

## Technical section

**New tables** (all RLS-gated to the student's own `student_account_id`):

- `student_friendships` — `(requester_id, addressee_id, status: pending|accepted|blocked, created_at, responded_at)`. Unique on the unordered pair.
- `challenges` — `(id, host_account_id, format, subject, question_set, target_value, duration_seconds, status: lobby|active|finished|cancelled, started_at, finished_at, winner_account_id)`
- `challenge_participants` — `(challenge_id, student_account_id, joined_at, ready_at, score, correct_count, total_time_ms, finished_at, place)`
- `challenge_questions` — `(challenge_id, question_id, order_index)` — pre-shuffled pool the race draws from (same set for everyone in the race; each player advances through it independently).
- `challenge_attempts` — `(challenge_id, student_account_id, question_id, is_correct, time_ms, points_awarded, attempted_at)` — kept separate from `student_attempts` so challenge play doesn't pollute regular practice analytics, streaks, tier, or badges.

**GRANTs**: `authenticated` gets select/insert/update on all five; `service_role` full; no `anon`. RLS: participants can read their own challenge rows + sibling participants in the same challenge; only the host can update challenge status; only the participant can write their own attempts.

**Realtime**: enable `supabase_realtime` publication for `challenges`, `challenge_participants`, and `challenge_attempts` so the lobby and race leaderboard update live (subscribe inside `useEffect`, teardown on unmount — per project rules).

**Server-side win detection**: a trigger on `challenge_attempts` recomputes the participant's score/correct/time, then if the win condition is met sets `challenges.status = 'finished'`, `winner_account_id`, and assigns `place` to everyone. Keeps clients from cheating.

**Presence**: reuse `student_accounts.last_seen_at` (already updated on activity) for the online dot — no new infra.

**Reusable pieces**:
- Question fetch + render: reuse `StudentQuestion` viewer in a "challenge mode" wrapper that posts to `challenge_attempts` instead of `student_attempts`.
- Lobby/leaderboard UI: model on `LiveLobby` / `LiveLeaderboard` from teacher Live Practice.
- Format/subject/set picker: model on `LivePracticeContent` setup screen.

**New files** (sketch):
- `src/pages/student/challenges/ChallengesHome.tsx`
- `src/pages/student/challenges/NewChallenge.tsx`
- `src/pages/student/challenges/ChallengeLobby.tsx`
- `src/pages/student/challenges/ChallengePlay.tsx`
- `src/pages/student/challenges/ChallengeResults.tsx`
- `src/components/student/challenges/FriendsList.tsx`
- `src/components/student/challenges/AddFriendDialog.tsx`
- `src/components/student/challenges/PendingInvites.tsx`
- `src/components/student/challenges/LiveLeaderboard.tsx`
- `src/hooks/useFriends.ts`, `useChallenge.ts`, `useChallengeRealtime.ts`
- `src/lib/challengeScoring.ts` (mirror existing per-question point formula)

**Edits**:
- `src/App.tsx` — register `/practice/challenges/*` routes
- `src/components/student/StudentSidebar.tsx` — add Challenges item (SAT only) with unread badge
- `src/lib/courseRouting.ts` — hide for IELTS-only

**Feature flag**: gate the whole feature behind a `mini_challenges` flag in `feature_flags` so we can ship dark and turn on per cohort.

**Not changed**: existing practice tables, tier, badges, streaks, leaderboard. Challenges are a separate sandbox.
