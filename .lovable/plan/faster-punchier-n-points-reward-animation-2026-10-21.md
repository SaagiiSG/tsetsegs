# Faster, punchier "+N points" reward animation

## What the student sees
1. Presses Check, answer is correct, server pays points.
2. A green "+N" pops out at the Check button with a quick overshoot (scale 0 to 1.3 to 1, about 120ms).
3. It shoots up to the "today" chip in a fast curved arc (about 350ms, sharp ease-in so it speeds up as it goes), with a short fading trail behind it.
4. On impact: the bubble squashes and bursts into a few small green sparks. The chip's border flashes green and ripples outward once, the chip jolts (quick scale punch and small shake).
5. The number turns green and counts up from the old total to the new one (about 500ms, rolling digits), then fades back to normal colour after about 1s.
6. Several fast correct answers stack: each bubble lands and adds its own count-up, with no lost points.
7. Reduced-motion users: no flight or sparks, just the green border and the count-up.

## Technical details
- `PointsFlyer.tsx`: launch point is the last tap (Check button); use a bezier arc via keyframes with a midpoint control offset, duration ~0.35s, `ease: [0.55, 0, 0.9, 0.4]` (accelerating); a 3-ghost trail of fading copies; on complete render a short-lived spark burst (6 small dots via framer-motion) at the target.
- `StreakAndRankBar.tsx`: replace the pulse with an `impact` state: chip border `border-emerald-500` + a ring ripple (absolute span animating scale 1 to 1.6, opacity 1 to 0), punch animation `scale [1,1.3,0.95,1]` + `x [0,-2,2,0]`. Number uses an animated count-up (framer-motion `animate()` from previous shown value to new) with green text while counting; clears after ~1s.
- Keep server-paid-only trigger (`emitPointsEarned`) and existing in-flight bookkeeping, so the total never overshoots the server value.
- Emerald colour via a semantic success token added to the design tokens rather than hardcoded classes.
