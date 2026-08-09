# Proctored test: end-to-end verification + gap fixes

Goal: run the full proctored flow (teacher starts → student oath → answering → submit → teacher sees scores) against the live app, and close the gaps the checks expose.

## What the code already supports (verified)

- Teacher lobby with join code, unlock code, and "start test for everyone"; student page at `/proctor/:joinCode`.
- Oath + unlock-code gate, crash recovery, focus-violation counting.
- Per-module timer: `ExamTimer` runs off the server-set module start and calls the module-advance handler on expiry, so unanswered questions in that module simply stay blank.
- Grading is server-side (`proctor_submit`); fill-in answers are graded through the shared matcher that accepts up to 4 alternate answers plus numeric equivalence.
- Desmos calculator is mounted in the student runner.

## Gaps found while reading the code

1. **No formula sheet / reference PDF** in the proctored student runner, even though modules store a reference PDF. Students cannot open it during a proctored test.
2. **No layout shift relative to Desmos**: the runner mounts the calculator but the question column does not react to the calculator's snap position, unlike the Flowers challenge runner.
3. **No module-by-module breakdown**: only `rw_correct` / `math_correct` totals are stored, so on a math-only test the teacher sees one combined math score with no Module 1 vs Module 2 split.

## Work

### 1. Formula sheet in the proctored runner
Add the same draggable reference-sheet button used elsewhere, sourced from the current module's reference PDF, with a fallback to the standard SAT formula sheet when a module has none.

### 2. Desmos-aware layout
Make the question column respond to the calculator's snapped side (shift/narrow when the calculator is docked left or right, overlay on small screens), matching the Flowers challenge behaviour.

### 3. Module-level score breakdown
Record per-module correct/total when a test is submitted, and show in the teacher monitor and results view: overall score plus "Module 1: x/22, Module 2: y/22". Student end screen shows the same overall + per-module summary.

### 4. End-to-end run (after the three fixes)
Drive the real app in a browser and report evidence for each item:

- Teacher: create a proctored session on the ANP math test, open the lobby, verify code + QR, start the test.
- Student: join by code, enter unlock code, accept oath, start Module 1.
- Answer a mix of multiple-choice and fill-in questions, including a fill-in typed in an alternate/equivalent form, to confirm it grades correct.
- Open Desmos and the formula sheet; confirm the question content repositions with the calculator and stays readable.
- Timer: shorten the module time limit on a throwaway test so expiry is observable; leave the last two questions blank and confirm the module auto-advances and those questions count as wrong.
- Finish Module 2, submit, and capture the student's final score screen.
- Teacher monitor: confirm the submitted student shows overall score plus Module 1 / Module 2 breakdown.

## Technical notes

- Files: `src/components/student/proctor/ProctorRunner.tsx`, `src/components/teacher/proctor/ProctorMonitor.tsx`, plus a database change to store per-module results and to return them from the submit routine.
- The timer check uses a temporary test/session with a short module limit so nothing depends on waiting 35 minutes; the real 35-minute limit stays untouched.
- Verification runs against a throwaway session and hidden ghost-style participant data, cleaned up afterwards.
