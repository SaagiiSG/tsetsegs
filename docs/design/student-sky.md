# FlowersOS Student Design System (from the Home mockup)

**What this is:** the design system for the FlowersOS student side. It is read from one picture,
`home-mockup.png` in this folder, which shows the student Home page (added 18 October 2026). Give
this file to Lovable with any page spec in `specs/`.

**What it replaces:** the SideShift-based `DESIGN.md` from 17 October. That file is saved at
`sideshift-ref/DESIGN-sideshift.md`, next to its screenshots, in case you want anything back.

**Where the numbers come from:**

- Every hex code was read from the pixels of `home-mockup.png` (1505 × 1045 px). When a colour
  fades, both ends are given.
- Sizes were measured in image pixels. Font sizes come from the height of a capital letter (cap
  height). In these fonts a capital is about 0.7 of the font size, so **font size ≈ cap height ÷ 0.7**.
- **Scale.** The mockup is drawn bigger than the real app. Its sidebar is 302 px wide. The live
  sidebar in the code is `w-60`, which is 240 px. 302 ÷ 240 ≈ 1.25, so **CSS size = image size ÷ 1.25**,
  rounded to the nearest Tailwind step. The image size is always shown next to it, so you can
  check the maths.
- Contrast ratios are worked out from the hex codes with the standard WCAG formula.
- Anything a still picture can't show (hover, phone, dark mode, motion) says so.

**The code it maps to:** the mockup is a restyle of the center student portal,
`src/portal/CenterStudentPortal.tsx` in `~/Developer/tsetsegs` (route `/student`). The nav, cards
and text in the mockup are the same as that file. Section 11 lists what changes, piece by piece.

---

## 1. The look

- **Soft sky.** The page is pale sky blue with a lilac-pink glow in the top right corner. No
  photos or patterns.
- **Frosted white cards.** Cards are almost white and a little see-through. Their corners are
  rounded, they have no grey outline, and a soft blue shadow sits under them.
- **Four colour families, one per card:** blue, violet, pink and orange. Each card uses one family
  in three places: a pale icon tile, a gradient pill button, and a faint wash in the card's corner.
- **Numbers are mono, big and black.** Every count, score and date uses a monospace font ("0/71",
  "0%", "2026-10-10"). Words use a clean sans-serif.
- **One strong colour per area.** In the sidebar, only the active item is solid blue. In a card,
  only the button is a strong colour. Everything else stays pale.
- **Calm and grown-up.** No mascots, no 3D and no hard edges. Pastels and glows.

---

## 2. Colours

### 2.1 Page

| Where | Hex | Note |
|---|---|---|
| Page, main colour (the gaps between cards) | `#E7F4FD` | pale sky blue |
| Page, top left near the sidebar | `#F3F8FE` | a little lighter |
| Page, bottom right | `#E1F1FE` | a little deeper |
| Glow, top right corner | `#F4E5FA` → `#EBE9FE` | lilac-pink, fading into the blue |
| Faint streak, top middle | `#D7E9FD` | a soft band of deeper blue |

Build the page as one fixed layer behind everything: the blue base plus one big, soft lilac glow
in the top right. The code already has this layer (`.admin-page-atmosphere` in `src/index.css`).
Only its colours change.

### 2.2 Surfaces

| Surface | Hex | Note |
|---|---|---|
| Sidebar | `#FDFDFD` (top edge `#F8FBFF`) | almost solid white |
| Card, middle | `#F7FBFE` | white, a little see-through over the blue |
| Card, near its edges | `#FBFCFE` | a slightly whiter rim |
| Small white pieces: streak pill, % circle, settings button, ring centre | `#F8FCFF`–`#FBFCFE` | white with a faint shadow ring |
| Sidebar divider | `#F2F2F4` | 1 px, very faint |

Cards have **no grey border**. You see the edge only because the colour changes and there's a
shadow underneath (section 4.2).

### 2.3 Text

| Role | Hex | Contrast on a card (`#F7FBFE`) | Used for |
|---|---|---|---|
| Ink | `#0A0B12` | 18.9 : 1 | headings, card titles, big numbers |
| Ink, soft | `#26272A` | 14.4 : 1 | the "/71" tail of a count |
| Body grey | `#5E616B` | 5.9 : 1 | page subtitle, nav labels, body lines |
| Muted grey | `#7A7E88` | **3.9 : 1, too low** | card subtitles, small labels |
| Label grey | `#5F626D` | 5.8 : 1 | "TODAY'S GOAL" |
| Chip blue | `#235ECA` | 5.1 : 1 on its chip | "Not unlocked yet" |
| Link blue | `#3C7AD0` | 4.1 : 1 | "Continue your roadmap →" |

