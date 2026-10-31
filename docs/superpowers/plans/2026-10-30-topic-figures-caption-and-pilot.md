# Topic Figures: Caption and Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show each map figure's read-out as a short caption, and build the three pilot figures for Saagii's style approval.

**Architecture:**
- `HairlineFigure` gets an opt-in `caption`. Its `read` object turns the engine's per-frame writes into a React state change only when the text changes, with "rest" shown as blank.
- `TopicMap` turns the caption on for area figures; padlocks stay without.
- The pilot figures are built by three parallel helpers with the hairline-create skill, outside the repo. They're converted to modules but **not wired**: Saagii approves them first.

**Tech Stack:** React 18, TypeScript, Tailwind, vitest with `renderToStaticMarkup`, the hairline-create skill (`~/.claude/skills/hairline-create`), and the vendored kernel in `src/portal/hairline/`.

**Spec:** `docs/superpowers/specs/2026-10-30-topic-hairline-figures-design.md`

## Global Constraints

- **Worktree:** `~/Developer/tsetsegs-figures`, branch `feat/topic-figures`, stacked on `feat/hairline-map`. No pushes and no merges.
- **Lovable's build:** no `Array.prototype.at`. Tests use no Node `fs`.
- **Copy:** plain language, no emoji. The caption uses the muted foreground colour at 11px.
- **Figures:** they set no colour. The caption is `aria-hidden`, and the figure stays decorative.
- **Must pass:**
  - `npx vitest run`;
  - `npx tsc --noEmit -p tsconfig.app.json`, where the only allowed error is `LandingShaderBackground.tsx`;
  - the browser check `hairline` section.

## Review Focus

1. **The engine writes the read-out every frame.** The caption must not re-render every frame; it updates only when the text changes.
2. **The caption must not push the figure** into a node or caption. The `hairline` overlap check now measures figure plus caption.
3. **A long read-out** (for example "y = (x − 2)² + 1") must stay on one line within the figure's width: truncate it, never wrap it.

---

### Task 1: Captions on map figures

**Files:**
- Modify: `src/portal/HairlineFigure.tsx`, `src/portal/TopicMap.tsx`
- Test: `src/portal/HairlineFigure.test.tsx` (new), `src/portal/TopicMap.test.tsx`
- Modify (outside the repo): `~/Developer/Saagii21/flowersos/tools/portal-e2e/part2.mjs`, the `hairline` section

**Interfaces:**
- Produces:
  - `export const captionText = (v: string | null | undefined): string`. It returns `''` for `null`, `undefined`, `''` and `'rest'`, and `v` otherwise.
  - `HairlineFigure({ figure, play?, caption?, className })`. With `caption`, it returns `<div data-caption-figure className="flex flex-col items-center">` holding the stage (`className` applied to the stage) and `<p aria-hidden data-caption className="mt-1 h-4 max-w-full truncate text-center text-[11px] leading-4 text-muted-foreground">`. Without `caption`, it renders the stage only, as now.

- [ ] **Step 1: Write the failing tests**
  - `captionText`:
    - `captionText('rest') === ''`;
    - `captionText(null) === ''`;
    - `captionText('x ≥ 3') === 'x ≥ 3'`.
  - `HairlineFigure` (static render):
    - with `caption`, the markup has one `data-caption` element, empty;
    - without it, none.
  - `TopicMap`, for a 10-video topic: the markup has 3 `data-caption` elements (one per area figure) and none inside the padlock buttons.
- [ ] **Step 2: Run `npx vitest run src/portal/HairlineFigure.test.tsx src/portal/TopicMap.test.tsx`.** Expected: FAIL. `captionText` isn't exported, and there are no `data-caption` elements yet.
- [ ] **Step 3: Implement.** The `read` object keeps the last text in a ref and calls `setCaption(captionText(v))` only when `v` changes. `TopicMap`'s `Figure` passes `caption`.
- [ ] **Step 4: Run the same command.** Expected: PASS. Then run `npx vitest run && npx tsc --noEmit -p tsconfig.app.json`; expect everything green apart from the known tsc error.
- [ ] **Step 5: Browser check.** In `part2.mjs` `hairline`, on desktop light for Topic 1, check that within 5s of the map showing, the first figure's `[data-caption]` text becomes non-empty and isn't "rest". The overlap check needs no change, because `figureReport` measures each `[data-side]` wrapper's first child, which is now the figure-plus-caption box. Start Vite on 8096 and Chrome on 9340, then run `E2E_CDP_PORT=9340 E2E_BASE=http://localhost:8096 E2E_REPO=$HOME/Developer/tsetsegs-figures node part2.mjs hairline`. Expected: `N true, 0 FALSE`.
- [ ] **Step 6: Commit** `src/portal/HairlineFigure.tsx`, `src/portal/HairlineFigure.test.tsx`, `src/portal/TopicMap.tsx` and `src/portal/TopicMap.test.tsx`, with the message "Map figures show their read-out as a short caption".

### Task 2: The pilot: three figures for Saagii's approval

**Files:**
- Create (outside the repo), in `~/Developer/Saagii21/flowersos/tools/hairline-figures/pilot/`:
  - `cubes.js`, `beams.js` and `jar.js`;
  - their `hairline-<name>.html` pages;
  - their `-look.png` sheets.
- Create (repo, not wired): `src/portal/hairline/cubes.js`, `beams.js` and `jar.js`. Convert them like the first four: `import { HL } from './kernel.js';` at the top, and `export default {…}` instead of the final `hairline({…})`.

**The three concepts** (from the spec):
- **Topic 1, Cube growth.** Unit cubes snap together: 1, then 2, then 4 (2×2), then 8 (a 2×2×2 cube). The pointer's height sets the power. Reads "2³ = 8".
- **Topic 13, Crossing beams.** Two light beams lying on a floor plate. The pointer aims one, and their crossing point lights. Reads "(2, 3)".
- **Topic 24, Marble jar.** A jar of marbles. The pointer draws one, and its kind is bright. Reads "3 of 10".

- [ ] **Step 1: Dispatch three helpers in parallel,** one per figure. Each follows the hairline-create skill from step 2. The concept is chosen and there is nobody to ask. The figure must read at 130px, and the read-out wording is as above. Each runs `look.mjs` until it exits 0, answers the `look.md` questions, and reports:
  - its files;
  - the rules it leans on;
  - its tour;
  - sample read-outs;
  - anything unverified;
  - an honest note on how it reads at 130px.
- [ ] **Step 2: Read the three look sheets yourself.** Send back anything that fails the spec's anti-goals (an icon, needs words, busy) for one fix round.
- [ ] **Step 3: Convert the three into `src/portal/hairline/` modules** as above. Load each with `node --input-type=module -e "import('./src/portal/hairline/<name>.js').then(m => console.log(m.default.name))"`. Commit with the message "Pilot hairline figures (not wired yet)".
- [ ] **Step 4: Stop. Show Saagii the three sheets** and the per-figure cost, taken from the helpers' usage. Nothing else is built until he approves the look.
