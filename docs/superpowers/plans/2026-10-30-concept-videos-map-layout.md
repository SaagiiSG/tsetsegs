# Concept Videos Map Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/student/videos` in the center student portal into a topic list on the left and the chosen topic's map in the remaining space, with hairline figures switching sides along the path.

**Architecture:** `VideoRoadmap` keeps the data, the URL state, the search and the video dialog. It composes:
- a new `TopicList`, the cards;
- a new `TopicMap`, one topic's title, path, figures and chest.

Where figures go is a pure function (`figureSlots`), and which figures a topic gets is another (`topicFigures`). Project 2 later fills `topicFigures` without touching the layout. Positioning is CSS only:
- each figure is absolutely placed in the row of the node it starts beside;
- its width comes from container-query units, so nothing is measured in JS.

**Tech Stack:** React 18, TypeScript, Tailwind, react-router-dom `useSearchParams`, framer-motion (already installed), vitest with `renderToStaticMarkup`, and the vendored hairline kernel in `src/portal/hairline/`.

**Spec:** `docs/superpowers/specs/2026-10-30-concept-videos-map-layout-design.md`

## Global Constraints

- **Work in** worktree `~/Developer/tsetsegs-hairline`, branch `feat/hairline-map`. Don't push or merge to main; Saagii looks first.
- **Lovable's build:** no `Array.prototype.at`. Tests read files with JSON imports, never Node `fs`.
- **UI:** shadcn components (`Button`, `Input` and so on); no hand-rolled controls.
- **Copy:**
  - plain sixth-grade language;
  - no emoji;
  - every count comes from the data.
- **Hairline appears on this page only.** A topic's figures use its area colour through `.sky-hairline` and `--unit-*`.
- **Path nodes stay `button[aria-label]`,** with labels ending in ` — watched`, ` — locked` or ` — start`.
- **Reduced motion:** no slide and no figure tour. `HairlineFigure` already skips the tour.
- **Don't restyle cards or buttons** beyond what the spec names.
- **Test accounts:** any browser check that writes data uses 99000005 or 99000006.
- **Must pass:**
  - `npx vitest run` (all of it);
  - `npx tsc --noEmit -p tsconfig.app.json`, where the only allowed error is `LandingShaderBackground.tsx` `shaders/react`.

## Review Focus

1. **A one-video topic** (Radians, Probability) still shows two figures, in rows of their own below the chest, and nothing overlaps.
2. **`?topic=` errors:** a bad value (`?topic=99`, `?topic=abc`) or a topic the data doesn't have falls back to the up-next topic on a laptop, and to the list on a phone. It never shows a blank page.
3. **Narrowest laptop (1024px):** the figures shrink, and no figure covers a node or caption. On a phone they're about 130px.
4. **Switching topics fast:** the old map's figures are destroyed. `HairlineFigure`'s cleanup runs, so frame loops and tours don't pile up.
5. **Searching while a topic is chosen:** both columns give way to the flat results. Clearing the search brings back the same chosen topic.

---

### Task 1: Figure slots and the figure list

**Files:**
- Create: `src/portal/topicFigures.ts`
- Test: `src/portal/topicFigures.test.ts`

**Interfaces:**
- Consumes:
  - `HairlineSpec` from `src/portal/HairlineFigure.tsx`;
  - `Area` from `src/portal/videoTopics.ts`;
  - the figure modules `src/portal/hairline/{parabola,balance,unitcircle,scatter}.js`.
- Produces:
  - `export type FigureSlot = { side: 'left' | 'right'; anchor: number | 'end' }`
  - `export function figureSlots(videos: number): FigureSlot[]`
  - `export function topicFigures(n: number | null, area: Area | null): HairlineSpec[]`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { figureSlots, topicFigures } from './topicFigures';