Section 12 has fixes for the ones that are too low.

### 2.4 The four colour families

| | Blue | Violet | Pink | Orange |
|---|---|---|---|---|
| **Used for** | main actions, Speed goal, "68 Questions", SAT Simulation, Domain mastery | Hard goal, "150 Hard", Concept videos | Medium goal, "Updated set" | streak, class card |
| **Icon tile, top → bottom** | `#CCF0FD` → `#A9D6FF` | `#EDD8FF` → `#BCB6F9` (videos tile: `#EAE3FE` → `#CCC6FE`) | `#FEE9F0` → `#F9C4EE` | `#FBEDDF` → `#FBD9C3` |
| **Icon on the tile** | `#1470E7` | `#5A58E1` | `#D665B9` | `#FA7433` |
| **Button** | top `#74B3FF` → bottom `#4B95FF` | top-left `#A3A0FC` → bottom `#8C94FB` (right end `#AC96FB`) | left `#C6A5FB` → right `#ED9AE8` | none in the mockup |
| **Legend dot** | `#5EBDFD` | `#D28CF5` | `#FBC2E5` | none |
| **Ring colour** | arc `#B8DCFB` on track `#E4F2FD` | `#DDD5FF` | `#FFE6EC` | none |
| **Extra** | chip `#E4EEFD` with text `#235ECA` | none | none | flame `#F77B25`, streak number `#E06D2A` |

The three buttons in the top row step **blue → violet → pink** from left to right. The pink
button starts lilac and ends pink, so the row reads as one smooth sweep. Keep that order.

**Solid blue** is used in only three places, each with a white icon or letter:

| Piece | Top → bottom |
|---|---|
| Active nav pill | `#83B8FE` → `#5B9EFF` (left end `#8DC8FE`, right end `#7ECDF9`) |
| Avatar tile (sidebar) | `#6BB4FF` → `#59A1FF` |
| Domain mastery tile | `#92CFFE` → `#5B9DFF` |

### 2.5 Tracks and lines

| Piece | Hex | Height, image → CSS |
|---|---|---|
| Progress track, set cards | `#DFEBF9` | 21 → 16 px (`h-4`) |
| Progress track, SAT Simulation | `#E5EDF8` | 18 → 14 px (`h-3.5`) |
| Progress track, Concept videos | `#E5EDF8` | 20 → 16 px (`h-4`) |
| Sidebar divider | `#F2F2F4` | 1 px |

The fill of a track isn't shown, because every count in the mockup is 0. Fill it with the card's
button gradient.

### 2.6 What each colour means

- **Blue:** the main thing to do, plus anything about speed or your overall score.
- **Violet:** harder work and learning (Hard questions, concept videos).
- **Pink:** the medium daily set and anything new ("Updated set").
- **Orange:** people and habits (streak, class).
- **Red** isn't in the mockup. Keep it for errors only.

---

## 3. Type

### 3.1 Fonts

The mockup looks like Apple's system fonts: SF Pro for words and SF Mono for numbers (the mono
zero has a line through it). The code already gets these on a Mac and iPhone, because Tailwind's
`font-sans` and `font-mono` use the system fonts. On Windows and Android the same classes show
different fonts, so the page will look a little different there. See question 5 in section 13.

`index.html` also loads Outfit and Nunito from Google Fonts. The mockup uses neither. The center
logo's letter uses Chillax (`font-chillax`).

### 3.2 Sizes

