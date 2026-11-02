# Bluebook Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the main student practice test (`/practice/bluebook/test/:attemptId`) to look and behave almost exactly like College Board's Bluebook. It starts with a hairline loader and ends with a Stand By screen and a closing circle back into the student theme. Math is built first, then Reading & Writing in full.

**Architecture:**
- The page (`StudentBluebookTest.tsx`) keeps all Supabase reads and writes.
- It renders one new component, `BluebookSession`. Given plain props and callbacks, that component runs the whole test experience through a pure stage reducer.
- `BluebookSession` is built from small presentational pieces under `src/components/bluebook-test/`, all scoped under a `.bluebook` root class.
- A dev-only preview route feeds `BluebookSession` fixture data, so Reading & Writing and the full four-module path can be checked before real tests exist.

**Tech Stack:**
- React 18, TypeScript (non-strict), Vite, Tailwind, shadcn/radix (`src/components/ui/*`)
- framer-motion and react-resizable-panels (both already installed), KaTeX through `MathText`
- vitest (node environment, `renderToStaticMarkup` for markup tests)
- the CSS Custom Highlight API for highlights

**Spec:** `docs/superpowers/specs/2026-11-01-bluebook-simulator-design.md`. Read it first. The reference frames are in `/Users/saranochirsereglen/Developer/Saagii21/flowersos/references/bluebook/` (`crops/` and `full/`). Match sizes and spacing against them.

## Global Constraints

- **No database changes or migrations.** Keep these reads and writes: `bluebook_attempts`, `bluebook_modules`, `bluebook_module_questions`, `bluebook_answers` (upsert on `attempt_id,question_id`, `is_marked`), `buildBluebookResults`, `logActivity('bluebook_test_complete', …)`, and `setDesmosContext({ questionId, context: 'bluebook' })` on math questions.
- **The clock starts after the loader.** `module_started_at` stays `null` until the questions are on screen. Then it's written once, guarded with `.is('module_started_at', null)`. A resumed attempt keeps its value. Moving to the next module writes `null`.
- **Scoping.** Every Bluebook style lives under `.bluebook`. Anything rendered in a Radix portal (PopoverContent, DropdownMenuContent, TooltipContent, DialogContent) also gets the `bluebook` class. `.bluebook` resets the shadcn colour variables to their light `:root` values from `src/index.css`, so a dark-mode student still gets the light test.
- **Fonts.** Roboto 400/500/700 is for the interface. Noto Serif 400/700 plus italic 400 is for passages, stems, choices and directions. Load them only while the test is mounted, using `<link data-bluebook-fonts href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,400;0,700;1,400&family=Roboto:wght@400;500;700&display=swap">`. The rest of the app keeps Outfit and Nunito.
- **Colours** (exact, from the spec):

  | Name | Value | Used for |
  |---|---|---|
  | bar | `#E0E9F5` | top and bottom bars |
  | navy | `#171C57` | practice strip |
  | page | `#FDFDFD` | page background |
  | ink | `#19191B` | text |
  | blue | `#2942BD` | the one blue |
  | red | `#B7293A` | review flag |
  | yellow | `#FCD400` | highlight, Close and Resume buttons |
  | strip | `#ECECEC` | question header strip |
  | choice | `#444444` | choice border |
  | quiet | `#F7F7F7` | Check Your Work, Module Over, Stand By |
  | loader | `#2C2C2C` | start loader |
  | break | `#191919` | break screen |
  | tooltip | `#444444` | tooltips |
  | divider | `#7B7B7B` | pane divider |
  | hl-blue | `#E2F2FC` | blue highlight |
  | hl-pink | `#FCDFF5` | pink highlight |

  The recording doesn't show blue or pink applied, so use the swatch colours above.
- **Copy, word for word:**
  - Strip and headings: "THIS IS A PRACTICE TEST", "Check Your Work", "This Module Is Over", "Practice Is Over: Stand By!"
  - Check Your Work lines:
    - "On test day, you won't be able to move on to the next module until time expires."
    - "For these practice questions, you can click **Next** when you're ready to move on."
  - Module Over: "All your work has been saved.", "You'll move on automatically in just a moment.", "Do not refresh this page or quit the app."
  - Stand By: "All your work has been saved, and we're uploading it now. Do not refresh this page or quit the app."
  - Controls: "Mark for Review", "Go to Review Page", "Highlights & Notes", "More", "Line Reader", "Save and Exit", "Directions", "Hide", "Show", "Calculator", "Reference"
  - Grid-in: "Student-produced response directions", "Answer Preview:"
  - Break and resume: see Task 15.
- **Text is English only. No College Board logo or name.**
- **UI building blocks.** Use the house components in `src/components/ui/` (Button, Popover, DropdownMenu, Tooltip, Dialog, Resizable), restyled with classes. Don't add any new UI or animation library.
- **Reduced motion.** Respect `prefers-reduced-motion` with framer-motion's `useReducedMotion()`. The loader figure stays still, and the circle becomes a 200ms crossfade.
- **Commands** (run from `/Users/saranochirsereglen/Developer/tsetsegs-bluebook`):
  - tests: `npx vitest run <file>`
  - types: `npx tsc -p tsconfig.app.json --noEmit`
  - lint: `npx eslint <files>`
  - build: `npx vite build`
- **Commits** end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never push. `main` reaches Lovable, so pushing is Saagii's call.

## Review Focus

