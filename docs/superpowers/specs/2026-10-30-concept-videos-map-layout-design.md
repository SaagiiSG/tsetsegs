# Concept videos page: topic list on the left, map slides in on the right

Project 1 of 3 agreed with Saagii on 30 Oct 2026:

1. **This document:** the page layout.
2. **51 hairline figures:** at least two per topic.
3. **Unit tests:** at the end of each topic.

Projects 2 and 3 get their own documents. This one must leave room for them, but does not build them.

Approved mockup: `.superpowers/brainstorm/51818-1793396815/content/videos-layout-v3.html` in this worktree. It is git-ignored; open it through the brainstorm server, or as a file with its `.js` and `.svg` neighbours.

## Why

The concept videos page (`/student/videos` in the center student portal, `src/portal/VideoRoadmap.tsx`) is one long column of 24 collapsible topic banners. A topic's path opens inside its banner. The page is long, and on a laptop most of the screen is empty sky on either side of a 448px column.

Saagii wants:
- the topics as a list you pick from;
- the chosen topic's map given the room;
- the hairline line figures to live on that map, on both sides of the path.

He said "I like the overall layout" about the mockup and confirmed the details below.

## Goals

**1. Two columns on a laptop (from `lg`, 1024px).**
- Left: every topic as a collapsed card, in book order. Each card shows the area, "Topic N · Name" and "W/T watched", in the unit's colour, the same look as today's banner.
- Clicking a card slides that topic's map into the middle of the remaining space on the right.
- The chosen card is marked: it moves a little to the right, with a ring in the unit's colour.

**2. On a phone and tablet (below `lg`).**
- The cards fill the screen.
- Tapping one slides its map in over the list, with a "‹ Topics" link at the top that goes back.
- The browser's back button also goes back.