| Role | Example | Cap height (image) | Font size, image → CSS | Tailwind | Weight | Colour |
|---|---|---|---|---|---|---|
| Page title | "Hey testINTStudent 👋" | 31 | 44 → 35 | `text-4xl` `tracking-tight` | bold | ink |
| Page subtitle | "Let's close those rings today." | 15 | 21 → 17 | `text-lg` | regular | body grey |
| Card title, big | "SAT Simulation" | 17 | 24 → 19 | `text-xl` | bold | ink |
| Card title | "Domain mastery", "Concept videos", class name | 16 | 23 → 18 | `text-lg` | bold | ink |
| Set card title | "68 Questions" | 14 | 20 → 16 | `text-base` | semibold | ink |
| Nav label | "Practice" | 14 | 20 → 16 | `text-base` | regular (active: medium) | body grey (active: white) |
| Button label | "Continue" | 14 | 20 → 16 | `text-base` | medium | white |
| Body line | "Solve 440 distinct Math questions…" | 14 | 20 → 16 | `text-base` | regular | body grey |
| Strong body line | "440 more questions to unlock" | not measured | same as body line | `text-base` | semibold | ink |
| Card subtitle | "Core SAT math p…", "Your accuracy by topic" | 12 | 17 → 14 | `text-sm` | regular | muted grey |
| Section label | "TODAY'S GOAL" | 13 | 19 → 15 | `text-sm` uppercase `tracking-wide` | semibold | label grey |
| Small label | "SPEED", "Answered" | 11 | 16 → 13 | `text-xs` (uppercase only in the ring legend) | medium | muted grey |
| Big number | "0" in "0/71" and "0/3" | 34 | 49 → 39 | `text-4xl font-mono` | bold | ink |
| Number tail | "/71" | 19 | 27 → 22 | `text-xl font-mono` | regular | ink, soft |
| Ring centre | "0%" | 29 | 41 → 33 | `text-3xl font-mono` | bold | ink |
| Stat value | "0", "0/1" (class card) | 22 | 31 → 25 | `text-2xl font-mono` | medium | ink |
| Small number | "0/2", "2026-10-10" | 12–13 | 17–19 → 14–15 | `text-sm font-mono` | medium | ink |
| Counter | "0 / 440" | 16, slash included (digits are a little shorter) | at most 23 → 18 | `text-base font-mono` | medium | ink |
| Tiny number | "0%" in the round chip | 10 | 14 → 11 | `text-xs font-mono` | medium | `#797C8B` |
| Streak number | "0" | 15 | 21 → 17 | `text-base font-mono` | semibold | `#E06D2A` |

---

## 4. Shape and depth

### 4.1 Corners

| Piece | Radius, image → CSS | Tailwind |
|---|---|---|
| Cards, sidebar | 18 → 14 | `rounded-2xl` (16) |
| Icon tiles | 20 → 16 | `rounded-2xl` |
| Avatar tile | 19 → 15 | `rounded-2xl` |
| Buttons, nav pill, chips, streak pill, tracks, % circle, settings button | half the height | `rounded-full` |

Today the code uses `rounded-3xl` (24 px) on portal cards. The mockup's corners are smaller.

### 4.2 Shadows and glows

What the picture shows:

- **Under a card**, the page goes from `#E7F4FD` to `#DCEAF7` right at the card's bottom edge. It
  is back to the page colour about 20 image px (16 CSS px) lower. That's a soft, short,
  blue-tinted shadow with no hard line.
- **Under a gradient button** there is a glow in the button's own colour: `#C2E3FF` right under
  the blue button, gone about 10 image px lower.
- **Under the active nav pill** there is the same kind of glow (`#E4F8FF`).
- **Icon tiles** have a faint shadow in their own colour.
- **The ring's white centre** has a soft shadow ring around it (`#E4EAF8` at its edge).

Starting CSS values. These are my translation of the picture, not numbers read from a file, so
tune them by eye against `home-mockup.png`:

```css
--shadow-card: 0 10px 24px -12px hsl(212 60% 45% / 0.22), 0 1px 2px hsl(212 60% 45% / 0.06);
--glow-blue:   0 8px 16px -6px hsl(215 100% 65% / 0.45);
--glow-violet: 0 8px 16px -6px hsl(240 90% 75% / 0.45);
--glow-pink:   0 8px 16px -6px hsl(304 70% 77% / 0.45);
```

### 4.3 Glass

Cards are a little see-through. The card middle (`#F7FBFE`) is slightly bluer than its rim
(`#FBFCFE`), and soft shapes show through faintly: a curved wash at the bottom right of each set
card, and a lilac glow behind "Keep practicing". The code already has a glass card class
(`admin-glass-card admin-glass-liquid admin-glass-neutral`). Keep it, but tune it to this target:
**over the `#E7F4FD` page, the middle of a card should measure about `#F7FBFE`.** It should look
white first and glass second.

---

## 5. Layout (desktop, as in the mockup)

| Piece | Image px | CSS px | Tailwind |
|---|---|---|---|
| Sidebar width | 302 | 242 | `w-60` (240), as today |
| Sidebar gap from the window edge | 20 | 16 | `m-4` (today `m-3`) |
| Sidebar to main content | 51 | 41 | today's `m-3` + `lg:p-8` gives 44; keep it |
| Main content width at this window size | 1107 | 886 | |
| Gap between cards in a row | 15–16 | 12–13 | `gap-3` |
| Gap between rows | 21–23 | 17–18 | `gap-4` |
| Header to the first row | 23 | 18 | `space-y-5` (today) is close |
| Padding inside a card | 22–24 | 18–19 | `p-5` (20) |

