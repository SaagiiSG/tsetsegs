# Bluebook simulator: design

Date: 1 Nov 2026. Branch: `feat/bluebook-simulator` (worktree `~/Developer/tsetsegs-bluebook`, from main 0834b533).

## Why

The landing page lists "Bluebook симулятор / Bluebook simulator" as a feature (`src/pages/Index.tsx:55`). Today the student practice test looks like the rest of the app, not like Bluebook. Saagii wants the practice test to look and behave almost exactly like Bluebook, so the claim is true and test day holds no surprises.

## What gets built

The main student practice test at `/practice/bluebook/test/:attemptId` (`src/pages/student/StudentBluebookTest.tsx`) is rebuilt in Bluebook's look. Four moments wrap it:

1. **Start**: a short loading screen showing one hairline figure picked at random.
2. **The test** in Bluebook's look, with Bluebook's tools.
3. **Between modules of the same section**: Bluebook's "This Module Is Over". **Between Reading & Writing and Math**: Bluebook's 10-minute break screen.
4. **End**: Bluebook's "Stand By" screen, then a circle closes in on the screen and opens back up in the normal student theme on the results.

The test screen is built as a set of shared components (top bar, bottom bar, question pane, tools, break, stand-by) that take plain props. Later, the other three test screens can move onto it as separate projects. This project only moves the main practice test.

## Decided by Saagii

- Near-identical to Bluebook's layout, fonts, colours and small interactions. The reference is his screen recording of a full Bluebook practice test (below).
- **The hairline loader plays only at the start.** It shows one figure at random from the existing hairline figures (`src/portal/topicFigures.ts`, 52 today). It's "just a loading screen": nothing else on it.
- **No hairline between modules.** Between two modules of the same section, show Bluebook's "This Module Is Over". Reading & Writing → Math shows Bluebook's 10-minute break timer.
- **Today's tests are Math only.** The live database has 6 published tests. Each is Math module 1 plus Math module 2, at 35 minutes and 22 questions each, with no Reading & Writing. That was checked on 1 Nov. So right now the path is: loader → Math M1 → This Module Is Over → Math M2 → Stand By.
- **Build Math first, then build Reading & Writing in full in this same project.** Every piece a full-length test needs must exist, so that adding full-length tests later needs no UI work: the two-pane passage, Highlights & Notes, Line Reader, R&W directions, and the R&W → Math break. Saagii, 1 Nov: "make sure to build every section … so later when we add in the actual full length practice test we have all the thing we need".
- **End:** a Bluebook-style "Stand By", then a circle closing in that switches the whole screen back to the student theme.
- Start with the main student test. The center test (`src/portal/CenterPracticeTest.tsx`) also powers `/demo`, which Misheel shows at Web Summit on 9–12 Nov. It stays untouched until after Web Summit.
- No College Board logo or name anywhere.

## Non-goals

- A harder or easier Math or R&W module 2 based on module 1 (adaptive scoring).
- Adding Reading & Writing test content. That's admin data work for later.
- Moving `ClassTestRunner`, `ProctorRunner` or `CenterPracticeTest` onto the new screen. Those are later projects.
- Keyboard shortcuts, Help, Assistive Technology, the essay.
- Bluebook's "You're All Finished!" confetti screen. Stand By goes straight into the circle.
- Any database change or migration.
- Dark mode inside the test. Bluebook has one look.

## Anti-goals: things that would make this a failure even if it works

- Losing or failing to save an answer. Saving must keep working exactly as it does today (`bluebook_answers` upsert on every change).
- The test clock eating loader time.
- Flashy motion inside the test itself. Bluebook is calm and plain. Motion lives only at the start loader and the end circle.
- Bluebook styles leaking into the rest of the app, or the student theme leaking into the test.
- Breaking the other three test screens, `/demo`, or the browser checks in `Saagii21/flowersos/tools/portal-e2e/`.

## Reference material