**3. Opening the page.**
- The up-next topic (today's `upNext(units)`) is already chosen and its map is showing on a laptop.
- On a phone the page opens on the list.

**4. The map.**
- The topic's title (area label, "Topic N · Name", "W/T watched") sits at the top, centred over the path.
- The path below works exactly as it does today: zig-zag offsets, the Start pill, done, open and locked nodes, the video dialog, "Mark as watched", and the chest at the end.
- Project 3 will replace the chest with the unit test node.

**5. Hairline figures switch sides.**
- At each bend of the path, a figure sits in the empty space beside it, on the side the nodes lean away from.
- The first figure is on the left, beside nodes 1–3, which lean right. The second is on the right, beside nodes 5–7, which lean left. Then left again, and so on.
- Every topic shows at least two figures. A topic shows `max(2, ceil((videos − 1) / 4))` of them.
- In a short topic (one bend), the second figure goes on the right, below the path's lower half. The map grows taller so both fit, rather than squeezing them.
- All of a topic's figures use that topic's area colour family, as today: `.sky-hairline`, plate = the tile's colour.
- Figures follow the pointer, and walk their idle tour only while on screen and never under reduced motion. `HairlineFigure` already does this.

**6. Figure size.** Make them as large as the free side allows, about 280px wide at most, so nothing gets cut off. Saagii's complaint about today's 192px parabola was that it is cut off on the right: its rail runs off its plate. Bigger tiles plus the topic-specific figures from project 2 answer that.

**7. Where the figures come from.**
- Read them through one function: `topicFigures(topicNumber, area) → HairlineSpec[]`.
- Until project 2 lands, it returns the four existing figures, rotated so the topic's area figure comes first (parabola, balance, unitcircle, scatter). That is what the mockup does.
- Project 2 fills in a per-topic list without touching the layout.

**8. Locked videos keep the hairline padlock** (`src/portal/hairline/padlock.js`, already on this branch): shut and grey at rest, lifting and lighting up as the pointer nears.

**9. Clouds on the page.**
- Saagii asked for clouds on the concept videos page. `SkyDepth` already fixes a full sky with a bottom cloud bank behind every portal page.
- This page adds soft cloud bands around the map: a faded band along the top of the map area and one at its foot. Use the same cloud art, `src/assets/sky/05`, `06` and `07`, as in the mockup.
- Clouds never sit behind text they would make hard to read.

**10. Remove the label pills under the search box.**
- Remove the "All", "Advanced Math", "Desmos" chips. The search box stays, and typing in it still shows the flat list of matching videos as today.
- `VideoLabelFilter` is shared with `src/pages/admin/ConceptVideosAdmin.tsx`, so the admin page must keep its chips.
- The small label chips on each video card in the search results stay. Saagii named only the row under the search box.

**11. The slide-in.**
- The map slides in from the right with a fade, about 450ms, on the hairline ease `cubic-bezier(.32,.72,0,1)`.
- Switching topics on a laptop replays it.
- Under reduced motion the map simply swaps.
- `framer-motion` is installed if the builder wants it; CSS transitions are fine too.

## Non-goals

- **Unit tests:** project 3. The chest stays until then.
- **New figures:** project 2. Use the four that exist.
- **Banner text colours:** Saagii's earlier hand-test note wants white text on purple and blue and black on orange and pink. It is not part of this request.
- **The Home page's video preview,** the `/demo` copy of the portal, the admin page and the main site.
- **No change to video data,** progress saving, unlocking rules or the video dialog.

## Anti-goals: it fails even if it works when

- **A figure covers** a node, caption, the Start pill or the chest at any width from 375px to 1920px.
- **Cards or buttons are restyled** beyond what this document names. Saagii rejected a broad "dialled down" restyle on 30 Oct: change only what he names.
- **The page feels busier or harder:** jumpy layout, a loading flash on every topic switch, or the list losing its scroll position when a topic is picked.
- **The sky or clouds are lost.** He called them "on point".

## Constraints

- **Builds from `main` on Lovable.**
  - Lovable's build rejects `Array.prototype.at`.
  - The preview's type check rejects Node `fs` in tests; use JSON imports.
- **UI uses shadcn components** (Button, Input and so on), never hand-rolled controls.
  - The topic cards may stay buttons with today's banner classes.
  - The collapsibles go away.
- **Copy:**
  - plain sixth-grade language;
  - no emoji;
  - no numbers that aren't real (counts come from the data).
- **Hairline appears only on this page.**
- **Theme:** light and dark both work, and the colours follow the existing `--unit-*` and `.sky-hairline` variables.
- **Checks that must keep passing:**
  - **Tests:** the 208 vitest tests, plus `tsc --noEmit -p tsconfig.app.json`. The only allowed error is the known `shaders/react` one.
  - **Browser checks:** `flowersos/tools/portal-e2e/part2.mjs` sections `videos visual rail hairline`. That folder is in Saagii21, outside this repo.
  - **Updating the browser checks:** the `videos` section clicks `.sky-unit` banners and reads `.sky-unit[data-state=open]`, so it must be updated for the new structure. Keep the same checks:
    - book order;
    - banner colour and text contrast of at least 4.5;
    - node states;
    - "Mark as watched" persists;
    - the Home preview matches the Start video;
    - no sideways scroll.
  - Path nodes stay `button[aria-label]`; the checks rely on it.
  - **The `hairline` section exists** (added 30 Oct) in `flowersos/tools/portal-e2e/part2.mjs`. Today it opens collapsibles, so rewrite it for the new layout. It must prove:
    - **figure count:** a topic shows `max(2, ceil((videos − 1) / 4))` figures;
    - **sides:** they alternate, starting on the left;
    - **no overlaps:** no figure's box overlaps a node, caption, Start pill or chest at 375, 768, 1024, 1280 and 1920px wide;
    - **size:** figures are at most about 280px wide;
    - **"More videos"** has no figures;
    - **padlock:** it is centred in its node, unlit at rest, and lit when the pointer is near;
    - **motion:** figures move on their own on a laptop.
  - **Running the checks from this worktree:** `E2E_CDP_PORT=9340 E2E_BASE=http://localhost:8096 E2E_REPO=~/Developer/tsetsegs-hairline node part2.mjs <sections>`. Start Vite on 8096 and headless Chrome on 9340 first. The defaults stay 8095, 9339 and `tsetsegs-p1` for other sessions.
- **Test accounts:** zz center logins are in `flowersos/handoff-2026-10-30-portal-part2-and-redesign.md` §5. Use 99000005 and 99000006 for anything that writes.

## Decided by Saagii

- The two-column layout and the slide-in. On a phone: list first, the map over it, and a back link.
- No pills under the search box. Clouds on the page.
- Figures alternate left and right along the path, at least two per topic.
- Bigger figures.

## The builder's calls (Claude's, not Saagii's; he can overrule)

- **The breakpoint** is `lg`; tablets use the phone flow.
- **The chosen topic lives in the URL,** for example `?topic=8` (the "More videos" unit could be `?topic=more`). This makes refresh and the phone's back button work.
- **Scrolling:** on a laptop, the list is sticky with its own scroll, and the map scrolls with the page.
- **While searching,** the two columns are replaced by today's flat results grid.
- **The "More videos" unit** (modules outside the 26 topics), if present, is the last card, slate-coloured, with no figures.
- **Figure size rule:**
  - free side = half the map width + the bend's lean − half a caption (about 75px);
  - figure width = that, less a small gap, at most about 280px;
  - on a phone that comes to about 124–136px.

- **Short topics:** the second figure goes below the end node on the right, and the map grows taller to fit it.
- **When `topicFigures` returns too few or too many:** cycle its list if it has fewer figures than the count, and take the first N if it has more.
- **History:** picking a topic on a laptop replaces the URL; it doesn't add a history entry. On a phone, opening a map adds one, so back closes it.
- **Tablets** use the phone flow, as above.
- **Tests:**
  - Rewrite the `VideoRoadmap` unit tests that assume collapsibles.
  - Browser checks that write data use 99000005 or 99000006, never 99000001.
- **Finishing:** the work ends on branch `feat/hairline-map`. Merging and pushing to main wait for Saagii's look at it.

## Left to the builder

- Component structure. A `TopicList` and a `TopicMap` inside `VideoRoadmap` is the obvious split.
- How the slide is animated.
- How the cloud bands are layered.
- How the figure anchors are measured, by layout or by maths.
