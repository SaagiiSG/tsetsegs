# Landing page redo: results-led, persuasion-focused (OnePrep-style)

## What the real student data says (first pass)

Practice test scores are SAT Math section scores (out of 800).

- 1,526 students have at least one real practice test score; 1,226 have two or more.
- Students with 2+ tests take about 6 tests over about 19 days on average.
- Average first score is 482, average latest is 570: **+88 points**. Average gain to their best score: **+142**.
- **543 students (44%) improved by 100+ points**; 615 students reached 700+ in Math at least once; several reached 800.
- 710 full Bluebook simulator attempts exist. 58 students reported a previous real SAT (average 1079).

These are headline averages only. Step 1 of the build checks them properly before any number goes on the page.

## OnePrep reference: what makes it persuasive

1. A big promise ("Ace the SAT") with one main button: "Get started for free".
2. Product shown as the visual: a live question, a predicted score of 1570, "+180 points".
3. Three steps: Diagnose, then Plan, then Practice.
4. Real student stories: before and after scores, timeframe, dream school, photo, country flag.
5. Each feature section is built around a pain point ("Never stay stuck", "Stop wondering what to study next", "Know your weak spots").
6. A study-planner countdown to test day (urgency).
7. Authority: "Learn from a 1580 scorer".
8. The same button repeated after every section.

## Sales principles we'll use

- **Proof before pitch**: real numbers from our own students near the top of the page.
- **Specific beats vague**: "+142 points in 3 weeks" instead of "big improvement".
- **Show the product**: animated mockups of practice, Desmos, analytics, leaderboard.
- **Focus on the result**: sell the score and the dream school, not the feature list.
- **Remove risk**: free start or diagnostic, a clear next step, FAQ that answers objections.
- **Honest urgency**: countdown to the next SAT date and the next class start. No fake scarcity.
- **Social belonging**: leaderboard, streaks, number of active students.
- **One action per screen**, written for students first, with a short section for parents.

## New page structure

```text
1. Hero         promise + product mockup (score climbing) + "Start free" / "I'm a parent"
2. Proof bar    1,500+ students | +142 avg best gain | 44% gained 100+ | 700+ club count
3. How it works Diagnose -> Plan -> Practice (3 animated cards)
4. Results      real before/after story cards + live chart of the average score over time
5. Features     one pain point per section: question bank + explanations, Desmos,
                speed mode, review mistakes with spaced repetition, analytics
6. Motivation   leaderboard tiers, streaks, badges (game layer)
7. Teachers     in-person classes, teacher credentials, class schedule
8. Parents      progress reports, attendance, parent sharing link
9. Countdown    next SAT date + next class start
10. FAQ         price, schedule, online vs in person, how to join
11. Final call  repeated "Start free / Register" button
```

Keeps the MON/ENG language toggle and the Tsetsegs brand (coral and indigo, Chillax and JetBrains Mono), with OnePrep's clean, product-first layout.

## Build steps

1. **Data deep-dive**: compute the final numbers (gain by number of tests taken, gain over time, gain by group, Bluebook trends, 700+/800 club) and save a short results report to Files for you to review.
2. **Stats feed**: a public, read-only summary that only returns totals (never names or individual scores), so the page numbers stay live and accurate.
3. **Rebuild the landing page** section by section, using the structure above.
4. **Testimonials**: placeholder cards marked "awaiting consent" until you provide real students who agreed to be shown.
5. Check on desktop and phone, plus page title and description.

## Decisions I need from you (during review)

- Which student stories (with permission) and dream schools to show.
- Main button: free trial account, registration request, or contact on Messenger/phone.
- Whether prices appear on the page.

## Technical details

- Sources: `practice_tests.score` (Math section), `bluebook_attempts.total_score`, `students.previous_sat_score`. Exclude 0 and test or staff accounts; trend = first vs latest vs best for each student, grouped by week since their first test.
- New SECURITY DEFINER function `landing_public_stats()` returning only totals, with GRANT EXECUTE to anon; cached on the client.
- Landing components go under `src/components/landing/*`; replaces the current golden-theme landing (memory updated after approval).
