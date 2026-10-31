# Hairline figures for every topic on the concept videos map

Project 2 of 3, agreed with Saagii on 30 Oct 2026:

1. **Page layout:** built on `feat/hairline-map`.
2. **This document:** the figures.
3. **Unit tests:** later.

## Why

Each topic's map shows hairline line figures that switch sides along the path. Saagii set the count: at least two per topic. Today every topic in an area repeats the same four figures. Saagii asked for figures that relate to each topic: "generate some relating to the topics", "create more hairline elements for each topic".

## Goals

**1. One figure per slot.**
- A topic gets `max(2, ceil((videos − 1) / 4))` slots. With the live video counts (30 Oct) that makes **52 slots**: 3 for Topic 1, 4 for Topic 2, 3 for Topic 16, and 2 for each of the other 21 topics.
- No figure appears in two topics.

**2. Each figure is about its topic.** A student should glance at it and think of the topic's maths. The figure's object, and what the pointer does to it, carry the idea. The numbers go only in the read-out, never inside the drawing (hairline rule 10).

**3. Four existing figures move to the topic they fit best.** That leaves **48 new figures**. My calls:
- `parabola` goes to Topic 16, Quadratic Functions.
  - **Fix the cut-off Saagii saw:** the vertex's range shrinks until both arms always stay on the plate.
- `balance` goes to Topic 3, Manipulating & Solving Equations.
- `unitcircle` goes to Topic 21, Trigonometry.
- `scatter` goes to Topic 25, Statistics I.

**4. Every figure meets the hairline-create skill's bar** (`~/.claude/skills/hairline-create`):
- the ten rules;
- `look.mjs` exits 0;
- the look questions are answered.

**5. Small sizes.** On a phone the figures are about 130px wide; on a laptop, up to 280px. A figure must read at 130px: few parts, big gestures, and a rest pose that already says the idea.

**6. Colour comes from the map.**
- Figures use only the kernel's classes.
- The map paints them in the topic's colour family through `--hairline-*` (`.sky-hairline`).
- No figure sets a colour.

## Non-goals

- Changing the page layout. That was project 1.
- Unit tests. That's project 3.
- Using hairline anywhere outside this map.
- Dark-mode tuning beyond what `.sky-hairline` already does.

## Anti-goals: it fails even if every check passes when

- **A figure is an icon,** such as a literal "%" or "π", or a diagram of boxes and arrows.
- **It needs words to be understood.**
- **It looks busy or cheap next to the calm sky.** Saagii's taste is quiet and minimal.
- **Two topics end up with the same figure.**
- **A figure covers a node or caption.** The layout's `hairline` browser check must keep passing.

## The process

**1. Pilot.**
- Build three figures first, from three different areas (Topic 1 "Cube growth", Topic 13 "Crossing beams", Topic 24 "Marble jar").
- Show Saagii the look sheets, and measure what one figure costs to build.
- He approves the style, or redirects it, before the rest.

**2. Batches by area, in this order:**

| Area | New figures |
|---|---|
| Advanced Math | 17 |
| Algebra | 9 |
| Geometry & Trig | 11 |
| Problem Solving & Data | 11 |

- Each batch ends with one sheet showing all of the area's figures for Saagii.
- Nothing goes into the app until he approves that area's sheet.

**3. Wiring.**
- Approved figures become modules in `src/portal/hairline/<name>.js`, converted the same way as the first four: `import { HL }` at the top, and `export default {…}` instead of `hairline({...})`.
- `topicFigures(n, area)` returns each topic's own list in slot order.
- The `hairline` browser check reruns.

## The concepts

Each line gives the object, what the pointer does to it, and what the read-out says. These are proposals, and Saagii can change any of them before it's built.

### Advanced Math (violet)

**Topic 1, Exponents & Radicals (3)**
1. **Cube growth.** Unit cubes snap together: 1, then 2, then 4 (2×2), then 8 (a 2×2×2 cube). The pointer's height sets the power. Reads "2³ = 8".
2. **Square of pegs.** A peg board where the pointer drags one corner of an n × n square of raised pegs; its side is the root. Reads "√49 = 7".
3. **Folding strip.** A paper strip folds in half again and again. The pointer sets the number of folds, and the visible part shrinks. Reads "2⁻³ = 1/8".

