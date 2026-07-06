# Practice Onboarding Tour + "NEW" Dots

Teach students what's changed since the last publish across the `/practice` section. Hybrid model: a one-time guided spotlight tour per page + persistent pulsing "NEW" dots on individual features until each is tapped/acknowledged.

## 1. What "new" means (feature audit)

Detected from recent commits + current components. These will be the tour steps:

**Global layout (`/practice/*`)**
- Quick-Actions FAB (✨ sparkle in header) — opens command sheet, also reachable by swipe-up from bottom edge.
- Streak flame chip + snowflake freezer chip (mobile header) — tap opens streak history.
- Announcement bell.
- Active Challenge HUD — new draggable, collapsible floating widget with a "Reset HUD" recovery action when off-screen.

**Home / Dashboard (`/practice/home`)**
- Redesigned ring + sets row (fixed iPad layout, now side-by-side at md+).
- Today's Goal ring, streak calendar, score pathway card.

**Practice hub (`/practice/dashboard`)**
- Smart Practice, Speed Mode, Review Queue, Vocabulary shortcuts.

**Bluebook (`/practice/bluebook`)**
- New Videos tab with YouTube-style layout (main player left, up-next list right on desktop; stacked on mobile).
- Test selector `Select` dropdown to jump Practice Test 4→10 both from landing grid and from the player header.

**Leaderboard, Badges, Stats, Profile** — recent UI polish (pagination, profile pop, rank box). Light coverage only.

## 2. Behavior

- **Auto once per page** on first visit after this release. Uses `localStorage` key `practice:tour:v1:{routeKey}` and a global `practice:tour:v1:release` stamp so a future release version bump replays.
- **Help button** (❓) added in the practice header next to the ✨ FAB → replays the current page's tour on demand.
- **Persistent "NEW" dots** on the specific elements (FAB, streak chip, HUD, Bluebook Videos tab, test-select dropdown, etc.). Each dot has its own key `practice:new:v1:{featureId}` and disappears once the user hovers/taps it or completes the tour step that highlights it.
- **Skippable**: Skip, Next, Back, Done. Esc closes. Tour respects `prefers-reduced-motion`.
- Fully client-side, no DB changes.

## 3. Technical implementation

Stack: lightweight custom overlay (no new deps). React + Tailwind + existing shadcn primitives. Copy in English, tone matches existing Tsetsegs voice (concise, friendly).

New files:
- `src/components/student/onboarding/TourProvider.tsx` — context + queue + localStorage version gating.
- `src/components/student/onboarding/TourOverlay.tsx` — dimmed backdrop + spotlight cutout (SVG mask) around the target element + tooltip card (title, body, Skip/Back/Next/Done, step counter).
- `src/components/student/onboarding/NewDot.tsx` — small pulsing dot component; accepts `featureId`, auto-hides after acknowledgement.
- `src/components/student/onboarding/tourSteps.ts` — per-route step definitions: `{ routeMatch, steps: [{ selector, title, body, placement }] }`. Selectors are stable `data-tour="..."` attributes.
- `src/components/student/onboarding/HelpButton.tsx` — ❓ icon button in the header that replays the current route's tour.
- `src/hooks/useTour.ts` — public API: `startTour(routeKey)`, `endTour()`, `isSeen(routeKey)`.

Edits:
- `src/components/student/StudentLayout.tsx` — mount `<TourProvider>` and `<TourOverlay/>` inside `/practice`. Add `<HelpButton/>` next to `PracticeQuickFab`. Auto-start tour on route change if unseen.
- Add `data-tour="..."` attributes + `<NewDot featureId="..."/>` where needed:
  - `PracticeQuickFab` (fab)
  - Streak chip + freezer chip in `StudentLayout` header
  - `AnnouncementBell`
  - `ActiveChallengeHUD` root + Reset HUD button
  - `BluebookVideosTab` — Videos tab trigger, test-select dropdown, YouTube-style player layout container
  - `StudentDashboardHome` — ring + sets row
- No changes to business logic, DB, or auth.

## 4. Tour copy (draft, per route)

- **`/practice/home`** (4 steps): "Welcome back 👋", "Your Today's Goal ring", "Streak & freezers — don't break the flame", "Quick jump anywhere with ✨".
- **`/practice/dashboard`** (2 steps): "Practice by subject", "Try Smart Practice / Speed / Review Queue".
- **`/practice/bluebook`** (3 steps): "New: Videos tab — walkthroughs for every test", "Jump between Test 4–10 with the dropdown", "Watch left, browse up-next right — like YouTube".
- **`/practice/challenges/*`** (2 steps): "Your active challenge floats here", "Off-screen? Tap Reset HUD to snap it back".
- **Global (once, from home)** (2 steps): "New quick menu ✨ + swipe up from bottom", "Tap the ❓ anytime to replay this tour".

## 5. Out of scope

- No Mongolian translation (English only, as chosen).
- No new backend tables or user preferences persisted server-side.
- No changes to existing feature behavior — pure additive overlay/annotations.

## 6. Verification

- After build, Playwright: visit `/practice/home` fresh (clear localStorage) → tour appears → Next through steps → verify dismissed → reload → does not reappear → click ❓ → tour replays. Repeat for `/practice/bluebook`. Screenshot each step.
