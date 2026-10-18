# DESIGN.md from the student dashboard screenshot

Write a detailed design spec of the student dashboard shown in the screenshot. The current DESIGN.md only covers admin, so the file gets two parts: the existing admin section stays as it is, and a new "Student portal" section is added above it. Only the document changes. No app code is touched.

## What the new section covers

1. **Overall feel**: airy, light, educational. A soft sky-blue to white canvas, frosted white cards, gradients in blue, violet and pink, and big friendly numbers.
2. **Color tokens** (HSL values estimated from the screenshot):
   - Canvas: near-white with a blue tint, plus soft corner washes of lavender and pink.
   - Card surface: white at 70–85% opacity, a 1px white border and a soft blue shadow.
   - Ink: near-black navy for headings, slate grey for secondary text.
   - Accent ramp for the cards, left to right: blue (68 Questions), indigo-violet (150 Hard), violet-pink (Updated set). Each card has a matching icon tile and button gradient.
   - Status colors: flame orange (streak), people orange (class card), "Not unlocked yet" pill (pale blue background with blue text).
   - Ring segments: Speed blue, Hard violet, Medium pink.
3. **Typography**: Chillax for headings (greeting about 40px bold with tight tracking, card titles 18px semibold), body at 14–16px, and JetBrains Mono for every number (big `0` around 40px with a smaller `/71`, chips like `0%`, dates, `0 / 440`). Label tracking is defined per size, and uppercase labels like "TODAY'S GOAL" are spelled out.
4. **Layout grid**: 300px floating sidebar card, a 24px gutter, and a header row (greeting on the left, streak pill on the right). Then three rows:
   - Row 1: goal ring card plus three set cards, equal width.
   - Row 2: full-width SAT Simulation island.
   - Row 3: Domain mastery (about 2/5), Concept videos and Class card.
   - Spacing scale: 8, 12, 16, 24, 32. Card padding is 24px.
5. **Radius scale**: cards 24px, icon tiles 16px, buttons and chips fully round (pill), progress tracks fully round, sidebar card 24px.
6. **Component specs**, each with anatomy, sizes, states and do/don't notes:
   - Sidebar: logo tile and two-line identity, a gradient-filled active Home pill with a glow, outline icon items, a divider before Log out.
   - Streak pill.
   - Today's Goal ring: three concentric tracks, a center `0%` with "today" under it, a legend with dots and mono counts, a settings icon.
   - Set card: icon tile, truncated title and subtitle, fraction readout, progress track with a round `%` chip, gradient Continue button with an arrow.
   - SAT Simulation island: lock tile, title, status pill, helper text, bold remaining count, full-width track with a mono count, Keep practicing button.
   - Domain mastery: empty state with a faded ascending bar chart.
   - Concept videos mini card: text-link call to action.
   - Class card: three stat columns plus last attendance date and status.
7. **Effects**: glass recipe (blur, bright top edge, layered blue shadow), button glow halos, decorative card washes kept below 10% opacity, the ring-pop animation, a press scale of 0.97, critically damped motion, plus fallbacks for reduced motion, reduced transparency and dark mode.
8. **Scope rules**: this applies to the main student portal. The customer student portal uses the same structure but swaps the accents for its restrained gold, following the existing prestige rule. Full-screen test pages keep the exam look.

## Technical details
- Values are documented as semantic tokens that map to existing classes in `src/index.css` (`.student-theme`, `.student-cta`, `.student-chip`, `.student-dock`). The existing admin section stays at the bottom, unchanged.
