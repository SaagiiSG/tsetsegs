# Fix snapped Desmos being clipped by header/footer on the mock test

## What's wrong today

On desktop/tablet, when a student drags the calculator to a screen edge inside the Bluebook mock test:

- The snapped calculator sits at `z-40`, starting 60px from the top and running to the bottom. The test header is `sticky z-50` and the bottom navigation bar is `fixed z-40`, so both draw over the calculator — its top row and the graph's bottom controls get cut off.
- Only the scrolling question area is offset (`ml-[40vw]` / `mr-[40vw]`). The header and the footer nav still span the whole width, so the question "island" is pushed aside but the chrome is not, and the calculator visually collides with them.

## The fix

**Calculator (snapped state only)**

- Raise the snapped window above the test chrome and make it a true full-height side panel: top `0`, bottom `0`, above header and footer.
- Keep the floating (unsnapped) window exactly as it is today — same z-index, drag, resize, minimize behavior.

**Mock test layout reacts to the snap side**

- Header and footer nav get the same 40vw offset as the content when the calculator is snapped, so all three (header, question island, bottom nav) live in the remaining space next to the calculator and nothing is overlapped.
- The question island stays centered inside that remaining space, so the problem is never behind the calculator.
- Smooth transition on the offset, matching the existing 300ms.
- Offsets apply only on tablet/desktop where snapping exists; mobile keeps the full-screen sliding pane with its draggable button, untouched.

## Scope

- `src/components/student/DesmosCalculator.tsx` — snapped window position/stacking.
- `src/pages/student/StudentBluebookTest.tsx` — header and footer offsets.

Other pages that use the snap hook (regular practice question, speed session, proctor runner, challenge play, teacher viewer) already offset their content; they are not changed in this pass. If you want the same header/footer treatment there, say so and it can be applied identically.

## Technical notes

- Snapped window switches to `z-[60]` (above the `z-50` header) with `top: 0; bottom: 0; height: auto`, and drops the `60px` top offset from its height calculations.
- Header/footer offsets use the same `calculatorSnapSide` value from `useCalculatorSnap()` already read on the page — no new state or events.
- No scoring, timing, or answer-persistence logic touched.
