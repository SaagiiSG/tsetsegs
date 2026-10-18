# Save the student design file and restyle the customer student portal

## Decisions (from your answers)
- The sky-blue pastel look replaces the gold look on the customer student portal. The gold rule is retired.
- Buttons keep the mockup's pastel colours with white text, accepting the lower contrast.
- The main blue stays the same for every center and ignores each center's brand colour.
- Concept videos card: no roadmap preview. Class card: only the latest class.

## Steps
1. **Save the design file** as `docs/design/student-sky.md` (your file, unchanged) and keep the mockup picture next to it as a reference. Add a short pointer at the top of `DESIGN.md`. Replace the gold memory with a "Student Sky" design memory that records the four decisions above.
2. **Page and surfaces**: pale sky page with a lilac glow in the top right; near-white frosted cards with no border, 16px corners and a soft blue shadow.
3. **Sidebar**: near-solid white card, a bigger blue letter tile, 48px-tall round nav items, a blue gradient active pill with a glow, and a thin divider above Log out.
4. **Header**: "Hey {name} 👋" in a larger size, grey subtitle, and a white streak pill with an orange flame.
5. **Today's goal ring**: Speed blue, Hard violet, Medium pink, used only in this portal so the main student dashboard keeps its colours. Plus the legend and the round settings button.
6. **Set cards** (68 Questions blue, 150 Hard violet, Updated set pink): icon tile, title and blurb, big mono count, thick track with a % circle, gradient "Continue" pill.
7. **SAT Simulation island**: lock tile, "Not unlocked yet" chip, blue "Keep practicing" pill, thick track with the "0 / 440" counter, lilac glow behind the button.
8. **Bottom row**:
   - Domain mastery: blue tile, faded bar chart when there's no data, blue bars when there is.
   - Concept videos: violet tile, count, track and a blue link.
   - Class card: orange tile, three stats, the latest class only, no divider lines.
9. **Other pages and pop-ups** in this portal inherit the same colours, corners and buttons. The phone bottom bar uses the blue active pill.
10. **Check it** in a browser at desktop and phone sizes. The main student portal, teacher pages and admin pages must stay unchanged.

## Technical details
- Swap the `customer-student-theme` / `body.customer-student-portal` gold token block in `src/index.css` for sky tokens (values from section 10 of your file), plus classes `.sky-tile-{blue,violet,pink,orange}`, `.sky-btn-{blue,violet,pink}`, `.sky-track`, `.sky-chip`, `.sky-card`. Colours live only in CSS tokens and classes, not in components.
- `DailyRing` gets an optional `colors` prop; the shared default stays as it is today.
- Files: `CenterStudentPortal.tsx`, `CenterSatUnlockIsland.tsx`, `centerContext.tsx` (an optional `CenterLogo` size and blue tile for the student shell only), `DailyRing.tsx`, `index.css`.
- Update the AGENTS.md rule on customer student appearance: still a scoped body class plus shell class, now with sky tokens.