**Topic 2, Expressions (4)**
1. **Area tray.** A rectangular tray with a sliding divider shows a(b + c) as two parts. The pointer slides the divider. Reads "3(4 + 2) = 12 + 6".
2. **Like-term bins.** A tray with two bins and mixed x-tiles and unit-tiles. The pointer hovers a bin, and its tiles gather in it. Reads "3x + 2".
3. **FOIL grid.** A 2 × 2 grid plate for (x + a)(x + b), with four cells. The pointer stretches a and b. Reads "(x + 2)(x + 3)".
4. **Factor rows.** A slab of 12 studs regroups into rows. The pointer picks the row count. Reads "12 = 3 × 4".

**Topic 5, Functions (2)**
1. **Function machine.** A hopper with an input chute and an output column. The pointer picks the input, and the output column rises. Reads "f(3) = 7".
2. **Vending machine.** A grid of buttons and a tray. The pointer presses a button, and exactly one item drops. Reads "B3 → 7".

**Topic 9, Exponential vs. Linear Growth (2)**
1. **Two stacks.** Two stacks side by side, one growing by a block each step and one doubling. The pointer scrubs time. Reads "t 4: 9 vs 16".
2. **Splitting cells.** A dish of cells, each splitting in two. The pointer scrubs time, and the dish fills. Reads "×2 each step · 32".

**Topic 12, Quadratic Equations (2)**
1. **Completing the square.** A square of tiles with one corner missing. The pointer slides in the corner piece, and the square closes. Reads "(x + 3)² = 16".
2. **Thrown ball.** A ball's arc over a low wall. The pointer sets the launch, and the ball lands where the arc meets the ground. Reads "lands at 4".

**Topic 15, Function Transformations (2)**
1. **Shift plate.** A curve-shaped bar on a grid plate with a faint copy of where it started. The pointer drags the bar. Reads "f(x − 2) + 1".
2. **Mirror.** A shape on a plate beside a standing mirror line. The pointer flips it across. Reads "−f(x)".

**Topic 16, Quadratic Functions (3)**
1. `parabola` (existing, with its range fixed).
2. **Fountain.** A nozzle's water arc. The pointer sets the peak. Reads "max 9 at 3".
3. **Half-pipe.** A skate ramp with a ball that rolls to its lowest point. The pointer pushes the ball, and it settles at the bottom. Reads "lowest at x 2".

### Algebra (blue)

**Topic 3, Manipulating & Solving Equations (2)**
1. `balance` (existing).
2. **Nested crates.** Crates nested inside each other, with x at the core. The pointer opens one layer at a time. Reads "step 2 of 3".

**Topic 4, Other Types of Equation Questions (2)**
1. **V-rail.** An absolute-value V on a plate, with a level bar sliding up and down. Where it crosses the V gives two answers. Reads "x = 4 or −2".
2. **Sliding rulers.** Two rulers side by side. The pointer slides one, and their marks line up once, everywhere or never. Reads "one", "always" or "never".

**Topic 6, Lines & Linear Relationships (2)**
1. **Ramp.** A plank on a grid plate. The pointer sets rise over run. Reads "slope 3/4".
2. **Staircase.** A flight of equal steps. The pointer sets each step's rise, and the whole flight steepens. Reads "+2 per step".

**Topic 13, Systems of Equations (2)**
1. **Crossing beams.** Two light beams lying on a floor plate. The pointer aims one, and their crossing point lights. Reads "(2, 3)".
2. **Two lifts.** Two lifts climbing at different speeds. The pointer scrubs time, and they're level at one moment. Reads "level at floor 6".

**Topic 14, Inequalities (2)**
1. **Number rail.** A rail with a bead and a raised half of the rail. The pointer sets the boundary, and the bead is open or closed. Reads "x ≥ 3".
2. **Fenced field.** A plate field crossed by a sloping fence, with the posts on one side raised. The pointer tilts the fence. Reads "y < 2x + 1".

### Geometry & Trig (pink)

**Topic 17, Angles (2)**
1. **Folding fan.** A fan that opens. The pointer sets the angle. Reads "60°".
2. **Scissors.** A pair of scissors opening. The pointer opens them, and the opposite angles match. Reads "70° · 110°".

**Topic 18, Triangles (2)**
1. **Roof truss.** A triangular truss. The pointer drags the apex, and the three angles always add up. Reads "50 + 60 + 70".
2. **Similar tents.** A small tent and a large one. The pointer sets the scale. Reads "× 1.5".

**Topic 19, Circles (2)**
1. **Rolling wheel.** A wheel rolling one turn along a track. The pointer rolls it. Reads "one turn = 2πr".
2. **Sector plate.** A round plate with a slice lifted out. The pointer sets the slice's angle. Reads "arc 1/6".