**Grid on desktop:**

| Row | What | Widths in the image | Height, image → CSS | Code today |
|---|---|---|---|---|
| 1 | Today's goal + three set cards, four equal columns | 268 / 260 / 261 / 271 | 386 → 309 | `md:col-span-4 lg:col-span-3` + `lg:col-span-9` split in 3. Already matches. |
| 2 | SAT Simulation, full width | 1107 | 197 → 158 | full width. Already matches. |
| 3 | Domain mastery (double) + Concept videos + Class | 526 / 274 / 278 | 226 → 181 | `lg:grid-cols-4` with `lg:col-span-2`. Already matches. |

The grid itself doesn't need to change. Only what's inside each card does.

---

## 6. Components

### 6.1 Sidebar

White (`#FDFDFD`), `rounded-2xl`, soft card shadow, no border. In the image it runs from 20 px to
1014 px down the 1045 px window.

**Top block.** An avatar tile, 53 × 55 image → `h-11 w-11`, `rounded-2xl`, solid blue gradient,
with the center's first letter in white. The code's `CenterLogo` already draws this letter when
the center has no logo. Today it's a 32 px `rounded-md` tile; the mockup makes it bigger and
blue. Next to it, 14 image px away (`gap-3`):
- the center name ("testing22"), semibold, ink
- the student's name ("testINTStudent"), `text-sm`, muted grey

**Nav items.** Same list, order and icons as the code's `NAV`: Home, Practice, Speed mode, Review
mistakes, Analytics, Leaderboard, Concept videos, Badges, Announcements.

| Part | Image | CSS / Tailwind |
|---|---|---|
| Item height | 59 | `h-12` |
| One item every | 70 | 56 → `h-12` items with `space-y-2` |
| Inset from sidebar edge | 14 | `px-3` on the nav (as today) |
| Icon | 22–24, outline | `h-5 w-5` |
| Icon start inside the item | 19 | `px-4` |
| Icon to label | 25 | `gap-5` |
| Label | see 3.2 | `text-base`, body grey; icon the same grey |

**Active item:** a `rounded-full` pill with the solid blue gradient, white icon and label (medium
weight), and a soft blue glow under it. Hover isn't in the mockup. A good guess is a very light
blue wash, about the page colour `#E7F4FD`.

**Bottom.** The nav sits at the top and "Log out" is pinned to the bottom, as today. Above "Log
out" there's a 1 px `#F2F2F4` divider, inset 28 image px (about `mx-5`) from each side. "Log out"
uses the same icon size, text size and grey as a nav item.

### 6.2 Page header

- **Left:** the title "Hey {first name} 👋" and the grey subtitle under it. The mockup has the
  wave emoji. The portal code dropped it; the main student dashboard still has it. Put it back.
- **Right:** the streak pill. It is 188 × 50 image → about 150 × 40 CSS: `h-10 px-4 rounded-full`,
  white (`#FBFCFE`), soft shadow, no border. Inside: the orange flame icon (`#F77B25`, `h-5 w-5`),
  the number in mono orange, then "day streak" in `text-base` body grey. The pill's top lines up
  with the title's top. Tapping it opens the streak sheet, as today.

### 6.3 Card (the base for every box)

- `rounded-2xl`, `p-5`, card colour (2.2), card shadow (4.2), no border.
- **Optional wash:** a big, faint curve in the lower right in the card's family colour. It's very
  light: `#EEF7FE` in the "68 Questions" card, `#F9F6FD`–`#FAF2FA` in "Updated set". It's only
  decoration, and it sits behind the content.
- **Hover and press:** not in the mockup. Today cards lift 2 px on hover
  (`hover:-translate-y-0.5`). Keep that.

### 6.4 Icon tile

| Kind | Where | Size, image → CSS | Fill | Icon |
|---|---|---|---|---|
| Soft | set cards, Concept videos, class card | 62–67 → `h-12 w-12` | family tile gradient (2.4), top to bottom | family icon colour, outline, about `h-7 w-7` |
| Solid | Domain mastery, sidebar avatar | 67 with its glow → `h-12 w-12` (avatar: 53–55 → `h-11 w-11`) | solid blue gradient | white, `h-6 w-6` |
| Small | SAT Simulation lock | 56 → `h-11 w-11` | `#DAEDFC` → `#BDD9FB` | lock in `#176ADC`, `h-6 w-6` |

