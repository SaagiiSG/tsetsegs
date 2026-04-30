# Practice Section: 3-Taps / Gestures To Anywhere

iOS-style efficiency for the entire practice flow. Any meaningful action is reachable in **≤3 taps OR a single gesture**, on every viewport (mobile, tablet, desktop).

## The "3-taps-max" promise

From anywhere inside `/practice/*`:
- Jump to any question set (68 / CB / 150 / English) and category
- Next / previous question, mark, flag, notes, calculator, reference
- Open Speed mode, review queue, vocabulary, leaderboard, profile, booking
- Resume "last attempted question"

## Three Interaction Layers

### Layer 1 — Persistent Quick-Access (all viewports)

- **Mobile (<768px)**: existing `StudentBottomNav` keeps 5 tabs. The middle slot becomes a **Quick FAB** when on `/practice/*` routes.
- **Tablet/Desktop (≥768px)**: a floating circular **Quick FAB** pinned bottom-right, plus the existing sidebar.
- **Long-press on any nav item / sidebar item** → jumps to that section's most-used sub-page (e.g. long-press Practice = resume last question).
- **Light haptics** via `navigator.vibrate(10)` on supported devices.

### Layer 2 — Command Sheet (the "⌘K for students")

A unified `PracticeCommandSheet` opened by:
- Quick FAB tap (1 tap) — works on every screen size
- **Swipe-up from bottom edge** anywhere in `/practice/*` (touch + trackpad)
- **`⌘K` / `Ctrl+K`** keyboard shortcut

Single-screen layout (no scroll needed for top items):
```text
[ Search questions, categories, tools…        ]

Resume                  → Question #142 (Algebra)
Continue last set       → CB · Advanced Math

Quick Jump
[ 68 ] [ CB ] [ 150 ] [ English ] [ Speed ]

Tools
[ Calculator ] [ Reference ] [ Notes ] [ Marked ]

Recent
- Geometry · Triangles
- Vocabulary · Day 12
```

Selecting a top-level item = action #2; nested items expand inline so the third tap always completes the journey.

### Layer 3 — Gestures (in-question and in-list, all viewports)

Within `StudentQuestion` / `StudentEnglishQuestion`:
| Gesture | Action |
|---|---|
| Swipe **left** | Next question |
| Swipe **right** | Previous question |
| Swipe **down** from top edge | Open Question Navigator |
| Swipe **up** from bottom edge | Open Command Sheet |
| **Two-finger tap** (or `Alt+C`) | Toggle Calculator |
| **Long-press** on question text (or right-click on desktop) | Mark / unmark |
| **Double-tap / double-click** on a choice | Submit that choice |

Within `StudentPractice` list:
| Gesture | Action |
|---|---|
| Swipe **left/right** on set-chip row | Cycle 68 → CB → 150 → English |
| Long-press on a category | Start a 10-question quick session |
| Pull-to-refresh (mobile) / `R` key (desktop) | Re-fetch progress |

All gestures use shared pointer-event hooks so they work on touch, mouse, and trackpad alike. Edge-swipes use a 20px hit zone to avoid clashing with scrolling.

## Discoverability

Shown the first 3 visits per screen (tracked in `localStorage`):
- Faint "← swipe →" pill near the question footer
- 1-second pulse on the Quick FAB
- Small `?` chip in the header opens a "Gestures" cheat-sheet drawer (also lists keyboard shortcuts on desktop)

## Technical Implementation

**New files**
- `src/hooks/useSwipe.ts` — pointer-event swipe (direction, velocity, edge zone)
- `src/hooks/useLongPress.ts`
- `src/hooks/useHaptics.ts` — wraps `navigator.vibrate`, no-op when unsupported
- `src/components/student/practice/PracticeCommandSheet.tsx` — full-screen on mobile, centered dialog on desktop, powered by existing `cmdk` (`ui/command`)
- `src/components/student/practice/PracticeQuickFab.tsx` — mobile injects into bottom nav center; desktop renders as bottom-right floating button
- `src/components/student/practice/GestureHintOverlay.tsx`
- `src/hooks/usePracticeRecents.ts` — last question id / set / category in localStorage
- `src/hooks/usePracticeKeymap.ts` — global `⌘K`, `Alt+C`, `R`, arrow-key prev/next on question screens

**Modified files**
- `src/components/student/StudentLayout.tsx` — mount `PracticeCommandSheet` provider, global edge-swipe-up listener, `GestureHintOverlay`, desktop FAB
- `src/components/student/StudentBottomNav.tsx` — center slot becomes `PracticeQuickFab` on `/practice/*`; long-press handlers per tab
- `src/components/student/StudentDashboardSidebar.tsx` — long-press / right-click on items uses recents
- `src/pages/StudentQuestion.tsx` — wire swipes (left/right/down), long-press on question body, double-click on choices, keymap; record recents
- `src/pages/student/StudentEnglishQuestion.tsx` — same gesture wiring
- `src/pages/student/StudentPractice.tsx` — swipe on set-chip row, long-press on category cards
- `src/pages/student/StudentSpeedMode.tsx` — swipe-down to exit (matches iOS modal dismiss)

**Behavior guards**
- Disable horizontal swipes when a `Dialog`, `Sheet`, or `DesmosCalculator` is open (check `[data-state="open"]`)
- Skip gestures over `<input>`, `<textarea>`, contenteditable, the drawing canvas
- Respect `prefers-reduced-motion` — hint pulses become static
- Feature-flag the system behind `practice_quick_nav` so it can be toggled per cohort

**Routes touched**: `/practice`, `/practice/home`, `/practice/dashboard`, `/practice/english`, `/practice/speed`, `/practice/question/:id`, `/practice/english/question/:id`, `/practice/booking`, `/practice/profile`, `/practice/vocabulary`, `/practice/review`, `/practice/leaderboard`.

## Out of scope
- Bluebook simulator (strict exam UX, no shortcuts)
- Teacher / Admin panels
- Backend changes — recents and hint counters are localStorage only

After approval I'll implement, then verify on 390px, 768px, and 1440px viewports with the browser tools and tune hit zones.
