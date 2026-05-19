## Goal

Make `useScorePrediction` match real SAT outcomes more closely. Two real-world data points just landed:

| Student | Real SAT Math | Current predicted range | Miss |
|---|---|---|---|
| Nyamsambuu M. | **800** | 703–741 (mid ~722) | **−59 to −97** |
| Tselmeg E. (Erdenejargal) | **790** | ~707–757 (mid ~732) | **−33 to −58** |

In both cases the predictor was **too conservative at the top end**, and the high end of its range still sits below the real score.

---

## Tselmeg E. — full data audit

- Practice tests (t1→t8): 640, 740, 670, 630, 740, 760, **790**, 730
- Attendance: 15/15 sessions, 12 present + 3 late → 100% weighted
- Homework: 10/10 = 100%
- Platform: 447 attempts, **hard accuracy 75.5%** (108/143), medium 86%, easy 87%
- Real SAT: **790**

Current model gives: base 744, variance penalty **−12** (stdev 54), HW 0, attendance 0, practice **0**, ⇒ **732 ± 25**.

---

## Root causes

### 1. Silent bug — practice signal is dead code (HIGH IMPACT)

`useScorePrediction.ts` lines 72, 78–81, 212–215 compare against `'Hard'`:

```ts
const hardAttempts = attempts.filter(a => a.difficulty_level === 'Hard');
```

But `questions.difficulty_level` is stored **lowercase** (`'hard'`, `'medium'`, `'easy'` — confirmed in DB). The filter never matches, so:

- `hardAccuracy` is always **0**
- `hardAdj` is always **0** (falls into the "no hard attempts" branch)
- The fallback `getBaseFromHardAccuracy` for new students always returns the floor (**500**)

This single bug means Tselmeg's 75.5% hard accuracy contributes nothing.

### 2. Practice bonus capped at the top

```ts
if (baseScore >= 730) practiceAdj = Math.min(practiceAdj, 0);
else if (baseScore >= 700) practiceAdj = Math.min(practiceAdj, 5);
```

Students who deserve the upside get zero credit for crushing hard questions.

### 3. Variance penalty treats upside as risk

Stdev includes high outliers. Tselmeg's 790 inflates stdev → −12 penalty, even though high outliers are a *good* signal at the top.

### 4. No personal-best / ceiling signal

A student who hit 790 or 800 in practice has demonstrated a ceiling. The 60/40 blend dilutes it back toward the mean.

### 5. Upward trend not rewarded

Tselmeg's last 4: 740 → 760 → 790 → 730. Trend is clearly +. Current blend treats sequence as flat.

---

## Plan

### Step 1 — Fix the case bug (one-line, immediate accuracy lift)

In `src/hooks/useScorePrediction.ts`, normalize difficulty before comparison:

```ts
const isHard = (d: string | null) => (d ?? '').toLowerCase() === 'hard';
```

Apply in `calculatePracticeAdj` and `getBaseFromHardAccuracy` callers.

### Step 2 — Add a "ceiling / personal-best" lift

After computing `baseScore`, if the **max of last 5 tests ≥ 780** AND **last-3 average ≥ 740**, blend in a ceiling term:

```
ceilingLift = clamp((maxLast5 - 760) * 0.4 + (last3Avg - 740) * 0.3, 0, 25)
baseScore += ceilingLift
```

For Tselmeg: max=790, last3avg=(730+790+760)/3=760 → +12+6 = +18 lift.
For Nyamsambuu: max=800, last3avg=(710+760+800)/3=757 → +16+5 = +21 lift.

### Step 3 — Asymmetric variance (downside deviation)

Replace stdev with downside-only deviation: variance computed only over scores **below** the mean. High outliers no longer punish the student.

```
downsideStd = sqrt(mean(max(0, mean - s)^2))
variancePenalty = downsideStd > 25 ? -min(round((downsideStd - 25) * 0.4), 20) : 0
```

For Tselmeg: scores below mean (730) are 630, 670, 640, 730 → smaller penalty (≈ −5 instead of −12).

### Step 4 — Lift practice cap when hard accuracy is real

Replace the hard cap with a tiered rule:

```
if (hardAccuracy >= 65 && hardAttempts.length >= 50) {
  // strong evidence — no cap
} else if (baseScore >= 730) {
  practiceAdj = Math.min(practiceAdj, 5);   // was 0
} else if (baseScore >= 700) {
  practiceAdj = Math.min(practiceAdj, 8);   // was 5
}
```

Plus boost top-tier hard accuracy:

```
if (hardAccuracy > 70) hardAdj = 15;        // new tier
else if (hardAccuracy > 55) hardAdj = 10;
```

### Step 5 — Trend bonus

Compute slope of last 4 tests (linear regression on test_number → score). If slope ≥ +15 pts/test, add **+5 to +10** trend bonus, capped.

### Step 6 — Soften homework penalty when mastery is shown

```
if (hardAccuracy >= 60 && hwRate >= 0.7) homeworkAdj = Math.max(homeworkAdj, -3);
```

Mastery beats compliance.

### Step 7 — Tighten range when confidence is high

When `tests.length ≥ 5`, `hardAccuracy ≥ 65`, and `attemptVolume ≥ 300`, set `halfRange = max(12, downsideStd * 0.35)` — tighter band for proven students.

### Step 8 — Validation harness (no UI)

Add a one-off script `scripts/validate-prediction.ts` that:
- Pulls a hand-picked list of students with known real SAT scores (Nyamsambuu, Tselmeg E., and 3–5 others you provide)
- Runs both old and new algorithms
- Prints a side-by-side table (real vs old-mid vs new-mid vs new-range)
- No DB writes, no UI changes

This lets us tune coefficients before shipping. After approval, we just leave the script in for future tuning.

---

## Expected results after changes

| Student | Real | Old mid | New mid (est.) | New range |
|---|---|---|---|---|
| Tselmeg E. | 790 | 732 | **~772** | 755–790 |
| Nyamsambuu M. | 800 | 722 | **~765** | 748–785 |

Still slightly conservative on the perfect 800 (statistically correct — most 790-range practice students don't hit 800 every time), but the **real score now lands inside or at the top of the predicted range** instead of well above it.

---

## Files touched

- `src/hooks/useScorePrediction.ts` — full rewrite of scoring functions, **same exported signature** so all callers (`InlineScorePrediction`, `ScorePredictionBadge`, `ScorePredictionCard`, `AdminScorePrediction`) keep working unchanged
- `scripts/validate-prediction.ts` — new, validation harness
- `mem://logic/sat-math-score-prediction-algorithm` — update memory with new formula

## Out of scope

- No DB schema changes
- No UI changes
- No predictor for SAT English / Reading (math only, as today)
- No retroactive recomputation — predictions are live-computed per query

## Risk

- Low: same hook signature, same return shape, same query key
- Coefficients are tuned against only 2 real outcomes — Step 8 validation script lets us check 3–5 more before shipping if you have additional real-SAT data points
