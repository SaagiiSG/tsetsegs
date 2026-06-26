# Streak Rewards System

Reframe streaks from an obligation into a daily reward. Each day a student shows up they earn XP, hit milestone badges, and periodically collect "streak freezers" they can spend to skip a day without breaking the streak.

## Reward rules

**Milestone badges** (awarded once when streak first reaches the day count):

- 3-day → badge
- 7-day → badge + 1 streak freezer
- 10-day → badge
- 14-day → badge + 1 streak freezer
- 15-day → badge
- 21-day → badge + 1 streak freezer

Freezer drop rule generalized: **every 7 consecutive days a student earns 1 streak freezer** (so day 7, 14, 21, 28…). Freezers are collectable (stackable) and persist across streak resets — they're a wallet, not tied to the current run.

**Daily XP reward** when the streak extends (i.e. first activity on a new day that continues or starts a streak):

- formula: `xp = round(2 ^ (day / 5))` where `day` = the new `current_streak` value
- examples: day 1 → 1 xp, day 3 → 2, day 7 → 5, day 14 → 25, day 21 → 128, day 30 → 1024
- written to `point_transactions` with a `streak_daily` source so it flows through existing points/leveling.

**Streak freezer spend rule**: when the daily streak-update logic sees a gap of exactly 2 days (missed yesterday) AND the student has ≥1 freezer, automatically consume 1 freezer and treat yesterday as practiced — streak continues uninterrupted. Gaps > 2 days still reset (one freezer = one skipped day). Auto-consume keeps it frictionless; we surface what happened in the celebration toast and dialog.

## Where it shows up

`**StreakHistoryDialog` (the streak popup)** gets a new "Rewards" section above the calendar:

- Freezer wallet: snowflake icon + count, with a short "Skip a day without losing your streak" tooltip.
- Today's XP earned (if extended today).
- Milestone ladder: horizontal list of the 6 milestones (3/7/10/14/15/21) showing earned vs. locked, with the freezer icon on 7/14/21. Current streak position marked on the ladder so the next reward is obvious.
- "Freezer used yesterday" banner when applicable for the current run.

`**StreakExtendedToast**` (already fires on day flip) gains:

- "+N XP" line
- "+1 Streak Freezer" line when the new streak is a multiple of 7
- "Milestone unlocked: &nbsp;" line when the new streak hits 3/10/15 (badge-only milestones)

**Sidebar / header flame badge**: no layout change, but the freezer count appears as a small snowflake chip next to the flame when count > 0.

## Technical section

### DB (single migration)

- `student_streaks`: add `freezers_available int not null default 0`, `freezers_earned_total int not null default 0`, `freezer_last_used_date date`, `last_daily_xp_date date`, `milestone_3_achieved bool default false`, `milestone_10_achieved bool default false`, `milestone_14_achieved bool default false`, `milestone_15_achieved bool default false`, `milestone_21_achieved bool default false`. Reuse existing `streak_7_achieved`.
- New badge rows in `badges` for the 6 milestones (category `streak`, rarities scaling common→rare). Awarded via existing `student_badges` insert path.
- No new tables — freezer wallet lives on `student_streaks`.

### Logic — `updateStudentStreak` in `src/hooks/useStudentStreak.ts`

Centralize all reward logic in the standalone function (the mutation variant calls the same helper):

1. Compute `daysSince` as today.
2. If `daysSince === 2` and `freezers_available > 0`: decrement freezer, set `freezer_last_used_date = yesterday`, treat as `daysSince === 1` (continue streak).
3. Compute `newCurrentStreak`.
4. If `newCurrentStreak > old` AND `last_daily_xp_date !== today`: insert `point_transactions` row with `xp = round(Math.pow(2, newCurrentStreak / 3))`, source `streak_daily`, and set `last_daily_xp_date = today`.
5. If `newCurrentStreak % 7 === 0` and not already credited for this milestone (track via `freezers_earned_total` vs `floor(longest_streak/7)`): increment `freezers_available` and `freezers_earned_total`.
6. For each of 3/7/10/14/15/21: if `newCurrentStreak >= n` and flag false, set flag true and insert into `student_badges`.
7. Dispatch enriched `streak:extended` event detail: `{ newStreak, isNew, xpEarned, freezerEarned, freezerUsed, milestonesUnlocked: string[] }`.

### Frontend

- `useStudentStreak` returns `freezersAvailable`, `nextMilestone` (from new ladder), `milestonesAchieved`.
- `StreakHistoryDialog`: add Rewards section component `StreakRewardsPanel` (new file under `src/components/student/`).
- `StreakExtendedToast`: extend props to render xp/freezer/milestone lines.
- `StreakCelebrationListener`: pass new detail fields through.
- Sidebar (`StudentDashboardSidebar`) + mobile header (`StudentLayout`): show freezer chip next to flame when `freezersAvailable > 0`.
- Badge definitions (`src/data/badgeDefinitions.ts`): add the 6 streak milestone badge definitions so they render in the badges page.

### Out of scope

- No manual "use freezer" button — auto-consume only (simpler UX, matches "not an obligation" goal). Can add manual control later.
- No retroactive backfill of past milestones for existing streaks — flags start false; next time they hit a milestone they earn it.

## Open question

The XP formula `2^(day/5)` reaches 1024 XP at day 30 and ~32k at day 45 — large compared to per-question points. Confirm: keep as-is, or cap at e.g. day 21 (128 XP) so it stays meaningful but not runaway?