All tiles are `rounded-2xl` with a faint shadow in their own colour.

Closest lucide icons (all available in the installed `lucide-react`):

| Place | Icon |
|---|---|
| 68 Questions | `Target` |
| 150 Hard | `Mountain` |
| Updated set | `Sparkles` |
| SAT Simulation | `Lock` |
| Domain mastery | `BarChart3` |
| Concept videos | `PlayCircle` |
| Class | `Users` |
| Streak | `Flame` |
| Goal settings | `SlidersHorizontal` |

### 6.5 Gradient pill button

- Height 64–66 image → `h-12`. `rounded-full`.
- White label, `text-base` medium, followed by an `ArrowRight` icon (`h-5 w-5`).
- Fill: the family gradient from 2.4. It's lighter at the top and deeper at the bottom; blue
  measures `#74B3FF` at the top and `#4B95FF` at the bottom.
- A soft, lighter sheen on the upper half, plus a glow in the same colour under it (4.2).
- In set cards it's full width. On the SAT Simulation card it's as wide as its text (about `px-6`).
- **Read section 12.1 first.** White text on these colours is too faint for some readers.

### 6.6 Progress bar with a % circle

- Track: `rounded-full`, `#DFEBF9`, `h-4` (set cards).
- To its right sits a white circle, 47 image → `h-9 w-9`, with a faint shadow ring and the
  percent in tiny mono grey.
- Fill: not shown (everything is 0%). Use the card's button gradient.

### 6.7 Status chip

"Not unlocked yet": 162 × 37 image → about 130 × 30 CSS, so `h-7 px-3 rounded-full`. Background
`#E4EEFD`, text `#235ECA`, `text-sm` semibold. It sits right after the card title.

### 6.8 Text link

"Continue your roadmap →": `#3C7AD0`, `text-base` medium, with an arrow icon in the same colour and
no underline.

---

## 7. The Home page, card by card

### 7.1 Today's goal

- **Top row:** "TODAY'S GOAL" (section label) on the left. On the right, a white round settings
  button, 35 image → `h-7 w-7`, with a `SlidersHorizontal` icon in `#60636B`.
- **Ring:** 215 image → 172 CSS across. Each band is 17–20 image px thick, with about 11 px of
  white between bands. That matches the code's `DailyRing`, where a band is 0.085 of the size.
  The centre is a white disc with a soft shadow ring. Inside it: "0%" (ring centre style) and
  "today" in `text-sm` grey.
- **Ring colours:** outer = Speed (blue), middle = Hard (violet), inner = Medium (pink). Arcs use
  the legend dot colours. Tracks use the same colour, very faint; the code already draws tracks
  at 18% opacity.
- **Legend:** three columns along the bottom. Each has a dot (11–13 image → `h-2.5 w-2.5`), a
  small uppercase label ("SPEED") in muted grey, and under it the mono value ("0/2") in ink.

### 7.2 Practice set cards (68 Questions, 150 Hard, Updated set)

Top to bottom:

1. A soft icon tile, with the title (`text-base` semibold) and blurb (`text-sm` muted, one line)
   to its right.
2. Empty space. The count sits low in the card.
3. The count: big number ("0") plus the tail ("/71").
4. Progress track plus the % circle (6.6).
5. A full-width gradient pill button, "Continue →".

Families, by position: **68 Questions blue, 150 Hard violet, Updated set pink.** The whole card
stays clickable, as today.

### 7.3 SAT Simulation (locked)

- **Left:** the small lock tile, then "SAT Simulation" (big card title) and the "Not unlocked yet"
  chip on the same line.
- Under them: "Solve 440 distinct Math questions to unlock your simulated SAT score." (body
  line), then "440 more questions to unlock" (strong body line).
- **Right**, vertically centred on the text block: the blue "Keep practicing →" button.
- **Bottom:** a full-width track (`h-3.5`), with the counter "0 / 440" in mono at its right.
- **Behind the button:** a soft lilac glow (`#E4E2FA`–`#ECEEFC`) inside the card.

### 7.4 Domain mastery

- The solid blue tile, "Domain mastery" (card title), and "Your accuracy by topic" (card subtitle).
- **Empty state:** "Solve a few problems to see your strengths." (body line), plus a faded bar
  chart in the bottom right. It has five bars rising left to right, each 24–28 image px wide,
  coloured `#C7DBFE`–`#D3E8FB` and fading out toward the bottom.