1. **Refreshing mid-module** must not reset the clock or lose answers. Pinned in Task 1 (`remainingSeconds`) and Task 9 (write-once start).
2. **Fast typing in a grid-in**, or a dropped connection: the last value typed must be the one saved, and a failed save must not vanish silently. Finishing must wait for every pending save. Pinned in Task 2 (save queue: coalesce, order, retry, `flush` rejects) and Task 8 (Stand By retry).
3. **Time running out** while Check Your Work or the question pop-up is open, or a double click on Next on Check Your Work: the module ends exactly once, and no module is skipped. Pinned in Task 3 (the reducer ignores `moduleDone` outside `test`/`review`).
4. **Opening the test URL of a finished attempt**, from the back button or a refresh after finishing: it must go to `/practice/bluebook`, not restart the test. Pinned in Task 9.
5. **Phone at 375px:** no sideways scroll, and the choices, pill and Back/Next all fit. Pinned in Task 10 (browser check `noSideways`).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/bluebookTest.ts` (+ `.test.ts`) | Pure helpers: module order and next step, section label, timer maths, clock text, answer preview, cross-out toggling, browser storage, save queue. Highlight helpers come in Task 13. |
| `src/lib/bluebookStage.ts` (+ `.test.ts`) | Pure stage reducer for the whole test flow. |
| `src/components/bluebook-test/bluebook.css` | `.bluebook` tokens, fonts, dashed rules, light resets, `::highlight()` styles. |
| `src/components/bluebook-test/BluebookFrame.tsx` (+ `.test.tsx`) | Root, top bar, practice strip, bottom bar, Directions panel, More menu, font link. |
| `src/components/bluebook-test/QuestionGrid.tsx` (+ `.test.tsx`) | The numbered grid with its legend, the navigator pop-up content, and the Check Your Work page. |
| `src/components/bluebook-test/QuestionPane.tsx` (+ `.test.tsx`) | Question header strip, answer choices with cross-out, grid-in input with preview, and grid-in directions. |
| `src/components/bluebook-test/MathTools.tsx` | Figure zoom toolbar and the right-hand reference panel. |
| `src/components/bluebook-test/Screens.tsx` (+ `.test.tsx`) | DotSpinner, ModuleOver, StandBy, then BreakScreen and ResumeScreen (Task 15). The dimmed module switch is `BluebookFrame dimmed`. |
| `src/components/bluebook-test/Transitions.tsx` | StartLoader (hairline) and IrisTransition. |
| `src/components/bluebook-test/BluebookSession.tsx` | Puts it together: holds the stage reducer, current question, tool state, and the side effects for each stage. |
| `src/components/bluebook-test/Passage.tsx` | (Phase 2) passage pane with highlights, notes and the line reader. |
| `src/pages/dev/BluebookPreview.tsx` + `src/pages/dev/bluebookFixtures.ts` | (Phase 2) dev-only preview with fixture data. |
| `src/pages/student/StudentBluebookTest.tsx` | Modified: data only, then renders `BluebookSession`. |
| `src/pages/student/StudentBluebook.tsx:206,255` | Modified: start attempts with `module_started_at: null`. |
| `src/components/student/DesmosCalculator.tsx` | Modified: optional `dockOnOpen` prop. |
| `src/portal/topicFigures.ts` | Modified: export `ALL_FIGURES`. |
| `src/App.tsx` | Modified: dev-only preview route (phase 2). |
| `Saagii21/flowersos/tools/portal-e2e/bluebook.mjs` | Browser check (outside the repo). |

---

# Phase 1: Math

### Task 1: Pure test helpers

**Files:**
- Create: `src/lib/bluebookTest.ts`
- Test: `src/lib/bluebookTest.test.ts`

**Interfaces:**
- Produces:
  - `type FlowModule = { id: string; section: string; module_number: number }`
  - `type NextStep = { kind: 'same-section'; moduleId: string } | { kind: 'break'; moduleId: string } | { kind: 'finish' }`
  - `sortModules<T extends FlowModule>(m: T[]): T[]`. Reading & Writing sorts before Math, then by `module_number`.
  - `nextStep(modules: FlowModule[], currentId: string): NextStep`
  - `sectionLabel(modules: FlowModule[], current: FlowModule): string`
  - `remainingSeconds(startedAt: string | null, limitMinutes: number, now: number): number | null`. Returns null when the clock hasn't started, and floors at 0.
  - `timerShown(hidden: boolean, remaining: number | null): boolean`
  - `formatClock(seconds: number): string`
  - `answerPreview(raw: string): string`. Returns MathText input.
  - `toggleLetter(list: string[], letter: string): string[]`
  - `readLocal<T>(key: string, fallback: T): T` and `writeLocal(key: string, value: unknown): void`
  - `crossOutKey(attemptId: string, questionId: string): string`, which returns `bb:x:${attemptId}:${questionId}`

- [ ] **Step 1: Set up the worktree.** Run `ln -s /Users/saranochirsereglen/Developer/tsetsegs-p1/node_modules node_modules` in the worktree (the same target `tsetsegs-figures` uses), then `npx vitest run src/portal/HairlineFigure.test.tsx`. Expected: PASS. If anything fails to import, stop and report. Don't install packages into the shared folder.

- [ ] **Step 2: Write the failing tests.**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { sortModules, nextStep, sectionLabel, remainingSeconds, timerShown, formatClock, answerPreview, toggleLetter, readLocal, writeLocal } from './bluebookTest';

const rw1 = { id: 'r1', section: 'reading_writing', module_number: 1 };
const rw2 = { id: 'r2', section: 'reading_writing', module_number: 2 };
const m1 = { id: 'm1', section: 'math', module_number: 1 };
const m2 = { id: 'm2', section: 'math', module_number: 2 };

describe('module flow', () => {
  it('orders reading & writing before math', () => expect(sortModules([m2, rw2, m1, rw1]).map(m => m.id)).toEqual(['r1', 'r2', 'm1', 'm2']));
  it('same section goes to This Module Is Over', () => expect(nextStep([m1, m2], 'm1')).toEqual({ kind: 'same-section', moduleId: 'm2' }));
  it('reading & writing into math is a break', () => expect(nextStep([rw1, rw2, m1, m2], 'r2')).toEqual({ kind: 'break', moduleId: 'm1' }));
  it('last module finishes', () => expect(nextStep([m1, m2], 'm2')).toEqual({ kind: 'finish' }));
  it('math-only tests call math section 1', () => expect(sectionLabel([m1, m2], m2)).toBe('Section 1, Module 2: Math'));
  it('full tests call math section 2', () => expect(sectionLabel([rw1, rw2, m1, m2], m1)).toBe('Section 2, Module 1: Math'));
  it('reading & writing label', () => expect(sectionLabel([rw1, rw2, m1, m2], rw1)).toBe('Section 1, Module 1: Reading and Writing'));
});

describe('timer', () => {
  const t0 = Date.parse('2026-11-01T10:00:00Z');
  it('is not running before the clock starts', () => expect(remainingSeconds(null, 35, t0)).toBeNull());
  it('counts from the saved start, so a refresh keeps time', () => expect(remainingSeconds('2026-11-01T10:00:00Z', 35, t0 + 61_500)).toBe(2038));
  it('never goes below zero', () => expect(remainingSeconds('2026-11-01T09:00:00Z', 35, t0)).toBe(0));
  it('hidden timer shows itself at 5:00', () => { expect(timerShown(true, 301)).toBe(false); expect(timerShown(true, 300)).toBe(true); });
  it('formats like Bluebook', () => { expect(formatClock(2100)).toBe('35:00'); expect(formatClock(591)).toBe('9:51'); expect(formatClock(0)).toBe('0:00'); });
});

describe('answer preview', () => {
  it('typesets fractions', () => expect(answerPreview('3/343')).toBe('$\\frac{3}{343}$'));
  it('keeps the minus outside', () => expect(answerPreview('-7/2')).toBe('$-\\frac{7}{2}$'));
  it('leaves decimals alone', () => expect(answerPreview('3.5')).toBe('3.5'));
  it('empty stays empty', () => expect(answerPreview('')).toBe(''));
});

describe('cross-out list and storage', () => {
  it('toggles a letter', () => { expect(toggleLetter([], 'A')).toEqual(['A']); expect(toggleLetter(['A', 'C'], 'A')).toEqual(['C']); });
  beforeEach(() => { const m = new Map<string, string>(); (globalThis as any).localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; });
  it('round-trips', () => { writeLocal('k', ['B']); expect(readLocal('k', [])).toEqual(['B']); });
  it('falls back when storage throws', () => { (globalThis as any).localStorage = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } }; expect(readLocal('k', ['x'])).toEqual(['x']); expect(() => writeLocal('k', 1)).not.toThrow(); });
});
```

- [ ] **Step 3: Run it to make sure it fails.** Run `npx vitest run src/lib/bluebookTest.test.ts`. Expected: FAIL, with "Failed to resolve import ./bluebookTest".

- [ ] **Step 4: Write the helpers in `src/lib/bluebookTest.ts`.**
  - `sectionLabel` numbers sections by their order among the distinct sections of the sorted modules, and names them "Reading and Writing" and "Math".
  - `answerPreview` only typesets the `a/b` pattern; anything else comes back unchanged.
  - The storage helpers wrap every access in try/catch.
  - Move the sort comparator out of the page's `handleModuleComplete` (`StudentBluebookTest.tsx:330-337`). Don't copy it.