- Recording: `Saagii21/flowersos/Screen Recording 2026-11-01 at 5.35.05 PM.mov`. It's 3:10 at 60fps, 3164×2070 (2× retina). It covers a full practice test: start, R&W modules 1 and 2, break, Math modules 1 and 2, stand-by and finish.
- Frames and crops: `Saagii21/flowersos/references/bluebook/`.
  - `scenes/` has every screen change, with `times.txt`.
  - `full/` has full-resolution frames, named by second.
  - `crops/` has close-ups: header, footer, question, eliminated, selected, highlight popover, navigator, check-work, gridin, marked-review, more-menu.
  - `sheets/` has contact sheets.
- Fonts were read from the Bluebook app's own cached styles on Saagii's Mac (`/Applications/Bluebook.app` and its WebKit cache), so they aren't guesses.

### Measured look

Colours were sampled from the recording's pixels.

| Thing | Value |
|---|---|
| UI font (bars, buttons, menus, labels) | Roboto 400 / 500 / 700 |
| Content font (passages, questions, answer choices, directions) | Noto Serif 400 / 700, plus italic |
| Math | TeX-style. The app's existing `MathText` output is close enough |
| Top and bottom bar background | `#E0E9F5` |
| "THIS IS A PRACTICE TEST" strip | `#171C57` navy, white bold caps, rounded bottom corners, inset from the sides |
| Page background | `#FDFDFD` |
| Text | `#19191B` (near-black) |
| The one blue: Next / Back buttons, selected answer border, question numbers, ABC toggle when on, "This Module Is Over" title | `#2942BD` |
| Review flag (filled bookmark) | `#B7293A` |
| Yellow: highlight, Close and Resume Testing buttons | `#FCD400` |
| Question header strip (number + Mark for Review + ABC) | `#ECECEC`, with a dashed black line under it |
| Answer choice border | 1px `#444`, about 8px corner radius. Selected: about 3px `#2942BD` |
| Check Your Work / Module Over / Stand By page background | `#F7F7F7` |
| Bluebook's own loading screen and the break screen | `#2C2C2C` (loader); break is near-black `#191919` |
| Finished screen (not building it) | navy `#171C57` |

Lines: a dashed black rule sits under the top bar and above the bottom bar. These are long dashes with short gaps, like a ruler edge. Question number: a black square with a white bold number.

## Screen by screen

**Top bar** (`#E0E9F5`):
- Left: "Section N, Module M: Reading and Writing" or "…: Math" (Roboto, about 20px). N is the section's position in this test, so today's Math-only tests say "Section 1, Module 1: Math" and a future full test says "Section 2, Module 1: Math"., with "Directions ⌄" under it. That opens a white directions panel with a yellow "Close" pill, over a grey dimmed page.
- Centre: the timer (Roboto bold, about 22px), with a small outlined "Hide" / "Show" pill under it.
- Right, for R&W: "Highlights & Notes" (icon + label; underlined when on) and "More" (⋮).
- Right, for Math: "Calculator", "Reference" and "More".
- More opens a small menu with Line Reader and Save and Exit (*builder may add others later; Help, Shortcuts and Assistive Technology are out*).

Under the top bar sits the navy "THIS IS A PRACTICE TEST" strip.

**Reading & Writing body:**
- Two panes with a vertical grey divider and a small black drag handle (◂▸). The passage is on the left, the question on the right. The divider can be dragged and starts at 50/50.
- Right pane, top to bottom:
  - the question header strip: number square, "Mark for Review" with a bookmark icon (filled red when marked), and the ABC cross-out toggle at the far right
  - the question stem
  - the four answer choices: bordered boxes with a circled letter
- When ABC is on, each choice has a circled letter with a line through it on its right. Clicking it crosses that choice out: the text is struck through and greyed. Clicking it again ("Undo") brings the choice back.

**Math body:**
- One centred column, about 830px wide, for multiple choice.
- Typed-in answers (student-produced response) use two panes:
  - Left pane: "Student-produced response directions", with Bluebook's bullet list and its Examples table.
  - Right pane: the question, a small boxed input with an underline, and "Answer Preview:" showing the typed value typeset (`3/3` shows as a fraction).
- Figures get a small zoom toolbar above them: zoom in, zoom out, a percentage, Reset and full screen.
- The calculator (existing `DesmosCalculator`) opens as a panel on the left and pushes the test right.
- The reference sheet (existing `ReferenceSheet`) opens as a panel on the right with a "Reference" title, expand and close.

