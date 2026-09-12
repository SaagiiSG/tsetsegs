# International Cohort: Separate World for International Students

## Goal
Run two fully separate student worlds on the same platform:
- **Mongolian cohort** — everything exactly as it is today.
- **International cohort** — its own leaderboard, sprints, and challenges that start empty and fill up as international students join.

International batches are hidden from the regular admin batches page and only visible to the dev admin account and Saran-Ochir's teacher account, who are also the only ones who can flip a batch to international.

## Decisions locked in
- A batch is marked international by a switch, visible only to the dev admin account and Saran-Ochir.
- International batches do not appear on the normal admin batch pages, counts, or dashboards.
- International students get their own leaderboard/sprints/challenges — same features, separate population, empty at first.
- Mongolian rankings never include international students, and vice versa.
- Login stays phone-based; international students get a phone with country code.

## How the split works

```text
batches.is_international ──(trigger keeps in sync)──> student_accounts.cohort ('mn' | 'intl')
                                                              │
                        ┌─────────────────────────────────────┴──────────────────────┐
                   leaderboards / sprints                             friends & challenges
                   filtered by cohort                                 candidates filtered by cohort
```

Cohort is stored once on the student's account (derived from their batch) so every leaderboard query can filter on a single indexed column instead of joining batches everywhere.

## Work breakdown

### 1. Database
- `batches.is_international boolean not null default false`.
- `student_accounts.cohort text not null default 'mn'` with a check for `('mn','intl')`, plus an index.
- Trigger/function that sets a student account's cohort from its linked student's batch, and re-syncs when a batch is toggled or a student moves batch.
- `sprints.cohort text not null default 'mn'` so each cohort runs its own sprint cycle; unique active sprint per cohort.
- `student_sprint_rankings` inherits cohort through the sprint, so no change needed there.
- Backfill: every existing account and sprint becomes `'mn'`.

### 2. Leaderboards and sprints
- `all_time_leaderboard(p_window, p_limit)` gains a cohort parameter (defaulting to the caller's own cohort) and filters `student_accounts.cohort`.
- `flowers_challenge_leaderboard` filters the same way.
- Sprint fetching in `useLeaderboard` selects the active/next/last sprint for the student's cohort.
- Sprint enrollment (`src/lib/sprintEnrollment.ts`) and the `finalize-sprint` function operate per cohort, so international grouping and promotions run independently.
- Empty-state copy for international students: "Rankings open as more students join" instead of a blank board.

### 3. Challenges and friends
- Friend search and challenge opponent lists filter to the same cohort.
- Live/class tests and prep classes are already batch-scoped, so they stay naturally separated.

### 4. Admin and teacher visibility
- New switch on the batch edit/create form, rendered only for the dev admin account and the Saran-Ochir teacher account.
- All regular admin batch reads (batches list, cards, overview, analytics, dashboards, announcements, student search, batch student counts) exclude `is_international = true`.
- A dedicated "International" view, visible to those two accounts only, lists international batches with the same tools.
- Teacher dashboard batch lists exclude international batches except for Saran-Ochir.

### 5. Student experience
- No new pages for international students — same practice, mocks, badges, streaks. Their leaderboard, sprint, and challenge screens simply start empty and populate as classmates arrive.
- Their real-SAT/YESH leaderboard card stays available (YESH is only meaningful for Mongolian students, so hide the YESH line for the international cohort).

## Things worth deciding as we build
- **Sprint timing:** international sprints can either follow the same weekly calendar or start when the first international batch begins. Following the same calendar is simpler and is what this plan assumes.
- **Tiny cohort problem:** with 1–3 students, a leaderboard is meaningless and promotions become trivial. Plan assumes normal rules still apply, and the empty/small state is handled with copy rather than special scoring rules.
- **YESH conversion** stays Mongolian-only.
- **SMS:** batch SMS to international numbers likely won't deliver through the current Mongolian sending setup; international batches skip the SMS steps in the registration wizard.

## Technical notes
- Files most affected: `src/hooks/useLeaderboard.ts`, `src/lib/sprintEnrollment.ts`, `supabase/functions/finalize-sprint/index.ts`, `src/hooks/useFriends.ts`, challenge creation pages, and roughly two dozen admin/teacher components that read `batches`.
- Migration adds columns, a sync trigger, and updated RPCs; no destructive changes.
- Cohort filtering must live in the security-definer RPCs as well as the client queries so a student can never pull the other cohort's rows.

## Out of scope
- Currency, language localization, or timezone handling for international students.
- Email-based login.
- Merging cohorts later (possible by flipping the batch switch, but no bulk migration tool).