- [ ] **Step 5: Run the tests to make sure they pass.** Same command. Expected: PASS, 20 tests.

- [ ] **Step 6: Commit.** `git add src/lib/bluebookTest.ts src/lib/bluebookTest.test.ts`, then commit with "Bluebook test helpers: module flow, labels, timer, answer preview".

### Task 2: Answer save queue

**Files:**
- Modify: `src/lib/bluebookTest.ts`
- Test: `src/lib/bluebookTest.test.ts`

**Interfaces:**
- Produces:
  - `type SaveRow = { questionId: string; moduleId: string; answer: string | null; isMarked: boolean; timeSpent: number }`
  - `createSaveQueue(save: (row: SaveRow) => Promise<void>, retryMs = 2000): { push(row: SaveRow): void; flush(): Promise<void>; pending(): number }`

The queue allows at most one save in flight per question. A row pushed while one is in flight replaces any older pending row for that question, so only the latest row goes next. When a save fails, the row stays pending and is retried after `retryMs`. `flush()` resolves once nothing is in flight or pending. If a save for a row still fails after one retry inside `flush`, `flush` rejects.

- [ ] **Step 1: Write the failing tests.**

```ts
describe('save queue', () => {
  const row = (answer: string, q = 'q1') => ({ questionId: q, moduleId: 'm1', answer, isMarked: false, timeSpent: 1 });
  it('sends only the first and the latest value while typing fast', async () => {
    const sent: string[] = []; let release!: () => void;
    const save = (r: any) => { sent.push(r.answer); return sent.length === 1 ? new Promise<void>(res => (release = res)) : Promise.resolve(); };
    const q = createSaveQueue(save);
    q.push(row('3')); q.push(row('3/')); q.push(row('3/3'));
    release(); await q.flush();
    expect(sent).toEqual(['3', '3/3']);
  });
  it('different questions save independently', async () => {
    const sent: string[] = []; const q = createSaveQueue(async r => void sent.push(r.questionId));
    q.push(row('A', 'q1')); q.push(row('B', 'q2')); await q.flush();
    expect(sent.sort()).toEqual(['q1', 'q2']);
  });
  it('retries a failed save', async () => {
    let calls = 0; const q = createSaveQueue(async () => { if (++calls === 1) throw new Error('offline'); }, 1);
    q.push(row('A')); await q.flush();
    expect(calls).toBe(2); expect(q.pending()).toBe(0);
  });
  it('flush rejects when saving keeps failing, and keeps the row', async () => {
    const q = createSaveQueue(async () => { throw new Error('offline'); }, 1);
    q.push(row('A'));
    await expect(q.flush()).rejects.toThrow();
    expect(q.pending()).toBe(1);
  });
});
```

- [ ] **Step 2: Run them to make sure they fail.** Run `npx vitest run src/lib/bluebookTest.test.ts -t "save queue"`. Expected: FAIL, "createSaveQueue is not a function".
- [ ] **Step 3: Write `createSaveQueue` in `src/lib/bluebookTest.ts`.** Use a `Map<questionId, { inFlight: Promise<void> | null; next: SaveRow | null }>`.
- [ ] **Step 4: Run the tests to make sure they pass.** Expected: PASS.
- [ ] **Step 5: Commit** with "Bluebook save queue: latest value wins, retries, flush before finishing".

### Task 3: Stage reducer

**Files:**
- Create: `src/lib/bluebookStage.ts`
- Test: `src/lib/bluebookStage.test.ts`

**Interfaces:**
- Consumes: `NextStep` (Task 1).
- Produces:
  - ```ts
    type Stage =
      | { name: 'loading' } | { name: 'switching' } | { name: 'test' } | { name: 'review' }
      | { name: 'moduleOver'; moduleId: string } | { name: 'break'; moduleId: string } | { name: 'resume'; moduleId: string }
      | { name: 'standby' } | { name: 'iris' } | { name: 'results' }
    ```
  - ```ts
    type StageEvent =
      | { type: 'ready' } | { type: 'openReview' } | { type: 'backToQuestions' }
      | { type: 'moduleDone'; next: NextStep } | { type: 'advanced' }
      | { type: 'breakDone' } | { type: 'resumeClicked' } | { type: 'scored' } | { type: 'irisClosed' }
    ```
  - `stageReducer(s: Stage, e: StageEvent): Stage`. It returns `s` unchanged (the same object) for any event that isn't valid in the current stage.

The transitions:

| Event | From | To |
|---|---|---|
| `ready` | `loading`, `switching` | `test` |
| `openReview` | `test` | `review` |
| `backToQuestions` | `review` | `test` |
| `moduleDone` | `test`, `review` | by `next.kind`: `same-section` → `moduleOver`; `break` → `break`; `finish` → `standby` |
| `advanced` | `moduleOver` | `switching` |
| `breakDone` | `break` | `resume` |
| `resumeClicked` | `resume` | `switching` |
| `scored` | `standby` | `iris` |
| `irisClosed` | `iris` | `results` |

- [ ] **Step 1: Write the failing tests.** Cover the full Math-only path (`loading → test → review → moduleOver → switching → test → review → standby → iris → results`) and the full-test path through `break → resume → switching`. Then pin these:

```ts
it('time running out on Check Your Work ends the module once', () => {
  const over = stageReducer({ name: 'review' }, { type: 'moduleDone', next: { kind: 'same-section', moduleId: 'm2' } });
  expect(stageReducer(over, { type: 'moduleDone', next: { kind: 'finish' } })).toBe(over);
});
it('a stray ready during the test does nothing', () => { const s = { name: 'test' } as const; expect(stageReducer(s, { type: 'ready' })).toBe(s); });
```

- [ ] **Step 2: Run them to make sure they fail.** Run `npx vitest run src/lib/bluebookStage.test.ts`. Expected: FAIL.
- [ ] **Step 3: Write `stageReducer`** as a `switch` on `e.type` that checks `s.name`.
- [ ] **Step 4: Run the tests to make sure they pass.** Expected: PASS.
- [ ] **Step 5: Commit** with "Bluebook stage reducer".

### Task 4: Bluebook frame (tokens, top bar, strip, bottom bar)

**Files:**
- Create: `src/components/bluebook-test/bluebook.css`, `src/components/bluebook-test/BluebookFrame.tsx`
- Test: `src/components/bluebook-test/BluebookFrame.test.tsx`

**Interfaces:**
- Consumes: `formatClock` and `timerShown` (Task 1).
- Produces:
  - ```ts
    type Tool = { key: string; label: string; icon: ReactNode; active?: boolean; onClick(): void }
    type MenuItem = { label: string; icon: ReactNode; onClick(): void }
    ```
  - `BluebookFrame(props)` with these props:
    - `sectionLabel: string`
    - `directions: ReactNode`, the body of the Directions panel
    - `remaining: number | null`, `timerHidden: boolean`, `onToggleTimer(): void`
    - `tools: Tool[]`, `menu: MenuItem[]`
    - `studentName: string`
    - `pill?: { label: string; open: boolean; onOpenChange(o: boolean): void; content: ReactNode }`. It's absent on screens without one.
    - `onBack?: () => void` and `onNext?: () => void`. Each button is hidden when its handler is undefined.
    - `dimmed?: boolean`, which greys the body and adds a centred `DotSpinner`. Used for the `switching` stage in Task 9.
    - `bodyClassName?: string`, `children: ReactNode`
  - `useBluebookFonts(): void`. It appends the font `<link>` once and never removes it.