- **With data:** not shown. Keep today's list of domains with bars, and draw the bars in the blue
  family instead of today's `bg-foreground/70`.

### 7.5 Concept videos

- Violet soft tile with a `PlayCircle` icon. "Concept videos" (card title, wraps to two lines in
  this width) and "Your video roadmap" (card subtitle).
- The count ("0/3"), a `h-4` track, and the blue text link "Continue your roadmap →".

### 7.6 Class card

- Orange soft tile with a `Users` icon. The class name (card title, cut off with "…" if too long)
  and the schedule ("Mon, Wed, Fri", card subtitle).
- **Stats row**, three columns: small label ("Answered", "Accuracy", "Attended") over a mono stat
  value ("0", "–", "0/1").
- **Attendance row:** the date in small mono ink on the left, and the status ("Excused") in
  `text-sm` grey on the right.
- The mockup has **no divider lines** in this card. Today's code puts a `border-t` above the stats
  and above the list.

---

## 8. Other student pages

The mockup only shows Home. For the other pages (Practice, Speed mode, Review mistakes,
Analytics, Leaderboard, Concept videos, Badges, Announcements), reuse the same pieces:

- the same sidebar
- the same header: page title, grey subtitle, and a pill on the right if the page has a key number
- cards from 6.3, one colour family per card, chosen by meaning (2.6)
- mono numbers
- one gradient pill per card for the main action

The flat rank symbols in `rank-art/` already use one colour family each, so they fit this look.

---

## 9. Phone, tablet, dark mode and motion

None of these are in the mockup.

- **Phone and tablet.** Today, below the `md` breakpoint the sidebar hides and a top bar shows the
  center logo and a log-out button. Rules that follow from the mockup:
  - stack the cards in one column, in the same order as desktop
  - keep the sizes from 3.2, except drop the page title to `text-3xl`
  - buttons and nav rows are already 48 px tall, which is a good tap size
- **Dark mode.** Not shown. See question 6 in section 13.
- **Motion.** A still picture can't show it, so keep what the code has: cards lift 2 px on hover,
  pills shrink a little when pressed (`active:scale-95`), and the ring arcs draw in on load
  (`DailyRing`).

---

## 10. Tokens and class recipes

### 10.1 CSS variables

Put these on the portal's root `div` in `CenterStudentPortal.tsx` with a class like
`.student-sky`, so the admin and teacher sides don't change. The HSL values are converted from the
measured hex codes.

```css
.student-sky {
  --background: 205 85% 95%;        /* page        #E7F4FD */
  --card: 206 78% 98%;              /* card        #F7FBFE */
  --foreground: 232 29% 5%;         /* ink         #0A0B12 */
  --card-foreground: 232 29% 5%;
  --muted-foreground: 223 6% 51%;   /* muted grey  #7A7E88 (see 12.2) */
  --primary: 215 100% 65%;          /* blue        #4B95FF */
  --primary-foreground: 0 0% 100%;
  --ring: 215 100% 65%;
  --section-glow: 215 100% 65%;     /* see question 3 */
  --radius: 1rem;
}
```

### 10.2 Class recipes (Tailwind)

```txt
Card            rounded-2xl p-5 bg-card shadow-[var(--shadow-card)]
Soft tile       grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-b from-[#CCF0FD] to-[#A9D6FF]   (icon: h-7 w-7 text-[#1470E7])
Solid tile      grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-b from-[#92CFFE] to-[#5B9DFF] text-white
Blue button     h-12 rounded-full bg-gradient-to-b from-[#74B3FF] to-[#4B95FF] text-white font-medium shadow-[var(--glow-blue)]
Violet button   h-12 rounded-full bg-gradient-to-b from-[#A3A0FC] to-[#8C94FB] text-white font-medium shadow-[var(--glow-violet)]
Pink button     h-12 rounded-full bg-gradient-to-r from-[#C6A5FB] to-[#ED9AE8] text-white font-medium shadow-[var(--glow-pink)]
Nav item        flex h-12 items-center gap-5 rounded-full px-4 text-base text-[#5E616B]
Nav active      bg-gradient-to-b from-[#83B8FE] to-[#5B9EFF] text-white font-medium shadow-[var(--glow-blue)]
Track           h-4 rounded-full bg-[#DFEBF9]
% circle        grid h-9 w-9 place-items-center rounded-full bg-white font-mono text-xs text-[#797C8B] shadow-sm
Status chip     inline-flex h-7 items-center rounded-full bg-[#E4EEFD] px-3 text-sm font-semibold text-[#235ECA]
Streak pill     flex h-10 items-center gap-2 rounded-full bg-white/90 px-4 shadow-[var(--shadow-card)]
```

