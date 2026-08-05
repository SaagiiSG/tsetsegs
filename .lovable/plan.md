# Fix lag and sudden freezes during the class exam

## What's actually happening

The exam screen re-downloads and re-renders the entire test every 4 seconds, and every answer tap waits on two sequential network writes before the UI feels responsive. Three confirmed causes:

1. **4-second full reload loop.** `src/pages/public/ClassExam.tsx` polls the `class_tests` row every 4s and always stores a brand-new object. That new object means the runner's `test.question_ids` array is a new reference every tick, so `ClassTestRunner`'s question-loading effect refetches all 22 questions and replaces the `questions` state — which re-runs KaTeX math rendering for every question and re-decodes every figure. On an iPad this is the visible freeze, happening on a 4-second heartbeat.

2. **Timer re-renders the whole screen twice a second.** The countdown ticks at 500ms and stores seconds in state on the top-level component, re-rendering the passage, question, choices, and the 22-button grid every tick.

3. **Answer taps block on the network.** `saveAnswer` awaits an upsert and then a second participant update, sequentially, on every choice tap. On weak class Wi-Fi that's the "tap does nothing for a moment" lag. Fill-in answers also re-render on every keystroke through the same top-level state.

Secondary: the Desmos calculator iframe is mounted for every student even when never opened, adding startup cost on first paint.

## The fix

**Stop the reload loop (the real freeze)**
- In `ClassExam.tsx`, only update the test state when something meaningful changed (status, starts_at, duration, question ids, title). Identical polls become no-ops, so no new object, no refetch.
- Keep the `question_ids` array reference stable across polls.
- In `ClassTestRunner`, key the question fetch on a stable string of the ids (joined) rather than the array reference, and skip refetching if the same ids are already loaded.
- Slow the poll from 4s to 8s, and switch it to a realtime subscription on that single test row where available, so status changes (teacher starts/ends) still land instantly without a periodic full pass.

**Isolate the countdown**
- Move the timer into a small self-contained `ExamTimer` component that owns its own state, so ticks repaint only the clock text.
- Keep the "time is up" auto-submit as a callback fired once from that component.
- Tick once per second instead of twice.

**Make answering instant**
- Update local answer state immediately and fire the persistence in the background (no `await` blocking the tap); the two writes go out together instead of one after the other.
- Debounce the fill-in-the-blank save (~600ms after typing stops) and keep the typed value in a local input state so keystrokes don't re-render the full screen.
- Queue writes so a rapid sequence of taps can't stack up overlapping requests for the same question.

**Trim per-question render cost**
- Memoize the question body (passage, stem, choices) so it only re-renders when the current question or the selected answer changes.
- Memoize the 22-button grid on answered/flagged state instead of rebuilding it on every parent render.
- Add `loading="lazy"`/decoding hints and fixed sizing on figures to stop layout thrash, and prefetch the next question's image so navigation feels instant.
- Mount the Desmos calculator lazily on first open.

**Verify**
- Load the exam runner in a headless browser, sit on it for ~30 seconds, and confirm: no repeating `questions` fetch in the network log, no repeated KaTeX work, and answer taps register with no awaited round trip.

## Technical notes

Files touched: `src/pages/public/ClassExam.tsx`, `src/components/student/test/ClassTestRunner.tsx`, plus a new `ExamTimer` component alongside the runner. No database, RLS, or scoring-logic changes — submission still computes correctness the same way and writes the same rows.
