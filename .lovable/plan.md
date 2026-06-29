# Plan: Rolling 44-Question Simulation + Tighter Prediction Buffer

## Goals
1. Continuously simulate an SAT-style score from the student's last 44 distinct platform attempts (recomputed every 10 questions).
2. Blend the simulation into the existing score prediction.
3. Tighten the prediction buffer to ±15 (floor) with a ±20 ceiling for low-confidence students.
4. Keep the simulation **invisible to students** — show it only to teachers/admins with a clear, well-labeled explanation.

---

## 1. Simulation Engine — `useSatSimulation` (new hook + pure calc module)

**Trigger logic**
- Pull the student's last 44 **distinct** attempts (most recent attempt per question, ordered by `attempted_at desc`).
- Recompute only when the student's total distinct-question count crosses a new multiple of 10 (10, 20, 30, …). Cached in memory + a lightweight `localStorage` key so we don't re-run on every page mount.
- Requires ≥44 distinct questions (same gate as calibration). Below that → no sim.

**Scoring formula (pure function, fully unit-testable)**

For each of the 44 questions:

```text
difficulty_weight:  easy = 0.6   medium = 1.0   hard = 1.5
time_factor:        target = 95s (SAT Math pace)
                    if correct:   min(1.15, max(0.85, 1 + (target - time)/target * 0.15))
                    if incorrect: 0  (wrong is wrong; speed doesn't help)
question_score = is_correct ? (difficulty_weight * time_factor) : 0
```

Aggregate:

```text
raw = sum(question_score) / sum(difficulty_weight)         // 0..~1.15
mix_penalty = 1 - max(0, 0.5 - hard_share) * 0.4           // batches with <50% hard get slightly damped
adjusted = raw * mix_penalty
sim_score = round( 400 + adjusted * 400 )  clamped 400..800
```

This rewards: hard-question accuracy, on-pace speed, and a difficulty mix that resembles a real test. It avoids inflating sims that are all easy-questions or all guessed-fast-wrong.

**Confidence tag on each sim**
- `high`  — hard_share ≥ 0.35 AND avg time within 60–150s
- `med`   — hard_share ≥ 0.20
- `low`   — otherwise

Sims tagged `low` are computed but down-weighted in the blend.

---

## 2. Blending into the Prediction — edit `useScorePrediction.ts`

Take the **latest 3 sims** (so it smooths short-term noise). Average them weighted by confidence (high=1.0, med=0.7, low=0.4).

**Blend rules:**
- **0 practice tests + ≥1 sim:** sim **replaces** the current crude hard-accuracy → 720/680/… fallback. Sim becomes the base score directly.
- **1–2 practice tests + ≥1 sim:** base = 70% practice-test blend + 30% sim average.
- **3+ practice tests + ≥1 sim:** base = 85% practice-test blend + 15% sim average. (Real tests stay dominant.)
- **No sims yet:** algorithm runs exactly as today.

All existing adjustments (attendance, homework, trend, variance, ceiling lift) apply on top of the new base unchanged.

---

## 3. Buffer Change
Replace current `min ±12 / max ±25` with:
- **High confidence** (≥3 tests + ≥100 attempts + low variance): ±15
- **Medium confidence:** ±17
- **Low confidence:** ±20

Ceiling-lift logic (+25 when student has hit 780+ with 740+ recent average) stays untouched.

---

## 4. Teacher/Admin Visibility (the only UI surface)

The student dashboard prediction card stays exactly as it is — students see no sim data, no "Simulation 3: 690" cards, nothing.

**New "SAT Simulation Engine" panel** on the teacher's student-detail page (and admin's student-detail page):
- Latest sim score (large), confidence tag.
- Sparkline of last 10 sims with hover tooltips.
- A small expandable "How this works" section with plain-English explanation:
  > Every 10 questions a student answers, we take their most recent 44 attempts and run a weighted simulation. Hard questions count for more, on-pace speed gets a small bonus, and batches without enough hard questions are flagged as low-confidence. The sim feeds the score prediction at 15–30% weight depending on how many real practice tests we have. Real practice tests always dominate.
- Shows the current blend: e.g. "Prediction base: 85% practice tests + 15% sim avg (last 3)".
- Shows the input breakdown of the latest sim: hard/medium/easy split, avg time, accuracy, computed sim_score, confidence tag.

---

## 5. Technical Details

**Files to create**
- `src/lib/satSimulation.ts` — pure scoring function + types. Unit-testable.
- `src/hooks/useSatSimulation.ts` — fetches last 44 distinct attempts, caches by attempt-count milestone, returns `{ latest, history, loading }`.
- `src/components/teacher/student-detail/SatSimulationPanel.tsx` — teacher/admin UI panel.

**Files to edit**
- `src/hooks/useScorePrediction.ts` — accept sim history, change base-blend logic, change buffer floors/caps.
- Teacher student-detail page (and admin equivalent) — mount `SatSimulationPanel`.

**No DB schema changes.** Sims are computed on the fly from `student_attempts` + `questions.difficulty_level`. If we later want history beyond a session, we can persist; for now in-memory + localStorage is enough and zero-migration.

**Performance**: one query per recompute (every 10 questions). Cached. Negligible.

---

## 6. Verification
- Add unit tests for `satSimulation.ts` covering: all-easy batch, all-hard batch, all-wrong, perfect+fast, perfect+slow, mixed.
- Spot-check a few real students by reading their attempts and confirming the sim score lands in a reasonable band vs. their actual practice test scores.
- TypeScript build must pass.