For violet, pink and orange tiles, swap in the tile colours from 2.4.

---

## 11. What changes in the code

All paths are in `~/Developer/tsetsegs`.

| Mockup piece | Where in the code | Today | Change to |
|---|---|---|---|
| Page colours | `CenterStudentPortal.tsx` root `div` + `.admin-page-atmosphere` | theme colours | sky blue with a lilac glow (2.1) |
| Sidebar | `<aside … admin-glass rounded-2xl border p-3>` | see-through glass, border, `m-3` | near-solid white, no border, `m-4` |
| Sidebar top | `CenterLogo` (`centerContext.tsx`) | 32 px `rounded-md` tile in `bg-primary` | 44 px `rounded-2xl` solid blue tile |
| Nav items | `NavLink` in `CenterStudentPortal.tsx` | `rounded-xl px-3 py-2 text-sm`; the active item is a black pill (`bg-foreground`) | `h-12 rounded-full text-base gap-5`; active = blue gradient pill with glow |
| Greeting | `HomePage` `<h1>` | `text-2xl md:text-3xl`, no emoji | `text-4xl` + 👋; subtitle `text-lg` |
| Streak pill | `HomePage` streak button | `border px-3 py-1.5 admin-glass`, `text-sm` / `text-xs` | `h-10`, no border, orange number, `text-base` label |
| Ring colours | `src/components/student/dashboard/DailyRing.tsx` | Speed yellow `hsl(45, 95%, 55%)`, Hard red `hsl(0, 84%, 60%)`, Medium teal `hsl(180, 85%, 45%)` | Speed blue, Hard violet, Medium pink (2.4). **This file is shared with the main student dashboard**, so pass the colours in as a prop instead of changing them for both. |
| Card base | `glass` string in `CenterStudentPortal.tsx` | `rounded-3xl border p-5` | `rounded-2xl`, no border, card shadow |
| Set cards | `SETS.map` in `HomePage` | blurb above the title, `text-3xl` count, `h-1.5` bar, grey "Continue →" text | tile + title + blurb at top, `text-4xl` bold count, `h-4` track + % circle, gradient pill button |
| SAT Simulation | `CenterSatUnlockIsland.tsx` | `h-4` grey lock icon, outline `Badge`, default `Button`, `h-2` progress bar | lock tile, blue chip, blue gradient button, `h-3.5` track, `text-base` mono counter, lilac glow |
| Domain mastery | `Glass` in `HomePage` | text title only, bars in `bg-foreground/70` | solid blue tile, subtitle, faded chart when empty, blue bars |
| Concept videos | `Glass` button in `HomePage` | `text-xs` label, `text-3xl` count, `RoadmapPreview` under it | violet tile, title + subtitle, `h-4` track, blue link (see question 7) |
| Class card | `Glass` in `HomePage` | "Class" label, `border-t` lines, up to 6 recent classes | orange tile, no lines, recent classes (see question 8) |

---

## 12. Fix these before you ship

### 12.1 White text on the pastel buttons is too faint

| Pair | Contrast |
|---|---|
| White on blue button, bottom `#4B95FF` | 3.0 : 1 |
| White on blue button, top `#74B3FF` | 2.2 : 1 |
| White on violet button `#A3A0FC` | 2.3 : 1 |
| White on violet button, bottom `#8C94FB` | 2.7 : 1 |
| White on pink button `#C6A5FB` / `#ED9AE8` | 2.1 / 2.0 : 1 |
| White on active nav pill `#83B8FE` / `#5B9EFF` | 2.1 / 2.7 : 1 |

Normal text needs 4.5 : 1. Big bold text (about 19 px bold and up) needs 3 : 1. Every pair above
fails. There are three ways to fix it, and question 4 asks which you want:

- **a.** Keep the mockup's colours and accept the low contrast.
- **b.** Make the gradients darker. Colours that pass 4.5 : 1 with white text: blue `#2563EB`
  (5.2 : 1), violet `#6D5BD0` (5.2 : 1), pink `#B4479E` (4.8 : 1). They look much stronger than
  the mockup.
- **c.** Keep the pastel buttons but write the label in ink (`#0A0B12`) instead of white.

### 12.2 The muted grey is a little too light

`#7A7E88` is 3.9 : 1 on a card and 3.6 : 1 on the page. `#666A74` reaches 5.2 : 1 on a card and
looks almost the same. I'd use it unless you say otherwise.