const s = (side: 'left' | 'right', anchor: number | 'end') => ({ side, anchor });
describe('figureSlots', () => {
  it('one figure per bend, alternating from the left', () => {
    expect(figureSlots(10)).toEqual([s('left', 1), s('right', 5), s('left', 9)]);
    expect(figureSlots(17)).toEqual([s('left', 1), s('right', 5), s('left', 9), s('right', 13)]);
    expect(figureSlots(6)).toEqual([s('left', 1), s('right', 5)]);
  });
  it('at least two; a missing bend becomes its own row after the chest', () => {
    expect(figureSlots(4)).toEqual([s('left', 1), s('right', 'end')]);
    expect(figureSlots(2)).toEqual([s('left', 1), s('right', 'end')]);
    expect(figureSlots(1)).toEqual([s('left', 'end'), s('right', 'end')]);
  });
});
describe('topicFigures', () => {
  it("puts the area's own figure first", () => {
    expect(topicFigures(1, 'Advanced Math')[0].name).toBe('parabola');
    expect(topicFigures(3, 'Algebra')[0].name).toBe('balance');
    expect(topicFigures(17, 'Geometry & Trig')[0].name).toBe('unitcircle');
    expect(topicFigures(8, 'Problem Solving & Data')[0].name).toBe('scatter');
  });
  it('gives four different figures for an area, and none for More videos', () => {
    expect(new Set(topicFigures(1, 'Advanced Math').map(f => f.name)).size).toBe(4);
    expect(topicFigures(null, null)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests and check they fail**

Run: `npx vitest run src/portal/topicFigures.test.ts`
Expected: FAIL, because `./topicFigures` can't be resolved.

- [ ] **Step 3: Implement `figureSlots` and `topicFigures` in `src/portal/topicFigures.ts`**

- **Count:** `max(2, ceil((videos - 1) / 4))`.
- **Slot `k`:**
  - side `k % 2 ? 'right' : 'left'`;
  - anchor `4k + 1` when `4k + 1 < videos`, else `'end'`.
- **`topicFigures`** returns this per-area order (the area's own figure first). Leave a one-line comment that project 2 replaces it with per-topic lists:
  - Advanced Math: `[parabola, balance, unitcircle, scatter]`
  - Algebra: `[balance, scatter, parabola, unitcircle]`
  - Geometry & Trig: `[unitcircle, parabola, scatter, balance]`
  - Problem Solving & Data: `[scatter, unitcircle, balance, parabola]`
  - `null`: `[]`

- [ ] **Step 4: Run the tests and check they pass**

Run: `npx vitest run src/portal/topicFigures.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/portal/topicFigures.ts src/portal/topicFigures.test.ts
git commit -m "Concept videos: where a topic's figures go, and which figures it gets"
```

---

### Task 2: One topic's map

**Files:**
- Create: `src/portal/TopicMap.tsx`
- Test: `src/portal/TopicMap.test.tsx`
- Modify: `src/index.css`. Add a `.sky-clouds-band.is-top` rule beside `.sky-clouds-band`: the same band mirrored (`top: 0; bottom: auto; transform: scaleY(-1); opacity: .45`).

**Interfaces:**
- Consumes:
  - `figureSlots` and `topicFigures` from Task 1;
  - `HairlineFigure` and the padlock from `src/portal/hairline/padlock.js`;
  - `Chest` from `src/portal/topicArt.tsx`;
  - `AREA_COLOR`, `TopicUnit` and `Area` from `videoTopics.ts`;
  - `CARD_WAVES` from `SkyDepth.tsx`;
  - the cloud art `src/assets/sky/05-clouds-far.svg` and `06-clouds-mid.svg`.
- Produces:
  - `export type Video = { id: string; title: string; description: string | null; module: string | null; domain: string; video_url: string; subtitles_vtt: string | null; labels: string[]; duration_minutes: number | null; order_index: number }`. This is the type now local to `VideoRoadmap.tsx`; move it here.
  - `export const MORE = { light: '#8C96AB', dark: '#B4BCCB' }`, moved from `VideoRoadmap.tsx`.
  - `export function TopicMap({ unit, nextVideoId, onOpen }: { unit: TopicUnit<Video>; nextVideoId: string | null; onOpen: (v: Video) => void }): JSX.Element`

**What it renders:**
- **The root.** Class `sky-unit [container-type:inline-size] relative`, with the same style variables today's `Collapsible` gets: `--unit-light`, `--unit-dark` and `--wave`, from `AREA_COLOR` or `MORE`.
- **The title,** centred: the area label, `Topic N · Name` (or `More videos`), and `W/T watched`.
- **Cloud bands:** `sky-clouds-band is-top` at the top and `sky-clouds-band` at the foot, with the same inline `backgroundImage` as today.
- **One row per video.** Each row is a `relative w-full flex flex-col items-center` with:
  - the node translated by today's `OFFSETS`;
  - today's node button markup, moved unchanged: the Start pill when `video.id === nextVideoId`, the `aria-label`, the done, open and locked looks, and the padlock in locked nodes.
- **Figures at a numbered anchor.** When a slot's anchor equals this row's index, the row also holds `<HairlineFigure figure={figs[k % figs.length]} play className="sky-hairline absolute top-0 z-10 rounded-3xl w-[min(280px,calc(50cqw+3rem-87px))] (left-0|right-0)" />`, wrapped in a `div` with `data-side={slot.side}`.
- **The chest row,** as today.
- **Figures anchored at `'end'`,** in order: each in its own row after the chest. The row is `flex w-full justify-start` or `justify-end`, holding the same figure, not absolute.
- **Bottom padding:** the path gets `pb-[min(240px,45cqw)]` when the last numbered slot's figure could hang below the chest. Simplest: always add it when any slot has a numeric anchor.
- **"More videos"** (`unit.area === null`): no figures at all.

- [ ] **Step 1: Write the failing tests**

Render with `renderToStaticMarkup`. Build a `unit` with `topicUnits` from `videoTopics.ts`, using `v(id, module, order)` rows like those in `VideoRoadmap.test.tsx`. Assert:

```ts
it('a 10-video topic shows 3 area figures, left-right-left, and padlocks on locked videos', () => {
  // done: first video; up next: second
  const html = render(unitOf('Exponents & Radicals', 10, ['e1']), 'e2');
  expect(html.match(/data-side="(left|right)"/g)).toEqual(['data-side="left"', 'data-side="right"', 'data-side="left"']);
  expect(html.match(/data-hairline="parabola"/g)).toHaveLength(1);
  expect(html.match(/data-hairline="padlock"/g)).toHaveLength(8);
  expect(html.match(/>Start</g)).toHaveLength(1);
  expect(html).toContain('Topic 1 · Exponents &amp; Radicals');
  expect(html).toContain('1/10 watched');
});
it('a one-video topic still shows two figures, after the chest', () => {
  const html = render(unitOf('Radians', 1, []), 'r1');
  expect(html.match(/data-side=/g)).toHaveLength(2);
  expect(html.indexOf('data-side="left"')).toBeGreaterThan(html.indexOf('viewBox="0 0 64 56"')); // after the chest
});
it('More videos has no figures', () => {
  expect(render(moreUnit(3), null)).not.toContain('data-side=');
});
it('nodes stay buttons with state labels', () => {
  const html = render(unitOf('Functions', 3, ['f1']), 'f2');
  expect(html).toMatch(/<button[^>]*aria-label="[^"]* — watched"/);
  expect(html).toMatch(/<button[^>]*aria-label="[^"]* — start"/);
  expect(html).toMatch(/<button[^>]*aria-label="[^"]* — locked"/);
});
```

(`render`, `unitOf` and `moreUnit` are small helpers in the test file.)

- [ ] **Step 2: Run the tests and check they fail**

Run: `npx vitest run src/portal/TopicMap.test.tsx`
Expected: FAIL, because `./TopicMap` can't be resolved.

- [ ] **Step 3: Implement `TopicMap` in `src/portal/TopicMap.tsx`, and add the `.is-top` cloud rule to `src/index.css`**

- [ ] **Step 4: Run the tests and check they pass**

Run: `npx vitest run src/portal/TopicMap.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/portal/TopicMap.tsx src/portal/TopicMap.test.tsx src/index.css
git commit -m "Concept videos: a topic's map with figures switching sides along the path"
```

---

### Task 3: The topic list

**Files:**
- Create: `src/portal/TopicList.tsx`
- Test: `src/portal/TopicList.test.tsx`
- Modify: `src/index.css`. Add `.sky-topic-card[data-active="true"]`: `transform: translateX(.5rem)` and `box-shadow: 0 5px 0 var(--unit-shade), 0 0 0 3px #fff, 0 0 0 6px color-mix(in srgb, var(--unit) 45%, transparent)`. Under reduced motion there's no transform transition.

**Interfaces:**
- Consumes:
  - `Video` and `MORE` from Task 2;
  - `TopicUnit` and `AREA_COLOR` from `videoTopics.ts`;
  - `Button` from `@/components/ui/button`.
- Produces:
  - `export const unitKey = (u: { n: number | null }) => String(u.n ?? 'more')`
  - `export function TopicList({ units, selected, onPick }: { units: TopicUnit<Video>[]; selected: string | null; onPick: (key: string) => void }): JSX.Element`

**Each card:**
- a `Button` with `variant="ghost"`, wrapped in a `div.sky-unit` with that unit's colour variables;
- classes `sky-unit-banner sky-topic-card h-auto w-full justify-start whitespace-normal rounded-2xl px-4 py-3 text-left`;
- attributes `data-topic={unitKey(u)}`, `data-active`, and `aria-current={selected === key ? 'true' : undefined}`;
- the same three inline spans as today's banner (area label, `Topic N · Name`, `W/T watched`), with no `div` or `p` inside the button.

- [ ] **Step 1: Write the failing tests:**
  - every unit renders as a card, in order, with `Topic N · Name` and `W/T watched`;
  - exactly one card has `aria-current="true"` and `data-active="true"`, the one whose key is `selected`;
  - `selected={null}` marks none;
  - each card's wrapper style holds the unit's `AREA_COLOR` light hex;
  - no emoji.

- [ ] **Step 2: Run the tests and check they fail**

Run: `npx vitest run src/portal/TopicList.test.tsx`
Expected: FAIL, because `./TopicList` can't be resolved.

- [ ] **Step 3: Implement `TopicList` in `src/portal/TopicList.tsx`, and add the active-card rule to `src/index.css`**

- [ ] **Step 4: Run the tests and check they pass**

Run: `npx vitest run src/portal/TopicList.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/portal/TopicList.tsx src/portal/TopicList.test.tsx src/index.css
git commit -m "Concept videos: the topic list"
```

---

### Task 4: The page: two columns, URL state, phone flow, search without pills

**Files:**
- Modify: `src/portal/VideoRoadmap.tsx`. Replace the `Collapsible` units with `TopicList` and `TopicMap`; keep the header, progress bar, search results grid and video dialog.
- Modify: `src/portal/VideoRoadmap.test.tsx`. Rewrite the collapsible tests, and wrap renders in `MemoryRouter` from `react-router-dom`.

**Interfaces:**
- Consumes: `TopicList` and `unitKey` (Task 3); `TopicMap`, `Video` and `MORE` (Task 2); `topicUnits` and `upNext` from `videoTopics.ts`.
- Produces: `VideoRoadmap`, with the props unchanged: `{ videos: UseQueryResult<any[]>; me: MeLite }`.

**Behaviour:**

- **Search.** `<VideoLabelFilter labels={[]} active={null} onActive={() => {}} … />`.
  - An empty `labels` already hides the pills, so the shared component and the admin page don't change.
  - Delete the `label` state, and call `filterVideos(list, query, null)`.
  - While `query.trim()` is set, render today's flat results grid instead of the two columns.
- **The chosen topic.**
  - `const [params, setParams] = useSearchParams()`.
  - `picked` is `params.get('topic')`, but only when some unit's `unitKey` equals it.
  - `selected` is `picked ?? (next ? unitKey(units[next.unitIndex]) : units[0] && unitKey(units[0]))`.
- **Picking a card.**
  - On a laptop, when `window.matchMedia('(min-width: 1024px)').matches`, call `setParams({ topic: key }, { replace: true })`.
  - Otherwise call `setParams({ topic: key })`, which pushes, so the phone's back button closes the map.
- **Layout.** Use `lg:grid lg:grid-cols-[minmax(17rem,20rem)_1fr] lg:gap-7 lg:items-start`.
  - The list column is `lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto`, plus `max-lg:hidden` when `picked`.
  - The map column is `max-lg:hidden` when `!picked`.
  - The map column centres the map with `mx-auto w-full max-w-3xl`.
- **The back link.** In the map column add `<Button variant="ghost" className="lg:hidden" onClick={back}>‹ Topics</Button>`.
  - `back`: if `useLocation().key !== 'default'`, call `navigate(-1)`; otherwise `setParams({}, { replace: true })`.
- **The slide.** Wrap the `TopicMap` in `<AnimatePresence mode="wait"><motion.div key={selected} initial={reduce ? false : { x: 48, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={reduce ? undefined : { opacity: 0 }} transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}>`, with `const reduce = useReducedMotion()`. Follow the pattern in `src/portal/CenterTeacherPortal.tsx`.
- **Unchanged:**
  - `markDone`;
  - the dialog;
  - the loading skeleton, the error with Try again, "No videos yet." and "No videos match.";
  - the watched count line `main p.font-mono`.

- [ ] **Step 1: Rewrite `VideoRoadmap.test.tsx` (failing).** Keep the existing fixture, and render inside `<MemoryRouter initialEntries={[path]}>`. Tests:
  - `'/student/videos'`:
    - the list has cards for Topic 1, 5 and 16, in that order;
    - exactly one `aria-current="true"`, on Topic 1, which holds the Start video `e2`;
    - the map heading is `Topic 1 · Exponents &amp; Radicals`.
  - `'/student/videos?topic=5'`: the active card and the map heading are Topic 5.
  - **Bad values fall back to Topic 1:** `'/student/videos?topic=99'` and `'/student/videos?topic=abc'`.
  - **No pills:** no element with text `All` sits beside the search input. The markup doesn't match `>All</button>`.
  - **The phone flow:** with no `topic` param, the map column's class contains `max-lg:hidden`; with `?topic=5`, the list column's does.
  - **Kept as they are:** "no emoji" and "a failed read says so…".

- [ ] **Step 2: Run the tests and check they fail**

Run: `npx vitest run src/portal/VideoRoadmap.test.tsx`
Expected: FAIL. The old markup has `data-state`, has no `aria-current`, and has no `MemoryRouter` support yet.

- [ ] **Step 3: Implement the behaviour above in `src/portal/VideoRoadmap.tsx`**

- [ ] **Step 4: Run all the tests and the type check**

Run: `npx vitest run && npx tsc --noEmit -p tsconfig.app.json`
Expected: every test passes. The only tsc error is the known `LandingShaderBackground.tsx` one.

- [ ] **Step 5: Commit**

```bash
git add src/portal/VideoRoadmap.tsx src/portal/VideoRoadmap.test.tsx
git commit -m "Concept videos: topic list on the left, the chosen map slides in on the right; no label pills"
```

---

### Task 5: Browser checks for the new layout, and the look

**Files** (outside this repo, in `~/Developer/Saagii21/flowersos/tools/portal-e2e/`):
- Modify `part2.mjs`:
  - `bannersInfo`
  - `bannerChecks`
  - `videosFlow`
  - `visual`: its videos part
  - `hairline`
  - `countTopics`

**Interfaces:**
- Consumes the DOM contract from Tasks 2–4:
  - `[data-topic]` cards, with `data-active` and `aria-current`;
  - the map root `.sky-unit[class*="container-type"]`;
  - figure wrappers `[data-side]`, holding `[data-hairline]`;
  - padlocks `[data-hairline="padlock"]` inside `button[disabled]`;
  - the back link with text `‹ Topics`.

**What to change:**
- **`bannerChecks`:** read the `[data-topic]` cards instead of `.sky-unit` banners. Keep the checks:
  - 24 cards;
  - book order, with 7 and 23 absent;
  - the area colour as the background;
  - text contrast of at least 4.5.
- **`videosFlow`:**
  - **User:** use `S5`, not `S1`, because it marks a video watched.
  - **Laptop:** exactly one active card, and its map holds the Start pill.
  - **Phone:** the list shows and the map doesn't until a card is tapped. After the tap the map shows `‹ Topics`, and the browser back (`history.back()`) returns to the list.
  - **"Pick another topic"** clicks that topic's card, then its first node, then "Mark as watched", and checks it persists after reload.
  - **The Home preview check:** build the node list by clicking each card in order and collecting `button[aria-label]` from the map. Then compute the same 5-node window as today.
- **`visual`:**
  - the screenshot names stay;
  - the caption contrast reads the visible map's `p.text-xs`;
  - "no sideways scroll" still runs on videos, tests and badges.
- **`hairline`:** for every topic card (desktop, light), and for 6 sample topics at 375, 768, 1024 and 1920 (light and dark), check that:
  - the figure count is `max(2, ceil((videos − 1) / 4))`;
  - the `data-side` order is `left`, `right`, `left` …;
  - every figure's `getBoundingClientRect()` is at most 281px wide;
  - no figure rectangle intersects any node button, caption `p`, Start pill or chest `svg`;
  - "More videos", if present, has no `[data-side]`.
  - Keep the padlock checks (centred within 2px; unlit at rest, lit on hover) and the "moves on its own" check.
- **`countTopics`:** read the cards' `W/T watched`.
- **New in `videosFlow`, desktop:**
  - **Fast switching:** click 5 different cards within 1 second. Then the number of `[data-hairline] svg` equals the visible figure count plus the padlocks, so nothing is left over from earlier maps.
  - **Search:** with Topic 5 chosen, type `law` in the search box, and the results grid replaces both columns. Clear it, and Topic 5 is still the active card with its map showing.

- [ ] **Step 1: Start the servers**

Run, in the background:
- Vite: `npx vite --port 8096 --strictPort` from `~/Developer/tsetsegs-hairline`;
- Chrome: `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --no-first-run --disk-cache-size=1 --user-data-dir="$(mktemp -d)" --remote-debugging-port=9340 about:blank`.

Expected: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8096/` prints `200`.

- [ ] **Step 2: Update `part2.mjs` as above**

- [ ] **Step 3: Run the checks**

Run: `E2E_CDP_PORT=9340 E2E_BASE=http://localhost:8096 E2E_REPO=$HOME/Developer/tsetsegs-hairline node part2.mjs videos visual hairline rail peek`
Expected: the last line is `N true, 0 FALSE`.

- [ ] **Step 4: Look at the screenshots yourself**

From `portal-shots/`, check:
- desktop light and dark videos;
- the phone list and the phone map;
- a one-video topic (Radians);
- the longest topic (Expressions, 17 videos).

Fix anything that covers a node or looks cut off, and rerun Step 3.

- [ ] **Step 5: Commit the app-side fixes, if any**

Run `git add` with the exact files, then `git commit`, on `feat/hairline-map`. `part2.mjs` is not in a git repo; just save it.
