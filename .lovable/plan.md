# Report: Duolingo vs our rank and badge system (main student portal)

## What I checked
I read the research document and checked its biggest claims against the live database and code. The claims below marked "confirmed" I checked myself today.

## Biggest problem: the scoreboard is not locked
- Confirmed: anyone with the app's public key can add point rows, add or change sprint rankings, add or change badges, change streaks, and add/delete featured badges. These tables are open to the whole internet, not just the student.
- Confirmed in code: the browser decides if an answer is right, then writes the points itself.
- Result: a student could give themselves unlimited points, any badge, a 100-day streak, or a first-place finish. Center portals already do this the safe way (the server grades and pays), so the fix pattern exists.

## Badge bugs
- Confirmed: Hot Streak, Discipline King, Peak of Speed and Chain Lightning can never unlock. They look for point types called "speed" and "practice", which the database refuses to save (it uses "speed_session" and "questions").
- Confirmed: the badge counter has no "seasonal" slot, so unlocking a seasonal badge can break the badge page.
- From the report (not yet checked): badges are matched by name, so renaming one loses progress; 37+ checks run every time the dashboard opens; Ruby Legend and God Amongst Human mean different things in different places; Week Warrior is 500 points in code but 70 in the database; "already seen" celebrations are stored on the device, so they replay on a new phone.

## Rank-up problems
- Duolingo keeps a safe middle: top moves up, bottom moves down, everyone else stays. Ours moves everyone outside the cutoff down every sprint, so students bounce between tiers.
- Group size is 40 in one place and 55 in another; late groups can be tiny and give a free first place.
- Likely bug (needs checking on real rows): the end-of-season drop probably never reaches the next season.
- The "you moved up" screen is worked out in the browser and can say "advancing" when the season rule says "drop".
- Tier 5 is called Emerald in some places and Platinum in others.

## What Duolingo does that we should copy
- The server grades, pays and records every point with a time.
- Badges are ladders (several steps), steps are never lost, and the server holds a "celebration waiting" flag until seen.
- Leagues: safe middle, small demotion zone only in big enough groups, join with your first points, ties go to whoever got there first, closing runs on a fixed schedule.

## Proposed order of work (each step shown to you before the next)
1. Lock the tables: students can only read their own data; all points, badges, streaks and rankings are written by the server.
2. Move grading to the server: the browser sends "picked answer Z", the server decides right/wrong and points.
3. Fix the badge bugs above and store "seen" on the server.
4. Rebuild rank rules with a safe middle and one group size; fix the season bug.
5. Turn badges into ladders and add personal records.

## Decisions I need from you before step 4
Sprint length (14 or 7 days), keep seasons or not, streak bonus in the league or not, badges paying points or not, Ruby Legend meaning, Emerald vs Platinum, and whether repeat answers pay.

## Technical notes
- Live policies on point_transactions, student_badges, student_sprint_rankings, student_streaks, featured_badges, student_attempts use `true` for public insert/update.
- point_transactions category check excludes 'speed' and 'practice' used by useBadgeProgressCalculator.ts.
- useBadges.ts rarity tally lacks 'seasonal'.
- Students use custom auth (anon role), so locking needs server functions keyed by the student session, like the tenant RPCs.
