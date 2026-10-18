# Landing page redo (from the "landing page" collection) + rank unlock animations

## Part A — New landing page

Follows `design-spec.md` and `plan.md` in the collection and the 13 reference screenshots: product-first layout, white page with sky bands and cloud layers, sky-blue accents with the four colour families, black pill buttons, light grey "tray" product pictures, Chillax + JetBrains Mono, calm motion. MON/ENG toggle stays (Mongolian default). SAT only — IELTS images, roles and footer line removed from this page (IELTS pages themselves untouched).

### Step 1 — Check the real numbers first
Recompute the headline stats from real data (excluding 0 scores and staff/test accounts): students with practice tests, average first → latest → best Math gain, share who gained 100+, 700+ and 800 club, Bluebook attempts, typical days/tests. Save a short results report to Files for review before numbers go live.

### Step 2 — Live stats feed
A public read-only summary that returns totals only (never names or individual scores), so the page numbers stay accurate as students practise.

### Step 3 — Sections (in order)
1. Hero — promise + looping demo built in real HTML: a question, cursor taps the answer, it turns green, "+10" floats up, predicted score climbs; brush-wipe scene change; uses the new rank art for the rank-up scene.
2. How it works — Diagnose → Plan → Practice cards.
3. Quote band — auto-advancing, anonymous "awaiting consent" placeholders.
4. Proof band — live numbers from Step 2.
5. Feature blocks, one pain point each, each with a live-looking mockup: question bank + explanations, Desmos calculator, speed mode, review mistakes with spaced repetition, analytics + SAT prediction, leaderboard ranks/streaks/badges.
6. "More features" icon carousel (concept videos, notes, live class sessions, parent sharing, attendance, Bluebook simulator).
7. Results wall — real aggregate chart (average score over time) + anonymous story cards.
8. FAQ — price, schedule, online vs in person, how to join.
9. Final call with clouds — repeated main button.
10. Footer.

Main button defaults to "Sign in" plus "Contact us" (students only get access when admins add their phone number); easy to change later. No prices, no university logos, no invented testimonials.

### Step 4 — Check
Desktop and phone (390px), reduced-motion, language switching, page title/description.

## Part B — Rank unlock animations (both student portals)

- Rank-up celebration: replace the plain icon with the new rank art. Sequence: old rank emblem shows → shakes and breaks/fades → new emblem rises in with a glow in that rank's colour → rank name + "Rank up" text → soft particle burst. Ruby gets a stronger crown-gold glow; demotion (Ruby → Diamond) gets a quiet version, no confetti.
- Rank ladder: when a rank is newly unlocked, the locked art cross-fades to the coloured art with a short shine sweep, once.
- Tap to skip, reduced-motion shows a still card, plays once per rank (not replayed on refresh).
- Customer student portal uses the same animation with sky-pastel colours.

## Technical details
- New `landing_public_stats()` security-definer function, totals only, GRANT EXECUTE to anon; sources `practice_tests.score`, `bluebook_attempts`, staff/test exclusions.
- Components under `src/components/landing/*`; `Index.tsx` rebuilt; cloud SVGs and phone images copied from Files into `src/assets/landing/`; existing `.landing-sky` scope retokened to the spec; shader background replaced by the cloud layers (marks the blocked shader task as superseded).
- framer-motion for all motion; reduced-motion respected.
- Animations: `RankAdvancementCelebration.tsx` and `TierLadder.tsx` use `TIER_ASSETS` images; seen-state keyed per student + tier in local storage.
- Update landing memory and AGENTS.md rule.