**Bottom bar** (`#E0E9F5`):
- Left: the student's name.
- Centre: a black pill reading "Question 1 of 27 ⌃".
- Right: blue "Back" and "Next" pills. There's no Back on question 1.
- The black pill opens a white pop-up above it with a little pointer:
  - title "Section 1, Module 1: Reading and Writing Questions" and a close ×
  - legend: Current (map pin), Unanswered (dashed box), For Review (red bookmark)
  - a grid of numbers: dashed boxes when unanswered, solid blue fill when answered, a red bookmark corner when marked, a pin over the current question
  - an outlined blue "Go to Review Page" button

**Highlights & Notes:**
- Selecting passage text highlights it in yellow straight away. A dark tooltip says "Highlight mode on: Select text to create a highlight automatically."
- Clicking a highlight opens a small rounded toolbar:
  - three colours (yellow, light blue, pink)
  - underline styles (solid, dashed, dotted, None)
  - delete
  - add a note
- A note is a short text tied to that highlight.

**Line Reader** (More menu): a band that dims everything except a few lines of the passage, and follows the pointer or arrow keys.

**Check Your Work** (after the last question's Next, or "Go to Review Page"):
- On `#F7F7F7`, the title "Check Your Work", then two lines:
  - "On test day, you won't be able to move on to the next module until time expires."
  - "For these practice questions, you can click **Next** when you're ready to move on."
- Below that, a white card with the module's question grid, styled like the pop-up's.
- Bottom bar: Back and Next. Next ends the module.

**This Module Is Over:**
- Shown when the next module is in the same section. **This is the main path today, between Math module 1 and Math module 2**, so build and check it in phase 1.
- Blue title, then "All your work has been saved. You'll move on automatically in just a moment. Do not refresh this page or quit the app.", with a dotted spinner.
- Then the next module's empty frame shows dimmed with a spinner, about 1.5s like Bluebook, before its questions appear.

**Break** (R&W → Math):
- Near-black screen. On the left, a bordered box reading "Remaining Break Time:" with a big 10:00 countdown, and the yellow "Resume Testing" pill under it.
- On the right: "Practice Test Break", a short paragraph, a rule, "Take a Break: Do Not Close Your Device", and Bluebook's five break rules.
- The student's name sits bottom left.
- Resume Testing, or the countdown reaching 0, leads to "Resume Testing Now / Your testing timer has not started counting down yet." with a yellow "Resume Testing" pill. That opens Math module 1, with the same dimmed frame and spinner as above.

**Stand By** (after the last module's Next):
- On `#F7F7F7`, "Practice Is Over: Stand By!" and "All your work has been saved, and we're uploading it now. Do not refresh this page or quit the app.", with a spinner and a percentage while scoring runs (`buildBluebookResults` plus the `bluebook_attempts` update).
- *My call:* a simple line drawing in our own style instead of College Board's upload illustration.

## The two animated moments

**Start loader:**
- A full screen in Bluebook's loading colour (`#2C2C2C`), with one random hairline figure in the middle, in light lines.
- It uses `<HairlineFigure figure={…} play />`, so the figure walks its own tour. There's no caption and no text.
- It covers the real loading of the attempt, module and questions. It stays at least 1.5s, then fades into the test.
- With reduced motion, the figure stays still and the swap is a plain fade.
- *My call:* the dark loading colour matches Bluebook's own loader and gives a clear "entering the exam" beat between the sky-blue student theme and the light test.

**End circle:**
- After Stand By finishes, a circle closes in on the centre of the screen until it's black or near-black.
- While it's closed, the screen behind swaps from the Bluebook look to the student theme.
- The circle then opens back out on the student-theme results. Today that's the `BluebookResultsDialog` content.
- About 0.6s to close and 0.6s to open, with ease-in and ease-out. *Builder may tune.*
- With reduced motion, it's a crossfade.
- Closing the results goes to `/practice/bluebook`, as today.

## Build order

Both phases are in this project.

1. **Phase 1, Math.** This is what students see today. It covers:
   - the shell: top bar, practice strip, bottom bar, question header, choices with ABC cross-out, Mark for Review
   - the timer with Hide and the 5-minute rule
   - the question pop-up, Check Your Work, and This Module Is Over with the dimmed spinner
   - the Math single column, typed-in answers with directions and Answer Preview, figure zoom, the calculator and reference panels
   - the More menu with Save and Exit
   - the start loader, Stand By and the end circle

   This phase is shippable on its own.
2. **Phase 2, Reading & Writing:**
   - the two-pane passage and question layout with the drag handle
   - Highlights & Notes
   - Line Reader
   - the R&W directions text
   - the R&W → Math break and "Resume Testing Now"

   There is no live R&W test yet, so phase 2 is checked against a **dev-only preview page**. It renders the shell with fixture R&W and full-test data, and it's left out of production builds. It must also run a full four-module flow (R&W M1, R&W M2, break, Math M1, Math M2) so the full-length path is proven before real tests exist.

## Constraints

- **No database changes.** Keep every existing read and write: `bluebook_attempts`, `bluebook_modules`, `bluebook_module_questions`, `bluebook_answers` (including `is_marked` for Mark for Review), `buildBluebookResults`, `logActivity`, and the `setDesmosContext('bluebook')` call.
- **The clock starts after the loader.** Today `module_started_at` is written when the attempt is created (`StudentBluebook.tsx:206`, `:255`), so a loader would eat test time. For a fresh module, the start time must be set when the questions become visible. A resumed attempt must keep its original start time. A refresh must never reset the clock.
- **Timer behaviour:** Hide and Show toggle it. *My call:* at 5:00 left it un-hides and stays visible, as Bluebook does. The existing 5-minute toast is removed.
- Remove today's "Save Progress" item (it saves nothing) and "Take a Break" item. "Go to Review" is replaced by Check Your Work.
- **Scope the styles.** Bluebook styles live under one root class (for example `.bluebook`). This mirrors how `.center-teacher` scopes the teacher dark mode. Fonts load only on the test route, and the rest of the app keeps Outfit and Nunito.
- **Shared components take props.** Data loading, saving and timing stay in the page, not in the shell. That way the other three runners can adopt it later.
- When the calculator and reference panels open, the test reflows next to them (today it shifts 40vw). Keep `useCalculatorSnap` working.
- Text stays in English, like Bluebook and the SAT.

## My calls (Saagii can overrule)

- **Highlights, notes and crossed-out answers are stored in the browser**, saved per attempt and question. They aren't in the database, so they don't follow a student to another device.
- **Phones (under 768px):** same colours and fonts. The passage stacks above the question instead of side by side, the top bar tools fold into More, and the bottom bar keeps the pill and Back/Next. Bluebook itself doesn't run on phones.
- The More menu has only Line Reader and Save and Exit. Save and Exit goes back to `/practice/bluebook`, since answers already save themselves.
- A test with two modules in one section gets the "This Module Is Over" screen.
- Bluebook's wording is reused where it describes test behaviour ("Check Your Work", "This Module Is Over", the break rules). The finish says "Practice Is Over" rather than "Digital Practice Is Over".

## Left to the builder

- Component names and file layout for the shared shell.
- How the fonts load (Google Fonts link or `@fontsource`).
- How highlighting is done (DOM ranges, or wrapping text when a highlight is made) and how it survives re-renders. `MathText` output must stay intact.
- Exact sizes and spacing, matched against the frames in `references/bluebook/`.
- Animation library or plain CSS for the loader fade and the circle.
- Tests: unit tests for the timer start rule and the highlight store. Also a browser check for `/practice/bluebook/test/…` in `flowersos/tools/portal-e2e/`; none exists today.

## Testing account

Saagii gave his own main-workspace student account for browser checks (1 Nov). Its phone number and password stay out of the repo and are passed to scripts through environment variables. Full runs leave real finished attempts on that account, which count toward badges and can't be deleted by the student, and he has accepted that. Keep the number of full runs low anyway.

## Rollout

- Work on `feat/bluebook-simulator`. Push to `main` only with Saagii's OK. `main` reaches Lovable, and parallel sessions share it, so re-read `origin/main` before merging.
- No migrations, so publishing is front-end only.
