

# Implement Missing Badge Tracking Logic

## Overview
10 badges currently return `current = 0` as stubs. This plan implements real tracking logic for all of them in `src/hooks/useBadgeProgressCalculator.ts`, plus fixes existing bugs in `speed_session_combo`, `ruby_weeks`, and `all_english_bank`.

---

## Badges to Implement

### Group 1: Time-Based Badges (5 badges)

**1. Blitz** (`module_under_time`, target: 15)
- "Complete Module 1 in under 15 minutes"
- Query `bluebook_answers` grouped by `module_id` for a module with section = "math" and module_number = 1. Sum `time_spent_seconds` for that module. If total < 15 min and all correct, `current = 1`.

**2. Sniper** (`consecutive_correct_under_time`, target: 10)
- "10 consecutive correct answers in under 8 minutes total"
- Query `student_attempts` ordered by `attempted_at`. Find the longest run of consecutive `is_correct = true` rows, then check if their cumulative `time_spent_seconds` is under 480s (8 min). If found, `current = 10`.

**3. Rush Delivery** (`consecutive_correct_under_time`, target: 20)
- "20 consecutive correct answers in under 12 minutes total"
- Same logic as Sniper but checks for 20 consecutive correct in under 720s (12 min). The badge definition distinguishes them by different `target` values (10 vs 20), and the label contains the time limit.

**4. Time Lord** (`questions_under_time_high_accuracy`, target: 50)
- "50 questions in under 17 minutes with 90%+ accuracy"
- Query speed session summary transactions (`category = 'speed'` with `session_summary = true` in metadata). Check if any session had 50+ questions, time under 17 min, and 90%+ accuracy. `current = 1` if found, else `0`.

**5. Flawless Execution** (`perfect_test_under_time`, target: 30)
- "Zero mistakes in practice test, completed in under 30 minutes"
- Query `bluebook_attempts` for completed tests. For each test, sum `time_spent_seconds` from `bluebook_answers` and check if all answers are correct. If total time < 30 min and 100% accuracy, `current = 1`.

### Group 2: Sprint Championship Badges (5 badges + 1 fix)

**6-10. Sprint Top 1 badges** (`sprint_top_1`)
- Bronze Novice, Silver Challenger, Gold Scholar, Platinum Legend, Diamond Apex
- These are already awarded by the `finalize-sprint` edge function. The calculator just needs to reflect whether the badge is unlocked.
- Query `student_badges` joined with `badges` to check if the specific tier badge (matched by badge name from the badge definition) is unlocked.

**11. God Amongst Human** (`top_1_weeks`, target: 3)
- "Hold Top 1 position all-time leaderboard for 3 consecutive weeks"
- Query `student_sprint_rankings` where `is_top_1 = true` for this student. Count consecutive sprints (each sprint ~ 2 weeks) where they held P1. `current = max consecutive P1 count`.

### Group 3: Seasonal Badges (5 badges)

**12. March Madness** (`seasonal_questions`, target: 200)
- Query `seasonal_events` matching the badge_id "march-madness". Get the event's date range. Count `student_attempts` within that period. `current = count`.

**13. May Momentum** (`seasonal_accuracy`, target: 85)
- Get May event date range. Calculate accuracy percentage from `student_attempts` during that period. `current = accuracy %`.

**14. August Ascent** (`seasonal_improvement`, target: 50)
- Get August event date range. Compare first and last `bluebook_attempts` scores during that period. `current = score_diff`.

**15. October Olympian** (`seasonal_tests`, target: 5)
- Get October event date range. Count completed `bluebook_attempts` during that period. `current = count`.

**16. December Dedication** (`seasonal_streak`, target: 31)
- Get December event date range. Count distinct practice days from `student_attempts` + `point_transactions` during that period. `current = distinct_days`.

---

## Bugs to Fix

### Fix 1: `speed_session_combo` (Lightning Strike vs Speedster)
Currently both badges use the same type and the calculator returns 1 if either is unlocked. Fix: look up the specific badge by name matching the parent badge definition being calculated (pass the badge name context through).

### Fix 2: `ruby_weeks` - should count consecutive weeks
Currently counts total ruby rankings. Fix: order by `created_at`, iterate to find max consecutive sprints at ruby tier.

### Fix 3: `all_english_bank` - filter by English subject
Currently counts all correct attempts. Fix: join with `questions` table filtered by English subject to only count English questions.

---

## Technical Approach

### File Changes

**`src/hooks/useBadgeProgressCalculator.ts`** (primary file)
- Add `badgeName` parameter to `calculateRequirementProgress` so `speed_session_combo` can distinguish Lightning Strike from Speedster
- Replace all stub `case` blocks with real query logic
- Add a helper function `getSeasonalEventDates(badgeId)` to look up seasonal event date ranges
- Update `consecutive_correct_under_time` to parse the time limit from the requirement label (8 min for target=10, 12 min for target=20)

**`src/hooks/useBadgeProgressCalculator.ts` function signature change:**
```text
calculateRequirementProgress(studentAccountId, req, studentId)
  becomes
calculateRequirementProgress(studentAccountId, req, studentId, badgeName)
```

This is a backward-compatible change since `badgeName` is optional and only used by `speed_session_combo`.

### Data Sources Summary

| Requirement | Primary Table(s) |
|---|---|
| `module_under_time` | `bluebook_answers`, `bluebook_modules` |
| `consecutive_correct_under_time` | `student_attempts` |
| `questions_under_time_high_accuracy` | `point_transactions` (speed summaries) |
| `perfect_test_under_time` | `bluebook_attempts`, `bluebook_answers` |
| `sprint_top_1` | `student_badges`, `badges` |
| `top_1_weeks` | `student_sprint_rankings` |
| `seasonal_*` | `seasonal_events`, `student_attempts`, `bluebook_attempts`, `point_transactions` |

### No database schema changes required
All needed data already exists in current tables.