### 12.3 The orange streak number

`#E06D2A` on the white pill is 3.2 : 1. `#C2410C` reaches 5.0 : 1. You could also make the number
bigger and bold.

### 12.4 Mistakes in the mockup itself

- **The ring shows progress at 0%.** The outer ring has a blue arc over about a quarter of it, and
  the middle ring has a lilac arc, even though every goal is 0. Arcs must show real progress. At 0,
  only the faint tracks show.
- **The ring has 2 bands but 3 goals.** The legend lists Speed, Hard and Medium, but the drawing
  has an outer blue band, a pink-lilac band, then the white centre. The app's `DailyRing` draws 3
  bands. Keep 3 (7.1).
- **Text is cut off where it would fit:** "Core SAT math p…", "Hardest proble…", "Freshly
  explaine…", "testINTCla…". Show the full text when it fits. Cut it only when it really doesn't,
  and put the full text in a tooltip.
- **The numbers are sample data** ("0/71", "0/144", "0/13", "0/3", "2026-10-10 Excused"). Real
  numbers come from the database.

---

## 13. Open questions (ASK SAAGII)

1. **Which screens does this cover?** The mockup is the center portal
   (`src/portal/CenterStudentPortal.tsx`, international students). The main student dashboard
   (`src/pages/student/StudentDashboardHome.tsx`) uses the coral theme (`--primary: 345 75% 65%`).
   Restyle both, or only the portal?
2. **The brand colours clash.** The logo, favicon and app icon made on 17 October are coral. This
   mockup has no coral at all. Keep coral for the logo only, or redo the icons to match?
3. **Center brand colour.** Each center can set its own `brand_color`, which feeds
   `--section-glow` (default `217 91% 60%`). Should the blue in this file follow each center's
   colour, or stay blue for every center?
4. **Button text** (12.1): option a, b or c?
5. **Fonts:** keep the system fonts (right on Mac and iPhone, different on Windows and Android), or
   load one web font for everyone?
6. **Dark mode:** does the student side need it?
7. **Concept videos card:** the code shows a roadmap preview under the count, and the mockup
   doesn't. Keep it or drop it?
8. **Class card:** the code lists up to 6 recent classes, and the mockup shows 1. How many?

---

## 14. What the mockup doesn't show

- Any page other than Home
- Phone and tablet
- Dark mode
- Hover, pressed, focus and disabled states
- Filled states: every number is 0, so track fills, real ring arcs and Domain mastery with data
  aren't shown
- Pop-ups: streak sheet, goal settings, ring history
- Loading and error states

---

## 15. Pop-ups, loading and empty states (added 18 October 2026)

### 15.1 Dialog scrolling

A portal-wide rule (`body.student-portal [role="dialog"][data-state] { overflow: hidden }` in
`src/index.css`) keeps dialog chrome (rounded corners, shadows) clipped. Dialogs whose content can
exceed the viewport **must** opt back into scrolling by adding `overflow-y-auto` (plus
`max-h-[90vh]`) to their `DialogContent`; the rule
`body.student-portal [role="dialog"][data-state].overflow-y-auto { overflow-y: auto }` honours
that opt-in. The streak history dialog (`StreakHistoryDialog.tsx`) is the reference: tall content
(stats, freezers, rewards, calendar) scrolls inside the rounded frame instead of being cut off.

### 15.2 Skeleton loading

Never show bare "Loading…" text in the customer student portal. While data loads, render a
skeleton that matches the shape of the content it replaces, so the page doesn't jump when data
arrives:

- Use the shared `Skeleton` (`src/components/ui/skeleton.tsx`) with sky-tinted pieces via the
  helpers in `src/portal/SkySkeleton.tsx` (`SkyCardSkeleton`, `SkyLineSkeleton`,
  `SkyListSkeleton`).
- Match layout, not detail: a card gets a card-sized skeleton with a tile circle and 2–3 lines;
  a list gets 3–5 row skeletons; a chart gets a block of the same height.
- Skeleton pieces use `rounded-2xl`/`rounded-full` and the card surface colour, pulsing — same
  corners as the real content.
- Keep the header (title, streak pill, bell) visible while the body skeletons; only the
  data-dependent area is replaced.

### 15.3 Empty and error states

- Empty states are one calm sentence in body grey (`text-sm text-muted-foreground`) inside the
  card — no red, no exclamation marks.
- Errors get a short sentence plus, where useful, a retry action; red is reserved for errors
  only (2.6).
