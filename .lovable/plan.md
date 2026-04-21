

## Plan: Animate teacher nav to left side in Practice mode

When the teacher switches to Practice mode, the bottom-center horizontal nav pill smoothly morphs into a vertical pill docked to the **left side** of the screen, freeing up the bottom area for the practice content (and avoiding overlap with the Desmos calculator when snapped right).

### Behavior

- **Default (dashboard, review, intense modes)**: nav stays as today — horizontal pill, centered at the bottom.
- **Practice mode**: nav animates to the left edge, becomes a vertical pill (icons stacked top-to-bottom), labels hidden, icon-only with tooltips on hover.
- **Switching back**: reverse animation — slides back down and expands horizontally.
- **Mobile (`<sm`)**: keep bottom-centered in all modes (left-side vertical dock would crowd small screens). Already icon-only there.

### iOS-style motion details

- Single `motion.div` (the existing pill container) animated with framer-motion's spring transition (matches the `slideTransition` already in the file: stiffness 200, damping 27).
- Animate `position` props: `bottom`, `left`, `top`, `transform`, plus `flex-direction` (row → column) and padding.
- Use `layout` prop on the motion.div so framer-motion handles the morph fluidly between the two shapes.
- Buttons keep their `rounded-full` shape; in vertical mode they become squares (h-9 w-9, icon-only). Wrap each in a Tooltip showing the label on hover so teachers don't lose discoverability.
- Subtle backdrop-blur and shadow stay the same.

### Layout safety

- When docked left, add `md:pl-20` to the main `container` wrapper only while in practice mode so content doesn't slide under the dock.
- z-50 unchanged. The Desmos calculator (z higher) still renders above and snap-right is unaffected.

### File changes

- **`src/pages/TeacherDashboard.tsx`** (only file touched)
  - Add `isPracticeMode = activeMode === "practice"` derived flag.
  - Refactor the bottom nav `motion.div` (lines 645–688) to use conditional classes + `animate` props driven by `isPracticeMode`, with a spring transition.
  - Wrap each Button in a `Tooltip` (TooltipProvider already mounted) so labels stay accessible when hidden.
  - Hide text labels when `isPracticeMode` (replace `hidden sm:inline` on labels with conditional).
  - Add conditional left padding to the container wrapper on `md+` when in practice mode.

### Technical notes

- No new dependencies (framer-motion, Tooltip, lucide already imported).
- ~40 LOC delta, single file.
- Mobile fallback preserved by gating the left-dock styles behind `md:` breakpoint.
- Testing: switch between Dashboard ↔ Practice, verify smooth morph; on mobile the nav stays at bottom; on desktop confirm Practice content isn't hidden behind the docked nav.

