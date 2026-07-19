## 1. iPad carousel: reliable one-card-per-swipe

**Current problem:** On iPad, small/short swipes leave the carousel "between" cards and need a second flick. Long swipes work because native inertia carries far enough for CSS snap to grab the next card.

**Root cause:** We rely purely on CSS `scroll-snap` (`snap-proximity`). On iPadOS trackpad + short thumb swipes, momentum decays before the next snap point is reached, so it snaps back to the current card. `snap-mandatory` fixes short swipes but broke long/wheel scrolls (the previous complaint).

**Fix — JS-assisted snapping (the pattern iOS uses):**
- Keep CSS `snap-x snap-proximity` for visual alignment.
- Add a `scrollend` / debounced `scroll` listener on the track. When the user stops scrolling:
  1. Measure current `scrollLeft` vs each card's center.
  2. Determine intent: if the user moved more than ~15% of a card width from the previous active card in a given direction, advance by exactly one card in that direction; otherwise snap back.
  3. Programmatically `scrollTo({ left: targetCenter, behavior: "smooth" })` — always landing exactly on one card.
- Track last-known `scrollLeft` + timestamp to compute swipe velocity; any swipe with velocity above a small threshold advances one card even if displacement is tiny.
- Use `pointerdown` to record the "swipe start" scrollLeft so intent is measured per gesture, not per frame.
- Debounce the snap decision (~90ms after scroll stops) to avoid fighting the user mid-gesture.
- Keep `overscroll-behavior-x: contain` and remove `scrollSnapStop` entirely (JS handles stopping).

Result: any swipe — thumb flick, trackpad nudge, or long drag — resolves to exactly the next/previous card, smoothly.

## 2. Fill the card's empty middle with an analytics preview

The current card ends around "Needs attention" and leaves a large blank stretch before the action bar. Fill it with a **compact per-batch analytics preview** that mirrors the full analytics page, so the card feels informative at a glance.

**New `ClassCardAnalyticsPreview` component** (rendered between "Needs attention" and the action bar, only when there is vertical room — i.e. `md:` and up where the card is `70vh`):

- Reuses `useTeacherMathAnalytics({ batchIds: [batch.id] })` scoped to the single class.
- Shows:
  - **Domain overview**: a small horizontal bar (or 4 mini bars) for the 4 SAT Math domains (Algebra, Advanced Math, Problem-Solving & Data, Geometry & Trig) with accuracy %.
  - **1 strong topic** + **1 focus topic** as chips (from the same "strong/weakest" logic used on the full page).
  - **Questions attempted (last 7d)** as a small stat.
- Skeleton state while loading; graceful "Not enough data yet" empty state.
- The existing **Analytics** button in the action bar continues to open the full page for drill-down.

On mobile (`< md`) the preview is hidden to keep the card compact; the action bar stays close to content as it does today.

## Technical notes

- Files touched:
  - `src/components/teacher/dashboard/ClassCarousel.tsx` — JS-assisted snap logic; remove `scrollSnapStop`.
  - `src/components/teacher/dashboard/ClassCardBig.tsx` — insert preview slot; keep `md:h-[70vh]` so preview fills the gap.
  - `src/components/teacher/dashboard/ClassCardAnalyticsPreview.tsx` — new, thin wrapper around `useTeacherMathAnalytics` for a single batch.
- No backend or hook changes required; `useTeacherMathAnalytics` already accepts a batches array.
- No changes to routes or the full `TeacherMathAnalytics` page.

## Open question

Do you want the preview to be **read-only visuals** (bars + chips), or should chips be **clickable** and deep-link into the full analytics page pre-focused on that domain/topic? Default plan is read-only visuals with the existing "Analytics" button doing navigation.