Layout, matched against `crops/header.png` and `crops/footer.png`:
- **Top bar** (`#E0E9F5`):
  - left: the label, about 20px Roboto 500, with "Directions ⌄" underneath
  - centre: the timer, about 22px Roboto 700, with a small outlined "Hide"/"Show" pill. When `timerShown` is false, the digits are replaced by nothing.
  - right: the tools (icon over label; underline when `active`), then "More" (⋮), which opens a DropdownMenu with the `menu` items
- **Dashed rule** under the top bar.
- **Practice strip**: navy, inset 16px from each side, rounded bottom corners, white bold 13px caps text "THIS IS A PRACTICE TEST".
- **Bottom bar** (`#E0E9F5`) with a dashed rule above it:
  - left: the name, Roboto 500
  - centre: the black pill. It's a Popover trigger whose content has a pointer, a white card and the `bluebook` class.
  - right: blue pills reading "Back" and "Next"
- **Directions** opens a Dialog: white panel, yellow "Close" pill, grey overlay.
- **`bluebook.css`**:
  - token variables (Global Constraints)
  - `.bb-serif`
  - `.bb-rule` (the dashed rule, drawn with a `repeating-linear-gradient`)
  - `.bb-pill-blue`, `.bb-pill-yellow`
  - the light resets of the shadcn variables
- **Phones (<768px):** tools fold into More, the name is hidden, and the label truncates.
- **Calculator push.** The frame reads `useCalculatorSnap()` and applies `md:ml-[40vw]` / `md:mr-[40vw]` to the header, body and footer, the same way the page does today (`StudentBluebookTest.tsx:514-518`).

- [ ] **Step 1: Write the failing tests** using `renderToStaticMarkup`. Mock `@/components/student/DesmosCalculator` so it exports `useCalculatorSnap: () => null`.

```tsx
it('renders the Bluebook chrome', () => {
  const html = render({ sectionLabel: 'Section 1, Module 1: Math', remaining: 2100, timerHidden: false, studentName: 'Saagii Sergelen', pill: pill('Question 1 of 22'), onNext: () => {} });
  for (const s of ['bluebook', 'Section 1, Module 1: Math', '35:00', 'Hide', 'THIS IS A PRACTICE TEST', 'Saagii Sergelen', 'Question 1 of 22', 'Next', 'Directions']) expect(html).toContain(s);
  expect(html).not.toContain('>Back<');
});
it('hidden timer shows Show and no digits', () => { const html = render({ remaining: 900, timerHidden: true }); expect(html).toContain('Show'); expect(html).not.toContain('15:00'); });
it('hidden timer comes back at 5 minutes', () => expect(render({ remaining: 300, timerHidden: true })).toContain('5:00'));
```

- [ ] **Step 2: Run them to make sure they fail.** Run `npx vitest run src/components/bluebook-test/BluebookFrame.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Build `BluebookFrame`, `useBluebookFonts` and `bluebook.css`.** Import the CSS from `BluebookFrame.tsx`.
- [ ] **Step 4: Run the tests to make sure they pass,** then run `npx tsc -p tsconfig.app.json --noEmit`. Expected: PASS, with no type errors.
- [ ] **Step 5: Commit** with "Bluebook frame: bars, practice strip, timer, More menu".

### Task 5: Question grid, navigator pop-up, Check Your Work

**Files:**
- Create: `src/components/bluebook-test/QuestionGrid.tsx`
- Test: `src/components/bluebook-test/QuestionGrid.test.tsx`

**Interfaces:**
- Produces:
  - `type GridItem = { answered: boolean; marked: boolean }`
  - `QuestionGrid({ items: GridItem[]; current: number | null; onPick(i: number): void; size: 'small' | 'large' })`
  - `NavigatorContent({ title: string; items; current; onPick; onClose(): void; onReviewPage(): void })`
  - `CheckYourWork({ title: string; items; onPick })`

Details, matched against `crops/navigator.png` and `crops/check-work.png`:
- **Grid boxes:**
  - unanswered: dashed 1px ink border, blue bold number
  - answered: solid blue fill with a white number
  - marked: a small red bookmark at the top-right corner
  - current: a map-pin icon above the box, with the number underlined
  - `size: 'large'` is the Check Your Work size
- **Navigator pop-up:** title "{label} Questions" with a close ×; a legend row (Current / Unanswered / For Review) between grey rules; the grid; an outlined blue "Go to Review Page" pill.
- **Check Your Work:** a `#F7F7F7` page, the heading and the two exact lines (Global Constraints), and a white card holding the title, the legend (Unanswered / For Review) and the large grid.

- [ ] **Step 1: Write the failing tests.** Check:
  - an answered item renders with the blue-fill class
  - an unanswered item has the dashed class
  - a marked item contains `aria-label="For Review"`
  - the current item has `aria-current="true"`
  - `NavigatorContent` contains "Go to Review Page" and "Current"
  - `CheckYourWork` contains both exact sentences and the `<strong>Next</strong>` markup
- [ ] **Step 2: Run them to make sure they fail.** Expected: FAIL.
- [ ] **Step 3: Build the three components.** Every grid box is a `<button>` with `aria-label="Question {n}{, answered}{, for review}"`.
- [ ] **Step 4: Run the tests to make sure they pass.** Expected: PASS.
- [ ] **Step 5: Commit** with "Bluebook question grid, navigator and Check Your Work".

### Task 6: Question pane (header strip, choices, cross-out, grid-in)

**Files:**
- Create: `src/components/bluebook-test/QuestionPane.tsx`
- Test: `src/components/bluebook-test/QuestionPane.test.tsx`

**Interfaces:**
- Consumes: `normaliseChoices` (`src/lib/bluebookReview.ts`), `MathText`, `answerPreview` (Task 1).
- Produces:
  - `QuestionHeader({ number: number; marked: boolean; onToggleMark(): void; crossOutMode: boolean; onToggleCrossOut(): void })`
  - `AnswerChoices({ options: unknown; images: unknown; selected: string | null; crossed: string[]; crossOutMode: boolean; onSelect(letter: string): void; onToggleCross(letter: string): void })`
  - `GridIn({ value: string; onChange(v: string): void })`
  - `SprDirections()`

Details, matched against `crops/eliminated.png`, `crops/selected.png`, `crops/marked-review.png` and `crops/gridin.png`:
- **Header strip:**
  - `#ECECEC` background with a dashed rule below
  - a black square with a white bold number
  - a bookmark icon plus "Mark for Review". The icon is outlined, or filled `#B7293A` when marked, and the label is underlined when marked.
  - on the far right, the "ABC" button (letters with a slash), filled blue when `crossOutMode` is on
- **Choices:**
  - a full-width `<button role="radio" aria-checked>`: 1px `#444` border, 8px radius, a circled letter, Noto Serif text through `MathText`, and the image if there is one
  - selected: 3px blue border, and the circled letter is filled blue
  - with `crossOutMode` on, each choice gets a circled letter with a strike button to its right (`aria-label="Cross out {L}"`)
  - a crossed choice shows strike-through, grey text, and an "Undo" text button in place of the strike icon
  - selecting a crossed choice calls `onToggleCross(letter)` first, so it un-crosses, then `onSelect`