**Topic 20, Radians (2)**
1. **Radius string.** A string one radius long wrapping around a wheel's rim. The pointer wraps it on. Reads "1.5 rad".
2. **Turning dial.** A dial with one hand. The pointer turns it, stepping at π/6. Reads "π/3".

**Topic 21, Trigonometry (2)**
1. `unitcircle` (existing).
2. **Ladder.** A ladder leaning on a wall. The pointer sets the angle, and the height and foot follow. Reads "sin = 0.8".

**Topic 22, Area, Perimeter, & Volume (2)**
1. **Folding box.** A flat net folding up into a box. The pointer sets the fold. Reads "volume 24".
2. **Fence pen.** A pen made from a fixed length of fence. The pointer stretches one side. Reads "area 36".

### Problem Solving & Data (orange)

**Topic 8, Percent (2)**
1. **Hundred tray.** A 10 × 10 tray of tiles. The pointer sets how many stand up. Reads "35%".
2. **Coin stack.** A stack of coins. The pointer takes a percent off the top. Reads "−20%".

**Topic 10, Rates, Conversions, & Ratios (2)**
1. **Gear ratio.** Two meshed gears of different sizes. The pointer turns one, and the other turns by the ratio. Reads "3 : 2".
2. **Measuring cups.** A large cup pouring into small ones. The pointer pours, and the small cups fill. Reads "1 cup = 8 oz".

**Topic 11, Word Problems (2)**
1. **Two trains.** Trains approaching on parallel tracks. The pointer scrubs time until they meet. Reads "meet at t 3".
2. **Filling tank.** A tank with a pipe in and a pipe out. The pointer sets the time, and the level rises. Reads "18 L at 6 min".

**Topic 24, Probability (2)**
1. **Marble jar.** A jar of marbles. The pointer draws one, and its kind is bright. Reads "3 of 10".
2. **Spinner.** A spinner with unequal sectors. The pointer flicks it. Reads "1/4".

**Topic 25, Statistics I (2)**
1. `scatter` (existing).
2. **Token line.** Tokens stacked on a number line, with a balance point under them. The pointer drags a token, and the mean marker moves. Reads "mean 4.2".

**Topic 26, Statistics II (2)**
1. **Sample scoop.** A bin of beads and a scoop. The pointer sets the scoop size, and the margin narrows. Reads "n 30 · ±5%".
2. **Interval bracket.** A target board with a bracket around the estimate. The pointer drags the estimate, and the bracket follows. Reads "48% ± 3".

## Constraints

- **Builds from `main` on Lovable:** no `Array.prototype.at`. Figures are plain JS modules.
- **Hairline appears only on this map.**
- **The engine:** figures use only the vendored kernel (`src/portal/hairline/kernel.js`), unchanged.
- **Performance:** a figure registers in the shared frame loop and sleeps when still. Only figures on screen tour (`HairlineFigure` handles this).
- **The skill's checks:** `~/.claude/skills/hairline-create`'s `look.mjs` needs Node and a browser. It installs `playwright-core` once.

## The builder's calls (Claude's, after the builder check; Saagii can overrule)

- **No near-repeats.** Two concepts may share a shape, but never the same object or the same gesture. Eight were swapped for this reason:
  - Topic 12's U-rail became completing the square.
  - Topic 16's arch bridge became a half-pipe.
  - Topic 5's gear pair became a vending machine.
  - Topic 4's parallel rails became sliding rulers.
  - Topic 6's pivot rail became a staircase.
  - Topic 13's two tracks became two lifts.
  - Topic 17's crossed beams became scissors.
  - Topic 10's odometer track became measuring cups.
- **Gates:**
  - The pilot is a hard stop; nothing else is built before Saagii approves its look.
  - After that, areas may be built back to back.
  - Each area is wired into the app only after Saagii approves its sheet.
- **The branch:** the work stacks on `feat/hairline-map`, as a new branch `feat/topic-figures`.
- **Tests:** `topicFigures.test.ts` is updated when the lists are wired: each topic gets its own figures, in slot order, and none appear in two topics.
- **The parabola fix** is done in place, as part of Topic 16 in the Advanced Math batch, and `look.mjs` reruns on it.
- **More slots than figures:** if a topic gains videos and slots, its figures repeat (`figs[k % length]`). No topic borrows another's.

## Left to the builder

- Each figure's camera, scale, slider number (`range`) and tour stops.
- The exact read-out wording, kept short.
- Whether a concept's first form reads at 130px. If not, simplify it, and say so on the sheet.
