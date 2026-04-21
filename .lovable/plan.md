

## Plan: Practice UX & Desmos Window Polish

Five focused improvements to the student practice flow + Desmos calculator.

---

### 1. Remove screen-size / DevTools detector

**File:** `src/components/security/SecurityWrapper.tsx`

The `useDevToolsDetection` hook fires false positives across browsers (Arc, Safari iPad, Chrome with bookmarks bar, mobile keyboards, zoom levels). It's bothering legitimate students.

- Stop calling `useDevToolsDetection` in `SecurityWrapper`.
- Remove the `devToolsDetected` state, the critical-alert overlay branch, and all related logic.
- Keep the watermark, text-selection prevention, and visibility-change blur (those are still useful and don't false-positive).
- Leave `useDevToolsDetection.ts` on disk (unused) so we can re-enable later if desired — just don't import it.

### 2. Side-by-side layout for questions with figures

**File:** `src/pages/StudentQuestion.tsx` (the practice question card around lines 824–897)

Currently figures stack on top of question text + choices, taking lots of vertical space.

- When `currentQuestion.question_image_url` exists AND viewport is `md+`, render a 2-column grid: figure on the left (sticky, ~40% width, max-h ~70vh, `object-contain`), question text + choices on the right.
- On mobile (`<md`), keep the stacked layout but cap the image height (e.g. `max-h-64`) so it doesn't dominate the screen.
- Keep the existing single-column path when there's no image.
- Apply the same treatment in `src/components/teacher/practice/TeacherQuestionViewer.tsx` so the teacher Practice Hub matches.

### 3. iPad-friendly resize handle on Desmos

**File:** `src/components/student/DesmosCalculator.tsx`

The current edge/corner handles are 1–3px thin — fine for a mouse, invisible on touch.

- Add a visible iOS-style resize grip at the **bottom-left corner** of the calculator window (~24×24px, two diagonal lines glyph, semi-transparent, only shown when not snapped/minimized).
- The grip dispatches the existing `handleResizeStart` / `handleResizeTouchStart` with direction `'sw'`.
- Increase the touch-only hit area on the `sw` corner to ~24×24 (keep the small mouse handle behavior identical on desktop).
- Optional polish: also enlarge `se` corner handle to match, since iPads naturally reach for either bottom corner.

### 4. Stop "page refresh" when dragging Desmos

This isn't an actual page reload — it's the SecurityWrapper blurring + showing the "Window not in focus" overlay because the iframe steals window focus mid-drag, which flashes like a refresh.

**Files:** `src/components/student/DesmosCalculator.tsx`, `src/components/security/SecurityWrapper.tsx`

- While dragging or resizing the calculator, add an invisible overlay (`pointer-events: auto`, full screen, z-index between iframe and window) so pointer events never reach the Desmos iframe — this prevents focus theft and also fixes drag-jitter when crossing over the iframe.
- In `SecurityWrapper`, ignore `window blur` events fired while a calculator drag/resize is in progress (check via a `data-calculator-dragging` attribute on body, or a shared event from DesmosCalculator). The Desmos iframe is already in `isAllowedFocusTarget`, but the blur fires before focus settles inside the iframe.

### 5. Desmos snapped-right cut off by Arc browser UI

**File:** `src/components/student/DesmosCalculator.tsx` + `src/components/teacher/practice/TeacherQuestionViewer.tsx`

When snapped, the calculator uses `height: calc(100vh - 60px)`. In Arc (and Safari) the browser UI overlaps `100vh`, so the bottom of the iframe is hidden.

- Switch snapped height to use `100dvh` (dynamic viewport height) instead of `100vh`, with a `100vh` fallback for older browsers: `height: min(calc(100dvh - 60px), calc(100vh - 60px))`.
- Add `padding-bottom: env(safe-area-inset-bottom)` to the calculator window so the iframe content stays above the home-indicator / browser chrome.
- Also clamp `bottom: 0` on the snapped state so it's anchored to the visible viewport, not the layout viewport.

---

### Technical notes

- No DB or backend changes.
- No new dependencies.
- Existing snap/portal architecture is preserved — `useCalculatorSnap`, `dispatchSnapEvent`, and the bottom action bar offsets keep working.
- Files touched: `SecurityWrapper.tsx`, `DesmosCalculator.tsx`, `StudentQuestion.tsx`, `TeacherQuestionViewer.tsx`. ~150 LOC delta total.
- Testing path: practice a question with a figure on desktop + iPad; drag the Desmos window across the screen on desktop and iPad; snap right in Arc browser and confirm the keypad row is fully visible.