- **GridIn:** a small boxed input (about 110px wide) with a blue underline, a maximum of 6 characters (the spec's 5 positive or 6 negative), then "Answer Preview: " with `MathText text={answerPreview(value)}`.
- **SprDirections:** "Student-produced response directions" (bold Noto Serif), then the five bullets word for word from `crops/gridin.png`, then the Examples table:

  | Answer | Acceptable ways to enter answer | Unacceptable: will NOT receive credit |
  |---|---|---|
  | 3.5 | 3.5, 3.50, 7/2 | 31/2, 3 1/2 |
  | 2/3 | 2/3, .6666, .6667, 0.666, 0.667 | 0.66, .66, 0.67, .67 |
  | −1/3 | −1/3, −.3333, −0.333 | −.33, −0.33 |

  The first row is visible in the crop. The rest are Bluebook's standard table rows, so confirm them against `full/t144.png`.

- [ ] **Step 1: Write the failing tests.** Check:
  - the selected choice has `aria-checked="true"`
  - a crossed letter renders `line-through` and "Undo"
  - with `crossOutMode` false there are no "Cross out" buttons
  - a marked header contains the filled-flag class
  - `GridIn` with `"3/343"` contains KaTeX `frac` output
  - `SprDirections` contains "Student-produced response directions" and "Unacceptable: will NOT receive credit"
- [ ] **Step 2: Run them to make sure they fail.** Expected: FAIL.
- [ ] **Step 3: Build the components.**
- [ ] **Step 4: Run the tests to make sure they pass.** Expected: PASS.
- [ ] **Step 5: Commit** with "Bluebook question pane: header strip, choices with cross-out, grid-in".

### Task 7: Math tools (figure zoom, reference panel, docked calculator)

**Files:**
- Create: `src/components/bluebook-test/MathTools.tsx`
- Modify: `src/components/student/DesmosCalculator.tsx:54` (the signature) and the toggle handler at about lines 225-235
- Test: `src/lib/bluebookTest.test.ts`, for `nextZoom`

**Interfaces:**
- Produces:
  - `FigureZoom({ children: ReactNode })`
  - `ReferencePanel({ open: boolean; onClose(): void })`
  - `nextZoom(z: number, dir: 1 | -1): number`, which steps 25% within 50–200%. Add it to `bluebookTest.ts`.
  - `DesmosCalculator({ dockOnOpen }: { dockOnOpen?: SnapSide } = {})`. When it opens and `dockOnOpen` is set and it isn't the mobile pane, it calls `setSnapSide(dockOnOpen)` and `dispatchSnapEvent(dockOnOpen)`. It dispatches `null` when it closes.

Details:
- **FigureZoom** (`full/t117.5.png`): a small grey toolbar above the figure with zoom in, zoom out, the percentage, Reset, a divider, and full screen. The figure scales with a CSS `transform` inside an `overflow:auto` box. Full screen is a Dialog showing the same figure at 100%, with the `bluebook` class.
- **ReferencePanel** (`scenes/s026.png`): a fixed right panel, about 420px wide, full height under the top bar, with a white background and a left border. Its title row says "Reference", with expand (which widens it to 60vw) and close. The body is a scrollable `src/assets/sat-reference-sheet.jpg` with `alt="SAT Math Reference Sheet"`. It overlays the page and doesn't push it.
- **Calculator:** other callers don't pass the prop, so their behaviour doesn't change.

- [ ] **Step 1: Write the failing test.** Add `it('zoom steps 25% between 50 and 200', () => { expect(nextZoom(100, 1)).toBe(125); expect(nextZoom(200, 1)).toBe(200); expect(nextZoom(50, -1)).toBe(50); })`.
- [ ] **Step 2: Run it to make sure it fails.** Expected: FAIL.
- [ ] **Step 3: Write `nextZoom`, `FigureZoom`, `ReferencePanel` and the `dockOnOpen` prop.**
- [ ] **Step 4: Run the tests, then the type check.** Run `npx vitest run src/lib/bluebookTest.test.ts && npx tsc -p tsconfig.app.json --noEmit`. Expected: PASS.
- [ ] **Step 5: Run a regression check.** `grep -rn "<DesmosCalculator" src` should show the other callers unchanged.
- [ ] **Step 6: Commit** with "Bluebook math tools: figure zoom, reference panel, calculator docks left".

### Task 8: Screens and transitions

**Files:**
- Create: `src/components/bluebook-test/Screens.tsx`, `src/components/bluebook-test/Transitions.tsx`
- Modify: `src/portal/topicFigures.ts` (add the `ALL_FIGURES` export)
- Test: `src/components/bluebook-test/Screens.test.tsx`

**Interfaces:**
- Produces:
  - `ALL_FIGURES: HairlineSpec[]`, the unique values of `OWN` (52 today)
  - `pickFigure(rand: () => number = Math.random): HairlineSpec`, in `Transitions.tsx`
  - `DotSpinner({ className?: string })`
  - `ModuleOver()`
  - `StandBy({ error: boolean; onRetry(): void })`
  - `StartLoader({ figure: HairlineSpec })`
  - `IrisTransition({ phase: 'closing' | 'opening'; onDone(): void; children: ReactNode })`
  - Exported constants: `LOADER_MIN_MS = 1500`, `MODULE_OVER_MS = 5000` (measured in the recording), `SWITCHING_MIN_MS = 1500`, `IRIS_MS = 600`

Details:
- **DotSpinner:** a ring of 8 dots that fade in turn (CSS keyframes), as in `scenes/s004.png`.
- **ModuleOver** (`scenes/s012.png`): a full `#F7F7F7` screen; a blue "This Module Is Over" title in Roboto 400 at about 26px; the three lines; DotSpinner.
- **StandBy** (`scenes/s043.png`): a `#F7F7F7` screen with the title "Practice Is Over: Stand By!", the paragraph, and a white card holding a DotSpinner and a simple line drawing of a laptop with an up arrow. Draw it as an inline SVG with a stroke of `currentColor`; don't use College Board's art.
  - When `error` is true, the card says "Some answers didn't save. Check your connection." with a blue "Try again" pill that calls `onRetry`.
- **StartLoader:** a full `#2C2C2C` screen with `<HairlineFigure figure={figure} play className="w-[min(70vw,420px)]" />` in the centre. There's no text. The class `bb-loader` sets `--hairline-plate: transparent` and sets `--hairline-hi`, `--hairline-edge`, `--hairline-mid` and `--hairline-lo` to light greys.
- **IrisTransition:** a fixed full-screen layer with a `#111` backdrop. `children` sit inside a framer-motion `clipPath` that animates between `circle(150% at 50% 50%)` and `circle(0% at 50% 50%)`: closing shrinks it, opening grows it. It takes `IRIS_MS` with `easeIn` for closing and `easeOut` for opening, and calls `onDone` at the end. With reduced motion, it does an opacity crossfade over 200ms.

- [ ] **Step 1: Write the failing tests.** Check:
  - `ALL_FIGURES.length === new Set(ALL_FIGURES).size` and the length is ≥ 50
  - `pickFigure(() => 0) === ALL_FIGURES[0]` and `pickFigure(() => 0.9999) === ALL_FIGURES.at(-1)`
  - `ModuleOver` contains all three exact lines
  - `StandBy({ error: false })` contains "Practice Is Over: Stand By!" and the exact paragraph
  - `StandBy({ error: true })` contains "Try again"
- [ ] **Step 2: Run them to make sure they fail.** Expected: FAIL.
- [ ] **Step 3: Build them.**
- [ ] **Step 4: Run the tests to make sure they pass,** and the type check. Expected: PASS.
- [ ] **Step 5: Commit** with "Bluebook screens: loader, module over, stand by, iris".

### Task 9: BluebookSession, and wiring the page

**Files:**
- Create: `src/components/bluebook-test/BluebookSession.tsx`
- Modify: `src/pages/student/StudentBluebookTest.tsx`, a full render rewrite
- Modify: `src/pages/student/StudentBluebook.tsx:206` and `:255`, to `module_started_at: null`
- Test: `src/lib/bluebookTest.test.ts`, for `startModuleClock` with a mocked client

**Interfaces:**
- Consumes: everything above.
- Produces:
  - `type SessionModule = FlowModule & { time_limit_minutes: number }`
  - `type SessionQuestion`: the page's current `Question` interface, moved and exported from `BluebookSession.tsx`
  - `BluebookSession` props:
    ```ts
    interface BluebookSessionProps {
      attemptId: string; studentName: string;
      modules: SessionModule[];                 // every module of the test
      module: SessionModule | null;             // current
      questions: SessionQuestion[] | undefined; // undefined while the current module's questions load
      answers: Record<string, { answer_submitted: string | null; is_marked: boolean }>;
      startedAt: string | null;
      onStartClock(): Promise<void>;            // write-once start, updates startedAt
      onAnswer(questionId: string, value: string): void;
      onToggleMark(questionId: string): void;
      onAdvance(moduleId: string): Promise<void>; // page moves the attempt, module_started_at = null
      onFinish(): Promise<BluebookResultsData>; // flushes saves, scores, marks completed; rejects if saving failed
      onExit(): void;                           // Save and Exit, and closing the results
    }
    ```
  - `startModuleClock(client, attemptId: string): Promise<string>` in `bluebookTest.ts`. It runs `update({ module_started_at: now }).eq('id', attemptId).is('module_started_at', null)`, then selects and returns the stored `module_started_at`. That's the existing value when another tab won.

**Session behaviour.** `useReducer(stageReducer, { name: 'loading' })`, plus the side effects for each stage:
- **`loading` and `switching`:** wait until `questions` is defined and the minimum time has passed (`LOADER_MIN_MS` for loading, `SWITCHING_MIN_MS` for switching). If `startedAt` is null, `await onStartClock()`. Then dispatch `ready`.
  - Pick the loader figure once with `useState(() => pickFigure())`.
  - `switching` renders the frame with `dimmed`.
- **`test`:**
  - Show the current question. Math with `question_type === 'multiple_choice'` gets one centred column, about 830px wide, with `FigureZoom` around `QuestionFigures`. A grid-in gets two panes: `SprDirections` on the left, and the question plus `GridIn` on the right.
  - Next on the last question dispatches `openReview`.
  - The pill opens `NavigatorContent`.
  - A 1-second tick recomputes `remainingSeconds(startedAt, module.time_limit_minutes, Date.now())`. At 0, during `test` or `review`, it dispatches `moduleDone` with `nextStep(modules, module.id)`.
  - Mount `<DesmosCalculator dockOnOpen="left" />` and the `ReferencePanel` on Math. Their tools are "Calculator" (active when the calculator is docked) and "Reference".
- **`review`:** `CheckYourWork`. Back dispatches `backToQuestions` to the last question. Next dispatches `moduleDone`. Picking a number goes to that question and dispatches `backToQuestions`.
- **`moduleOver`:** wait for `MODULE_OVER_MS` and `onAdvance(moduleId)` together, reset the question index to 0, then dispatch `advanced`.
- **`standby`:** `onFinish()`.
  - On success, store the results and dispatch `scored`.
  - On rejection, show `StandBy error`. "Try again" calls `onFinish()` again.
- **`iris`:** render `<IrisTransition phase="closing">` over the Bluebook frame. On done, dispatch `irisClosed`.
- **`results`:** render `<div className="student-theme min-h-screen">` with `<BluebookResultsDialog open results onClose={onExit} />` inside `<IrisTransition phase="opening">`.
- **Cross-outs:** `crossOutMode` is one boolean per session. The crossed letters per question live in `readLocal` and `writeLocal` under `crossOutKey`.
- **More menu:** in phase 1 it has only Save and Exit, which calls `onExit`.
- **Math Directions panel:** "The questions in this section address a number of important math skills." / "Use of a calculator is permitted for all questions. A reference sheet, calculator, and these directions can be accessed throughout the test." / "Unless otherwise indicated:" followed by the bullets "All variables and expressions represent real numbers.", "Figures provided are drawn to scale.", "All figures lie in a plane." and "The domain of a given function *f* is the set of all real numbers *x* for which *f*(*x*) is a real number." / "For multiple-choice questions, solve each problem and choose the correct answer from the choices provided. Each multiple-choice question has a single correct answer." / "For student-produced response questions, solve each problem and enter your answer as described below." followed by `<SprDirections />`. The recording doesn't show the Math directions, so this is the SAT's published wording. Flag it in the phase 1 report so Saagii can compare it against Bluebook.
- **Timer:** "Hide" toggles session state.
- **Desmos context:** keep `setDesmosContext({ questionId, context: 'bluebook' })` on math questions, and clear it on unmount (from the page's lines 456-460).

**Page changes:**
- Keep the four existing queries. Add an all-modules query: `bluebook_modules` `id, section, module_number, time_limit_minutes` for `attempt.test_id`.
- Pass `questions` only when it belongs to `attempt.current_module_id`.
- **Saving:** replace `saveAnswerMutation` with one `createSaveQueue` built in a `useRef`. Its `save` upserts with `module_id` taken from the row, not from a closure. `onAnswer` and `onToggleMark` update local state as today and `push`.
- **`onStartClock`:** `startModuleClock(supabase, attemptId)`, then `queryClient.setQueryData(['bluebook-attempt', attemptId], a => ({ ...a, module_started_at }))`.
- **`onAdvance(id)`:** the old `moveToNextModule`, with `module_started_at: null`. It no longer calls `setShowBreak`.
- **`onFinish`:** `await queue.flush()`, then the old `completeTest` body. It returns the results instead of opening the dialog.
- **`onExit`:** the old `handleResultsClose` (invalidate caches, then go to `/practice/bluebook`). For Save and Exit, flush first and ignore errors, because the queue has already retried.
- **If `attempt.status === 'completed'`:** `navigate('/practice/bluebook', { replace: true })`.
- **Remove:** the old JSX (lines 462-858), `showBreak`, the 5-minute toast, "Save Progress", "Take a Break", `handleContinueFromBreak`, and the now-unused imports.

**Steps:**

- [ ] **Step 1: Write the failing test** for `startModuleClock`, using a chainable fake client. Assert that the update payload has `module_started_at`, that `.is` was called with `('module_started_at', null)`, and that the function returns whatever the follow-up select gives back, for example `'2026-11-01T10:00:00Z'`.
- [ ] **Step 2: Run it to make sure it fails.** Expected: FAIL.
- [ ] **Step 3: Write `startModuleClock`. Build `BluebookSession`. Rewrite the page. Change the two inserts in `StudentBluebook.tsx`.**
- [ ] **Step 4: Run the whole check.** Run `npx vitest run && npx tsc -p tsconfig.app.json --noEmit && npx eslint src/components/bluebook-test src/pages/student/StudentBluebookTest.tsx src/lib/bluebookTest.ts src/lib/bluebookStage.ts && npx vite build`. Expected: all pass and the build succeeds.
- [ ] **Step 5: Commit** with "Practice test runs in the Bluebook session; clock starts after the loader".

### Task 10: Browser check (Math path) and the phase 1 checkpoint

**Files:**
- Create: `/Users/saranochirsereglen/Developer/Saagii21/flowersos/tools/portal-e2e/bluebook.mjs`. It's outside the repo, so commit nothing for it.
- Create: `vite.bluebook.config.ts` in the worktree. It spreads `./vite.config` and sets `cacheDir: '.vite-bluebook'`. Add `.vite-bluebook` and `vite.bluebook.config.ts` to `.git/info/exclude`.

**Interfaces:**
- Consumes: `openPage`, `BASE`, `line`, `results`, `noSideways` and `closeAll` from `cdp.mjs`. Copy the header and usage pattern from `proctor.mjs`.

**The check.** It signs in as Saagii's main student account, with the credentials coming only from `BB_PHONE` and `BB_PW` in the environment. Find the student sign-in fields in `src/pages/Login.tsx`. Then it:
1. Opens `/practice/bluebook` and starts the first test. If an in-progress attempt exists, it continues that one instead.
2. Checks that the loader (`.bb-loader svg`) shows. Through `(await import('/src/integrations/supabase/client.ts')).supabase`, it reads the attempt's `module_started_at`: it must be null while the loader shows (for a new attempt) and set after "THIS IS A PRACTICE TEST" appears.
3. Checks the screen:
   - the timer reads `35:00` or `34:5x`
   - the font on `.bb-serif` resolves to "Noto Serif" (`getComputedStyle` and `document.fonts.check`)
   - the top bar's background is `rgb(224, 233, 245)`
4. Answers question 1, crosses out a choice, marks question 2 for review, and opens the pill. In the grid, question 1 must be filled blue and question 2 must show the bookmark.
5. Reloads the page and checks that the timer kept counting (it didn't go back to 35:00) and that answer 1 is still selected.
6. Uses the pop-up's "Go to Review Page" to reach Check Your Work, presses Next, sees "This Module Is Over", then module 2's label "Section 1, Module 2: Math".
7. Answers one grid-in by typing `3/4` quickly. After 2 seconds it reads `bluebook_answers` and checks the row equals `3/4`.
8. Goes to Check Your Work and presses Next. It sees Stand By, then the student-theme results (`.student-theme` present, `.bluebook` gone).
9. Takes screenshots at desktop (1440×900) and phone (375×812). On a phone it asserts `noSideways`.

It runs once per invocation. Saagii OK'd the finished attempts it leaves on his account (spec, "Testing account"), but keep the number of runs low.

- [ ] **Step 1: Start the dev server.** `npx vite --config vite.bluebook.config.ts --port 8098 --strictPort` in the background. The first load takes about 20 seconds.
- [ ] **Step 2: Write `bluebook.mjs`** following `proctor.mjs`.
- [ ] **Step 3: Run it.** `E2E_CDP_PORT=9342 E2E_BASE=http://localhost:8098 BB_PHONE=… BB_PW=… node bluebook.mjs`. Expected: every `line(...)` passes. Fix any failures in the owning task's files and re-run.
- [ ] **Step 4: Compare the screens side by side.** Put the desktop screenshots next to `crops/header.png`, `footer.png`, `selected.png`, `navigator.png` and `check-work.png`. Fix any visible drift in spacing, size or weight, and commit those fixes with "Bluebook polish against the recording".
- [ ] **Step 5: Phase 1 checkpoint.** Request a whole-branch code review (superpowers:requesting-code-review). Report to Saagii with the screenshots. **Don't push.** He decides whether phase 1 ships before phase 2.

# Phase 2: Reading & Writing

### Task 11: Dev preview route with fixtures

**Files:**
- Create: `src/pages/dev/bluebookFixtures.ts`, `src/pages/dev/BluebookPreview.tsx`
- Modify: `src/App.tsx`, adding the route next to line 303

**Interfaces:**
- Consumes: `BluebookSession` props (Task 9).
- Produces: the route `/dev/bluebook`, which takes `?test=full` or `?test=math`. It's registered only when `import.meta.env.DEV`, using `{import.meta.env.DEV && <Route path="/dev/bluebook" element={<BluebookPreview />} />}` with a `lazy()` import, so it's left out of production builds.

The fixtures are four modules (R&W 1, R&W 2, Math 1, Math 2), each with a short time limit (2 minutes) and 3–4 questions.
- **R&W:** questions with `passage_text`, including one that uses an italic `*word*`, one with a `____` blank, and one with notes-style bullets.
- **Math:** one multiple-choice question with `$…$` math, one grid-in, and one with `figure_svg`.

The preview holds answers in `useState`, keeps `startedAt` per module in state, uses a no-op save, and returns made-up results from `onFinish`.

- [ ] **Step 1: Build the fixtures and the preview.**
- [ ] **Step 2: Check the build leaves it out.** Run `npx vite build && ! grep -rl "bluebookFixtures\|R&W fixture" dist/assets`. Expected: the build succeeds and grep finds nothing.
- [ ] **Step 3: Commit** with "Dev-only Bluebook preview with full-test fixtures".

### Task 12: Two-pane Reading & Writing layout

**Files:**
- Modify: `src/components/bluebook-test/BluebookSession.tsx`
- Create: `src/components/bluebook-test/Passage.tsx` (only the layout piece for now)

**Interfaces:**
- Produces: `Passage({ text: string; attemptId: string; questionId: string })`. Task 13 adds highlights.

When `module.section === 'reading_writing'`, or for any question with `passage_text`, the session renders the shadcn `ResizablePanelGroup direction="horizontal"`:
- left: `Passage` in Noto Serif at about 17px with a 1.6 line height
- a `ResizableHandle` restyled to Bluebook's look: a 4px `#7B7B7B` divider with a small black ◂▸ handle
- right: the question header, stem and choices
- `defaultSize={50}`, `minSize={30}`

Under 768px the panes stack, with the passage on top and no handle.

The R&W Directions panel text is: "The questions in this section address a number of important reading and writing skills. Each question includes one or more passages, which may include a table or graph. Read each passage and question carefully, and then choose the best answer to the question based on the passage(s)." and then "All questions in this section are multiple-choice with four answer choices. Each question has a single best answer."

- [ ] **Step 1: Build it.**
- [ ] **Step 2: Check it in the preview** (`/dev/bluebook?test=full`) at 1440 and 375 wide. The divider drags, the passage stacks on a phone, and there's no sideways scroll.
- [ ] **Step 3: Run the type check, then commit** with "Bluebook two-pane reading & writing layout".

### Task 13: Highlights & Notes

**Files:**
- Modify: `src/lib/bluebookTest.ts`, `src/components/bluebook-test/Passage.tsx`, `src/components/bluebook-test/bluebook.css`
- Test: `src/lib/bluebookTest.test.ts`

**Interfaces:**
- Produces:
  - ```ts
    type Highlight = { start: number; end: number; color: 'yellow' | 'blue' | 'pink'; underline: 'none' | 'solid' | 'dashed' | 'dotted'; note: string }
    ```
  - `addHighlight(list: Highlight[], start: number, end: number): Highlight[]`. The new highlight is yellow with no underline and no note. Any highlight it overlaps is absorbed into one that covers the union, keeping the first overlapped one's colour, underline and note.
  - `highlightAt(list: Highlight[], offset: number): number`. Returns the index, or -1.
  - `highlightKey(attemptId, questionId)`, which returns `bb:hl:${attemptId}:${questionId}`

**How it works.** Highlights are character offsets into the passage root's `textContent`.
- **Painting:** use the CSS Custom Highlight API. Build `Range`s from the offsets with a `TreeWalker` over text nodes. Register them as `CSS.highlights.set('bb-yellow' | 'bb-blue' | 'bb-pink' | 'bb-u-solid' | 'bb-u-dashed' | 'bb-u-dotted', new Highlight(...ranges))`. `bluebook.css` styles those six names with `::highlight()` backgrounds (`#FCD400`, `#E2F2FC`, `#FCDFF5`) and `text-decoration` underlines.
- **The DOM stays untouched,** so `MathText` and KaTeX output stay intact.
- **Creating:** while Highlights & Notes is active (the tool's `active` state), a `mouseup`/`touchend` with a non-empty selection inside the passage calls `addHighlight` and clears the selection.
- **Opening the toolbar:** a click finds its caret offset with `document.caretPositionFromPoint`, falling back to `caretRangeFromPoint`. If `highlightAt` finds a highlight, it opens the toolbar.
- **The toolbar** (`crops/highlight-popover.png`) is a rounded white pill with a shadow, above the highlight. It has:
  - three colour circles, with the active one showing a droplet
  - an underline button with a menu of solid / dashed / dotted / None
  - delete (a bin)
  - a divider, then a note button
  - The note opens a small textarea card under the toolbar, which saves on blur.
- **The tooltip** "Highlight mode on: Select text to create a highlight automatically." is a dark `#444` tooltip under the tool. It shows the first time the tool is turned on in a session.
- **Storage:** `readLocal`/`writeLocal` under `highlightKey`.
- **Fallback:** when `!('highlights' in CSS)`, show nothing and leave the tool out. Add the comment `// shortcut: no CSS Custom Highlight API (Safari < 17.2, Firefox < 140) means no highlights; wrap text nodes in <mark> if students hit it.`

**Steps:**

- [ ] **Step 1: Write the failing tests** for `addHighlight` (a separate one, an overlapping merge, a highlight swallowed inside another) and `highlightAt` (the edges count as inside: `start <= o < end`).
- [ ] **Step 2: Run them to make sure they fail.** Expected: FAIL.
- [ ] **Step 3: Write the helpers, then the Passage highlighting, toolbar, notes and tooltip.**
- [ ] **Step 4: Run the tests to make sure they pass, then check in the preview.** Highlight two overlapping bits so they merge. Recolour, underline dotted, add a note, then reload: everything is still there. Delete one.
- [ ] **Step 5: Commit** with "Bluebook Highlights & Notes".

### Task 14: Line Reader

**Files:**
- Modify: `src/components/bluebook-test/Passage.tsx`, `src/components/bluebook-test/BluebookSession.tsx`

**Interfaces:**
- Produces: a "Line Reader" item in the More menu for both sections, which toggles `lineReader: boolean` in the session. `Passage` and the question stem get a `lineReader` prop.

When it's on, a fixed overlay dims everything except a three-line-high band, using rgba(0,0,0,.55) above and below. The band follows the pointer's Y position, and ↑/↓ move it by one line height. Esc or the menu item turns it off.

- [ ] **Step 1: Build it.**
- [ ] **Step 2: Check in the preview** that it follows the mouse, the arrows move it, and Esc closes it.
- [ ] **Step 3: Commit** with "Bluebook line reader".

### Task 15: Break and Resume Testing Now

**Files:**
- Modify: `src/components/bluebook-test/Screens.tsx`, `src/components/bluebook-test/BluebookSession.tsx`
- Test: `src/components/bluebook-test/Screens.test.tsx`

**Interfaces:**
- Produces:
  - `BreakScreen({ studentName: string; onResume(): void })`, with an internal 600-second countdown that calls `onResume` at 0
  - `ResumeScreen({ studentName: string; onResume(): void })`
  - The session renders them for the `break` stage (`onResume` dispatches `breakDone`) and the `resume` stage (`onResume` calls `onAdvance(moduleId)` and dispatches `resumeClicked`).

**BreakScreen** (`sheets/w83-95.png`, `full/t94.png`) is a `#191919` full screen.
- **Left column:** a bordered box with "Remaining Break Time:" and a large `formatClock` countdown from 10:00, with a yellow "Resume Testing" pill under it.
- **Right column:**
  - "Practice Test Break"
  - "You can resume this practice test as soon as you're ready to move on. On test day, you'll wait until the clock counts down. Read below to see how breaks work on test day."
  - a rule
  - "Take a Break: Do Not Close Your Device"
  - "After the break, a **Resume Testing Now** button will appear and you'll start the next section."
  - "**Follow these rules during the break:**"
  - a numbered list:
    1. Do not disturb students who are still testing.
    2. Do not exit the app or close your laptop.
    3. Do not access phones, smartwatches, textbooks, notes, or the internet.
    4. Do not eat or drink near any testing device.
    5. Do not speak in the testing room; outside the room, do not discuss the exam with anyone.
- **Bottom left:** the student's name.

**ResumeScreen** (`scenes/s021.png`) is the same dark screen with "Resume Testing Now", then "Your testing timer has not started counting down yet.", then a yellow "Resume Testing" pill, and the name at the bottom left.

- [ ] **Step 1: Write the failing tests.** `BreakScreen` contains "Remaining Break Time:", "10:00", all five rules word for word, and "Resume Testing". `ResumeScreen` contains both lines.
- [ ] **Step 2: Run them to make sure they fail.** Expected: FAIL.
- [ ] **Step 3: Build them and wire them into the session.**
- [ ] **Step 4: Run the tests to make sure they pass.** Expected: PASS.
- [ ] **Step 5: Commit** with "Bluebook break and resume screens".

### Task 16: Full-test browser check and the final review

**Files:**
- Modify: `Saagii21/flowersos/tools/portal-e2e/bluebook.mjs`, adding a `preview` mode

**What it checks** (`node bluebook.mjs preview`):
- On `/dev/bluebook?test=full`, it walks R&W 1, Check Your Work, This Module Is Over, R&W 2, the break, Resume Testing, Resume Testing Now, Math 1, Math 2, Stand By and the results.
- **Labels:** "Section 1, Module 1: Reading and Writing" and "Section 2, Module 1: Math".
- **The break:** the countdown starts at 10:00, and the timer is not counting.
- **Highlights:** one created on R&W 1 is still there after going to question 2 and back.
- **Cross-outs:** one persists after a reload.
- **Line Reader:** toggles.
- **Phone:** `noSideways` holds on the R&W split, stacked.
- This mode writes nothing to the database.

- [ ] **Step 1: Write and run it.** Run `E2E_CDP_PORT=9342 E2E_BASE=http://localhost:8098 node bluebook.mjs preview`. Expected: every line passes.
- [ ] **Step 2: Re-run the Math check from Task 10 once.** Phase 2 touched the session, so check the Math path again.
- [ ] **Step 3: Final review.** Run superpowers:requesting-code-review on the whole branch, fix what it confirms, re-run Step 1, then hand over to Saagii with screenshots. Pushing is his call.
