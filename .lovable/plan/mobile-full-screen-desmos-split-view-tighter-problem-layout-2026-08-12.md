# Mobile: Full-Screen Desmos Split View + Tighter Problem Layout

Two changes, both mobile-only (under 768px). Tablet and desktop keep today's draggable/snapping floating calculator, untouched.

## 1. Desmos becomes a full-screen sliding pane on mobile

Today on a phone the calculator opens as a small draggable window floating on top of the question — it covers the problem, the drag/resize handles are unusable with a thumb, and the title bar eats space.

New behavior when a student taps the calculator icon on mobile:

- The screen becomes a two-panel track, each panel exactly one full screen wide: problem on the right panel, Desmos on the left panel.
- Tapping the calculator icon slides the track so the Desmos panel fills the screen. The problem panel stays mounted just off-screen (answers, timer, and typed input are never lost).
- A compact top bar in the Desmos panel shows "Desmos" plus a "Back to question" button. Tapping it (or the calculator icon again) slides back.
- Button-only switching — no swipe gesture, so panning and zooming the graph never accidentally leaves the calculator.
- The Desmos iframe is mounted once and reused, so the graph and any typed expressions survive switching back and forth.
- Slide animation is a short spring-eased transform (~250ms), respecting reduced-motion settings.
- Drag, resize, snap zones, and minimize are all disabled on mobile — they only make sense with a mouse.

```text
 mobile: one screen wide track, slides horizontally

 [   DESMOS   ][  QUESTION  ]      <- calculator open
                ^ visible

 [   DESMOS   ][  QUESTION  ]      <- calculator closed
  off-screen     ^ visible
```

## 2. Reclaim vertical space + fix the mobile action bar

Applies to the mock test and the other math solving screens.

- Collapse the mock test's stacked header rows into a single compact row on mobile: timer, question position, and icon-only calculator / reference / settings buttons. No duplicated labels.
- Reduce section padding and card chrome on phones so the question text and choices start higher on the screen.
- Bottom action bar becomes one compact sticky row that is always thumb-reachable: back / next on the outer edges, question-navigator in the middle, safe-area padding at the bottom so it clears the iOS home bar.
- Content area gets correct bottom padding so the last answer choice is never hidden behind the action bar.
- All tap targets stay at least 44px tall.

## Scope

Every student math solving screen where the calculator appears:

- Mock / practice test (`StudentBluebookTest`)
- Regular math practice question page (`StudentQuestion`)
- Speed session
- Class test runner
- Proctored exam runner
- Challenges and Flowers challenge

## Technical notes

- `DesmosCalculator.tsx` gets a mobile branch driven by `useIsMobile()`. On mobile it renders a fixed full-screen panel translated off-canvas via `transform: translateX(-100%)` instead of the positioned/resizable window, and skips all pointer drag/resize handlers.
- A small shared context/provider (mounted alongside the existing calculator plumbing) tracks `calculatorOpen` on mobile so the question shell can apply the matching `translateX(100%)` to itself; desktop continues to use the existing `CALCULATOR_SNAP_EVENT` path with no behavior change.
- The existing `toggleCalculator()` event stays the single entry point, so every call site already wired to it works unchanged.
- Desmos usage logging (`desmos_usage_events` open/close rows) keeps its current semantics: a row opens when the pane is shown and closes when it is dismissed.
- Layout changes are Tailwind responsive classes only — no scoring, timing, or answer-persistence logic is touched.
