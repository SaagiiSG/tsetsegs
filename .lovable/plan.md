# Batches, Leaderboard, Ranks and Streaks: Breakdown, Art Brief, and Unlocked Ranks

## Part 1: How it works today

### Batches (classes)
- A batch is one class: teacher, schedule, room, start date. Students join a batch through its QR/registration link, which also blocks duplicate phone numbers in the same batch.
- Each batch is either Mongolian or International. A student's group comes from their batch, and the two groups never share sprints or leaderboards.
- A batch counts as finished when attendance reaches session 15 (SAT) or session 24 (IELTS).
- Your batch and your leaderboard group are separate. Leaderboard groups mix students from different batches who are in the same rank.

### Leaderboard
- Tabs: Current Sprint, All-time, My Rank, History.
- Current Sprint lists "Your Sprint Competitors": only students in your rank and your group, sorted by points. A countdown timer sits at the top.
- Groups hold about 40 students. The end-of-sprint step allows up to 55 (40 plus or minus 15).
- Students join the sprint with their first correct practice answer, not by opening the leaderboard.
- Each row shows level, rank, points, and whether that student is on track to move up or down.

### Ranks (in order)
| # | Rank | Color | Move up if you finish in your group's |
|---|------|-------|---------------------------|
| 1 | Unranked | gray | top 20 |
| 2 | Bronze | #CD7F32 | top 20 |
| 3 | Silver | #C0C0C0 | top 15 |
| 4 | Gold | #FFD700 | top 10 |
| 5 | Emerald | #50C878 | top 5 |
| 6 | Diamond | #B9F2FF | top 1 |
| 7 | Ruby | #E0115F | only #1 keeps Ruby |

- New students start in Silver if they get 70% or more of the placement questions right. Everyone else starts in Bronze.
- When a sprint ends, students inside the cutoff move up one rank. Everyone else drops one rank.
- A season is 3 sprints. After the last sprint, group winners keep their rank and everyone else drops one rank.
- Points: 10, 5, or 2 for a correct answer on the 1st, 2nd, or 3rd try, and 0 if the student opened the explanation. Speed sessions give 15, 10, 5, or 2 depending on how fast the answer is. Badges add more points.
- Level is separate from rank and grows slowly as lifetime points add up.
- Each rank changes the student's whole color theme.
- When a student ranks up, a celebration plays: the screen darkens, the new rank appears, a lock shakes and falls off, then the badge unlocks. There is no artwork yet, only simple icons and colors.

### Streaks
- Any practice answer on a day keeps the streak going.
- Missing one day uses a freeze if the student has one. Missing more breaks the streak.
- Daily streak XP grows as the streak gets longer, up to 256 per day.
- Milestone badges: 3 days Spark, 7 Week Warrior, 10 Double Digits, 14 Fortnight Flame, 15 Half Month Hero, 21 Three Week Inferno.
- Screens: the streak and rank bar, the streak history dialog (calendar and rewards), the "streak extended" pop-up, and the "streak broken" screen.
- Main app and center portals use different freeze rules:
  - Main app: freezes come from the student's longest-ever streak and have no limit.
  - Center portals: one freeze for every 7 days in a row, holding up to 3.

### Center portals
- Center students get Sprint, My Position, All-time, and Rank History tabs, using only their center's data.
- "My Position" lists every rank and highlights the current one.

## Part 2: Art brief for Claude Code

This will be saved as a file you can download.

- **Rank emblems:** 7 ranks, each as a large crest (512px, transparent background) and a small icon (64px). Each rank looks more impressive than the one before: bronze shield, then silver, gold with wings, emerald gem, diamond crystal, and a ruby crown with flames. Brand colors are coral and indigo.
- **Locked versions:** a gray silhouette of each emblem with a padlock, for ranks the student hasn't reached yet.
- **Rank-up scenes:** a wide banner for each new rank (1600x900), plus a "rank down" version and a "kept your rank" version.
- **Streak art:** a flame that gets bigger at each milestone (3, 7, 10, 14, 15, 21 days), a freeze snowflake icon, and a broken-streak illustration.
- **Season art:** a trophy for the season champion.
- The brief includes file names, sizes, and where each image appears in the app, so the artwork can be dropped straight in.

## Part 3: Unlocked ranks in Current Sprint

Add a rank ladder strip at the top of the Current Sprint tab, below the timer:
- One emblem per rank, from Unranked to Ruby.
- **Unlocked:** ranks the student has ever reached in any past sprint. Shown in full color with the date they first got it.
- **Current:** the student's rank right now. Highlighted with a glow and a "You are here" label.
- **Next:** shows how many places they need to climb to move up this sprint, for example "Finish in the top 10 to reach Emerald".
- **Locked:** higher ranks they haven't reached. Shown grayed out with a lock.
- Tapping an emblem shows what it takes to reach that rank.
- Until the artwork exists, the emblems use the current icons and colors. Images from Claude Code replace them later without other changes.
- Center portals get the same strip, using only their own center's rank history.

## Technical section
- Unlocked ranks come from the highest rank the student has reached across their past sprint results (main app) and their center's rank history (portals). Nothing new is saved.
- A shared `TierLadder` component and `tierAssets` map. The map points each rank to its image when one exists and falls back to the icon otherwise.
- The art brief is written as a markdown file in /mnt/documents.
- Known inconsistencies, left unchanged unless you ask:
  - group size limits of 40 vs 55
  - the end-of-season celebration can show a rank-up even when the season rules don't give one
  - different freeze rules in the main app and center portals
