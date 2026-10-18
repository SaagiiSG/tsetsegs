# Recency-weighted SAT simulation (440 questions, 10 batches of 44)

## The idea
Instead of scoring only the latest 44 Math questions, score the student's last 440 distinct Math questions as 10 batches of 44. Each batch is a mini SAT. Newer batches count more, so the score follows the student's current level but one bad day can't swing it.

```text
batch:   1(newest) 2    3    4    5    6    7    8    9    10(oldest)
weight:  1.00     0.80 0.64 0.51 0.41 0.33 0.26 0.21 0.17 0.13   (each 20% less)
```

Batch 1 alone carries about 23% of the score, and the newest three together about 50%.

## My view
- Good for **stability and trend**: using 440 questions instead of 44 cuts the random noise a lot, and the decay still rewards recent improvement.
- It will **not fix the main problem** on its own. The simulation guessed about 69 points too low for nearly everyone, because our questions are harder than the real SAT. Recency weighting makes the score steadier, but it stays low.
- So pair it with a **calibration step**: adjust the score using the 16 real SAT results we have (for example, add the average gap). Recheck it every time a new real score comes in.
- Add a **trend arrow**: compare the newest 3 batches with the oldest 3, so students see "rising +25" instead of a bare number.

## Steps
1. Test it first on the 16 students with a real SAT, using only practice from before their test. Compare four versions side by side: today's method, recency-weighted, recency-weighted plus calibration, and the average of the last 3 practice tests.
2. Show you the results table. Switch only if the new version misses by less.
3. If it wins, use it on both portals (main + customer), same 440 unlock.
4. Make the range shown match the real typical miss (about ±40 today, not ±15), and tighten it as more real scores come in.
5. Keep saving daily predictions; the accuracy line in profiles keeps checking every new real SAT.

## Technical details
- `src/lib/satSimulation.ts`: add `buildWeightedSim(distinctNewestFirst, { batches: 10, size: 44, decay: 0.8 })`. Score each batch with the existing `calculateSimulation`, then take a weighted average where weight = decay^i × the batch's confidence weight. Also return a trend: average of the newest 3 batches minus average of the oldest 3.
- Calibration: `calibratedSim = weighted + offset`, where offset is fitted from the `sat_prediction_accuracy` results (starting value from the 16-student test). Store it as one constant for now.
- `useScorePrediction.ts` and `centerSatSimulation.ts` call the new function. Practice tests remain the main base; the simulation's 15%/30% blend weights get rechecked in the test.
- Add unit tests: the newest batch outweighs older ones, the decay is applied correctly, and fewer than 10 batches still works.
- Find the best decay value (0.7 / 0.8 / 0.9) using the 16-student test. Don't over-tune it, since 14 of the 16 took the same test day.
